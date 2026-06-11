import type { ModelMessage } from "ai";
import type { StreamEvent } from "@legalis/contracts";
import { orchestrator } from "../agents/orchestrator";
import { deps } from "../deps";
import { logger } from "../logger";
import { produceFinalAnswer } from "../produce";
import { type RunContext, runStore } from "../runContext";
import { RunSink } from "../stream/sink";
import { type StoredTurn, appendTurn, loadTurns, toMessages } from "../sessions";

const SSE_HEADERS: Record<string, string> = {
  "content-type": "text/event-stream; charset=utf-8",
  "cache-control": "no-cache, no-transform",
  "x-accel-buffering": "no",
  "access-control-allow-origin": "*",
};

/** Tap the sink to emit structured step/tool timings without touching the tools. */
function tapSink(sink: RunSink, log: typeof logger): void {
  const started = new Map<string, number>();
  const origPush = sink.push.bind(sink);
  sink.push = (event: StreamEvent) => {
    if (event.type === "trace") {
      if (event.phase === "start") started.set(event.step, Date.now());
      else {
        const t0 = started.get(event.step);
        log.debug(
          { step: event.step, ms: t0 ? Date.now() - t0 : undefined, status: event.status, detail: event.detail },
          "step",
        );
      }
    }
    origPush(event);
  };
}

/**
 * Run the model-driven agent for one turn and return an SSE Response of
 * StreamEvents. The orchestrator decides the steps; tools push events into the
 * sink, drained by the response body. Completed turns persist for context +
 * rehydration. Framework-agnostic so both the Hono dev host and Mastra's
 * deploy-time server route reuse it.
 */
export function streamChat(chatId: string, question: string): Response {
  const q = question.trim();
  const sink = new RunSink();
  const requestId = crypto.randomUUID().slice(0, 8);
  const log = logger.child({ requestId, chatId });
  const t0 = Date.now();
  tapSink(sink, log);

  void (async () => {
    sink.control("open");
    sink.trace("understand", "start");
    sink.narration("understand", `Let me work through “${q}” and find the Cameroon texts that control it…`);
    sink.trace("understand", "end");
    try {
      const priorTurns = await loadTurns(chatId);
      log.info({ questionChars: q.length, priorTurns: priorTurns.length }, "turn.start");
      const history = toMessages(priorTurns);
      const ctx: RunContext = {
        sink,
        deps,
        question: q,
        history,
        chunks: [],
        clarified: false,
        alreadyClarified: priorTurns.some((t) => Boolean(t.clarifier)),
      };
      const messages: ModelMessage[] = [
        ...history.map((m): ModelMessage => ({ role: m.role, content: m.content })),
        { role: "user", content: q },
      ];
      await runStore.run(ctx, async () => {
        const res = await orchestrator.stream(messages, { maxSteps: 8 });
        await res.consumeStream();
        // safety net: the model must finalize; if it didn't (and didn't clarify), do it
        if (!ctx.finalAnswer && !ctx.clarified) await produceFinalAnswer(ctx);
      });
      // Persist EVERY turn — clarifications included — so the agent remembers it
      // already asked (no re-ask loops) and a refresh rehydrates the full thread.
      if (ctx.clarified && ctx.clarifierDirective) {
        await appendTurn(chatId, {
          question: q,
          clarifier: ctx.clarifierDirective,
          createdAt: new Date().toISOString(),
        });
      } else if (ctx.finalAnswer) {
        await appendTurn(chatId, {
          question: q,
          answer: ctx.finalAnswer,
          verification: ctx.verification,
          sources: ctx.sources,
          createdAt: new Date().toISOString(),
        });
      }
      log.info(
        {
          ms: Date.now() - t0,
          outcome: ctx.clarified ? "clarified" : ctx.finalAnswer ? "answered" : "empty",
          banner: ctx.verification?.status,
          citations: ctx.finalAnswer?.citations.length ?? 0,
          regime: ctx.finalAnswer?.regime.applies,
          sourcesRetrieved: ctx.chunks.length,
        },
        "turn.end",
      );
      sink.control("done");
    } catch (e) {
      log.error({ ms: Date.now() - t0, err: e instanceof Error ? e.message : String(e) }, "turn.error");
      sink.control("error", e instanceof Error ? e.message : "agent error");
    } finally {
      sink.close();
    }
  })();

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for await (const ev of sink.drain()) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}

export async function chatHistory(chatId: string): Promise<{ turns: StoredTurn[] }> {
  return { turns: await loadTurns(chatId) };
}
