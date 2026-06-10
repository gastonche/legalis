import { existsSync } from "node:fs";
import path from "node:path";
import {
  OpenAIProvider,
  answerWithSelfEval,
  planRetrieval,
  type EmbeddingProvider,
  type VectorStore,
} from "@legalis/core";
import { LocalVectorStore, defaultCorpusDir, resolveEmbedding } from "@legalis/ingestion";
import type { AnswerPayload, ComponentDirective, StreamEvent } from "@legalis/contracts";
import type { Provider } from "promptopus";
import { FixtureStore, HashEmbedding } from "../retrieval";

/**
 * Deep-eval providers: each wraps ONE real AI call site of Legalis with REAL
 * models, so promptopus can grade and compare them. Output format: human prose
 * followed by a `<!--gated:{json}-->` metadata block (judge graders read the
 * prose; deterministic graders read the metadata).
 */

const estimate = (s: string): number => Math.ceil(s.length / 4);

export function realLLM(model: string): OpenAIProvider {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY required for deep evals");
  return new OpenAIProvider(key, model);
}

/** Real dev retrieval (e5 + local index) when available; committed fixtures otherwise. */
export function realRetrieval(): { embedder: EmbeddingProvider; store: VectorStore; real: boolean } {
  const indexPath = path.join(defaultCorpusDir(), ".chunks", "local-index.json");
  if (existsSync(indexPath)) {
    return { embedder: resolveEmbedding().provider, store: new LocalVectorStore(indexPath), real: true };
  }
  return { embedder: new HashEmbedding(), store: new FixtureStore(), real: false };
}

const withMeta = (prose: string, meta: Record<string, unknown>): string =>
  `${prose}\n\n<!--gated:${JSON.stringify(meta)}-->`;

/** AI site 1 — the planner classification (core planRetrieval, one bounded LLM call). */
export function plannerProvider(name: string, model: string): Provider {
  const llm = realLLM(model);
  return {
    name,
    model,
    async generate(prompt: string) {
      const started = Date.now();
      const plan = await planRetrieval(prompt, [], llm);
      const text = JSON.stringify(plan);
      return { text, tokensIn: estimate(prompt), tokensOut: estimate(text), latencyMs: Date.now() - started, costUsd: 0 };
    },
  };
}

/** AI sites 2+3 — synthesis + the self-eval judge gate (answerWithSelfEval), per model. */
export function gateProvider(name: string, model: string): Provider {
  const llm = realLLM(model);
  const { embedder, store } = realRetrieval();
  return {
    name,
    model,
    async generate(prompt: string) {
      const started = Date.now();
      const r = await answerWithSelfEval(prompt, { embedder, store, llm, topK: 8, maxIterations: 2 });
      const text = withMeta(r.answer.answer, {
        answer: r.answer,
        banner: r.banner,
        verdict: r.verdict,
        iterations: r.iterations,
        retrievedSourceIds: [...new Set(r.chunks.map((c) => c.metadata.sourceId))],
      });
      return { text, tokensIn: estimate(prompt), tokensOut: estimate(text), latencyMs: Date.now() - started, costUsd: 0 };
    },
  };
}

/** AI site 4 — the LIVE orchestrator agent (the brain over SSE): decisions + final answer. */
export function orchestratorProvider(name: string, brainUrl: string): Provider {
  return {
    name,
    model: "brain-orchestrator",
    async generate(prompt: string) {
      const started = Date.now();
      const chatId = `deep-eval-${crypto.randomUUID()}`;
      const res = await fetch(`${brainUrl}/api/chat/${chatId}/stream`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: prompt }),
      });
      if (!res.ok || !res.body) throw new Error(`brain stream failed (${res.status})`);

      let askedClarification = false;
      let usedWeb = false;
      let answer: AnswerPayload | null = null;
      let bannerStatus = "";
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const frames = buf.split("\n\n");
        buf = frames.pop() ?? "";
        for (const frame of frames) {
          const line = frame.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          let ev: StreamEvent;
          try {
            ev = JSON.parse(line.slice(5).trim()) as StreamEvent;
          } catch {
            continue;
          }
          if (ev.type === "component") {
            const d: ComponentDirective = ev.directive;
            if (d.component === "region-selector" || d.component === "clarifying-question") askedClarification = true;
            if (d.component === "answer") answer = d.props;
            if (d.component === "verification-banner") bannerStatus = d.props.status;
            if (d.component === "sources" && d.props.items.some((s) => s.url?.startsWith("http") && s.sourceType === "web"))
              usedWeb = true;
          }
          if (ev.type === "trace" && ev.step === "reflect" && /[1-9]\d* web/.test(ev.detail ?? "")) usedWeb = true;
        }
      }
      const prose = answer?.answer ?? (askedClarification ? "(asked the user a clarifying question)" : "(no answer)");
      const text = withMeta(prose, {
        askedClarification,
        usedWeb,
        answer: answer ?? undefined,
        banner: { status: bannerStatus || "downgraded", message: "", checks: [] },
        retrievedSourceIds: answer?.citations.map((c) => c.sourceId) ?? [],
      });
      return { text, tokensIn: estimate(prompt), tokensOut: estimate(text), latencyMs: Date.now() - started, costUsd: 0 };
    },
  };
}
