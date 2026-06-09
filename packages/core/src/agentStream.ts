import type {
  AnswerPayload,
  ComponentDirective,
  RetrievedChunk,
  SourceItem,
  StreamEvent,
} from "@legalis/contracts";
import type { EmbeddingProvider, LLMProvider, SearchProvider, VectorStore } from "./ports";
import { streamProse, structureAnswer } from "./synthesize";
import { judgeAnswer, verdictPasses } from "./judge";
import { buildBanner, downgradeAnswer, downgradeVerdict, refusal } from "./pipeline";
import { planRetrieval } from "./plan";
import { retrieveFused } from "./retrieve";

export interface AgentDeps {
  embedder: EmbeddingProvider;
  store: VectorStore;
  llm: LLMProvider;
  /** Optional allowlist-biased web search (Tavily). When absent, corpus-only. */
  search?: SearchProvider;
  topK?: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const TALK_TO_LAWYER: ComponentDirective = {
  component: "talk-to-a-lawyer",
  props: {
    message:
      "For your specific situation — especially anything time-sensitive — a qualified Cameroonian lawyer can confirm how this applies to you.",
    jurisdictionNote:
      "Where the answer turns on your region (Anglophone common law vs Francophone civil law), confirm which rules apply to you.",
  },
};

/** De-duplicate retrieved chunks by document for the sources card. */
function sourcesComponent(chunks: RetrievedChunk[]): ComponentDirective {
  const seen = new Set<string>();
  const items: SourceItem[] = [];
  for (const c of chunks) {
    if (seen.has(c.metadata.sourceId)) continue;
    seen.add(c.metadata.sourceId);
    items.push({
      id: c.id,
      title: c.metadata.title,
      authority: c.metadata.authority,
      sourceType: c.metadata.sourceType,
      language: c.metadata.language,
      ...(c.metadata.url ? { url: c.metadata.url } : {}),
      ...(c.metadata.articleSection ? { locator: c.metadata.articleSection } : {}),
    });
    if (items.length >= 6) break;
  }
  return { component: "sources", props: { items } };
}

function* replayTokens(text: string): Generator<StreamEvent> {
  for (const token of text.match(/\S+\s*/g) ?? [text]) {
    yield { type: "answer-token", token };
  }
}

/**
 * The hand-rolled agent loop, streamed as StreamEvents: understand → retrieve →
 * synthesize (live prose tokens) → self-eval gate → adaptive components. Each
 * step emits trace + narration; the Durable Object writes these out over SSE.
 * (Single-pass gate here; the bounded revise/re-retrieve loop is on the sync
 * endpoint and extends to streamed re-search in M6.)
 */
export async function* runAgent(
  question: string,
  deps: AgentDeps,
  history: ChatMessage[] = [],
): AsyncIterable<StreamEvent> {
  const q = question.trim();
  const recent = history.slice(-4);
  const context = recent
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");
  yield { type: "control", phase: "open" };

  // 1. understand
  yield { type: "trace", step: "understand", phase: "start", status: "ok" };
  yield {
    type: "narration",
    step: "understand",
    text: `Let me work through “${q}” and find the Cameroon texts that control it…`,
  };
  yield { type: "trace", step: "understand", phase: "end", status: "ok" };

  // 2. plan — classify the question + decide where to look (corpus / web / both)
  yield { type: "trace", step: "plan", phase: "start", status: "ok" };
  yield {
    type: "narration",
    step: "plan",
    text: "Working out the area of law and where to look — the corpus, and official web sources if needed…",
  };
  const plan = await planRetrieval(q, recent, deps.llm);
  yield {
    type: "trace",
    step: "plan",
    phase: "end",
    status: "ok",
    detail: `${plan.domain} · ${plan.regimeHint}${plan.needsWeb ? " · web" : ""}`,
  };

  // 2b. if the region is pivotal and unknown, ask instead of guessing
  if (plan.pivotalRegionMissing) {
    yield {
      type: "narration",
      step: "plan",
      text: "This turns on your region, so I'll check before answering rather than guess.",
    };
    yield {
      type: "component",
      directive: {
        component: "region-selector",
        props: {
          reason:
            "The answer differs between the Anglophone (North-West / South-West, common law) and Francophone (civil law) regions. Which applies to your situation?",
          regions: [
            { id: "anglophone", label: "Anglophone (NW / SW)" },
            { id: "francophone", label: "Francophone" },
          ],
        },
      },
    };
    yield { type: "component", directive: TALK_TO_LAWYER };
    yield { type: "control", phase: "done" };
    return;
  }

  // 3. retrieve — corpus fused with allowlist-biased web search
  const usingWeb = Boolean(deps.search) && plan.needsWeb;
  yield { type: "trace", step: "retrieve", phase: "start", status: "ok" };
  yield {
    type: "narration",
    step: "retrieve",
    text: usingWeb
      ? "Searching the Cameroon corpus and official web sources for the governing provisions…"
      : "Searching the Cameroon corpus for the governing provisions…",
  };
  let fused = await retrieveFused(q, deps, plan);
  let chunks: RetrievedChunk[] = fused.chunks;
  yield {
    type: "trace",
    step: "retrieve",
    phase: "end",
    status: chunks.length ? "ok" : "warn",
    detail: `${fused.corpusCount} corpus + ${fused.webCount} web`,
  };

  // 3b. reflect — if the corpus came back thin and we haven't searched the web, widen
  if (chunks.length < 3 && deps.search && !plan.needsWeb) {
    yield { type: "trace", step: "reflect", phase: "start", status: "warn" };
    yield {
      type: "narration",
      step: "reflect",
      text: "Thin results from the corpus — widening the search to official web sources…",
    };
    fused = await retrieveFused(q, deps, { ...plan, needsWeb: true });
    chunks = fused.chunks;
    yield {
      type: "trace",
      step: "reflect",
      phase: "end",
      status: chunks.length ? "ok" : "warn",
      detail: `+${fused.webCount} web → ${chunks.length} total`,
    };
  }

  if (chunks.length === 0) {
    const a = refusal(q, "No relevant sources were found in the corpus.");
    yield {
      type: "narration",
      step: "synthesize",
      text: "I couldn't find grounded sources for this, so I won't guess.",
    };
    yield* replayTokens(a.answer);
    yield { type: "component", directive: { component: "verification-banner", props: buildBanner(downgradeVerdict("no sources"), a) } };
    yield { type: "component", directive: { component: "answer", props: a } };
    yield { type: "component", directive: TALK_TO_LAWYER };
    yield { type: "control", phase: "done" };
    return;
  }
  yield { type: "component", directive: sourcesComponent(chunks) };

  // 3. synthesize — stream the prose live
  yield { type: "trace", step: "synthesize", phase: "start", status: "ok" };
  yield {
    type: "narration",
    step: "synthesize",
    text: "Drafting a plain-language answer, with each point tied to a source…",
  };
  let prose = "";
  try {
    for await (const tok of streamProse(q, chunks, deps.llm, context)) {
      prose += tok;
      yield { type: "answer-token", token: tok };
    }
  } catch {
    /* keep whatever streamed */
  }
  yield { type: "trace", step: "synthesize", phase: "end", status: prose ? "ok" : "warn" };

  // structure the streamed prose into a validated AnswerPayload
  let answer: AnswerPayload;
  let grounded = false;
  try {
    const r = await structureAnswer(q, prose || "(no draft produced)", chunks, deps.llm);
    answer = r.answer;
    grounded = answer.citations.length > 0;
  } catch {
    answer = { ...refusal(q, "I couldn't structure the draft."), answer: prose || refusal(q, "").answer };
  }

  // 4. self-eval gate
  yield { type: "trace", step: "self-eval", phase: "start", status: "ok" };
  yield {
    type: "narration",
    step: "self-eval",
    text: "Before I show this, let me check it's grounded and the regime is right…",
  };
  const verdict = grounded
    ? await judgeAnswer(q, answer, chunks, deps.llm)
    : downgradeVerdict("ungrounded draft");
  const passed = grounded && verdictPasses(verdict);
  const finalAnswer = passed ? answer : grounded ? downgradeAnswer(answer) : answer;
  const banner = buildBanner({ ...verdict, action: passed ? "show" : "downgrade" }, finalAnswer);
  yield {
    type: "trace",
    step: "self-eval",
    phase: "end",
    status: passed ? "ok" : "warn",
    detail: `groundedness=${verdict.groundedness.score}`,
  };

  yield { type: "component", directive: { component: "verification-banner", props: banner } };
  yield { type: "component", directive: { component: "answer", props: finalAnswer } };
  yield { type: "component", directive: TALK_TO_LAWYER };
  yield { type: "control", phase: "done" };
}
