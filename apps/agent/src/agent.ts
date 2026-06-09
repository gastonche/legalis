import { Agent } from "agents";
import {
  OpenAIProvider,
  TavilySearch,
  answerWithSelfEval,
  runAgent,
  type AgentDeps,
  type ChatMessage,
  type GatedResult,
} from "@legalis/core";
import type { StreamEvent } from "@legalis/contracts";
import {
  HttpEmbedding,
  HttpVectorStore,
  VectorizeStore,
  WorkersAiEmbedding,
} from "./adapters";
import type { Env } from "./env";

interface AgentState {
  question: string;
  history: ChatMessage[];
  createdAt: string;
}

const SSE_HEADERS: Record<string, string> = {
  "content-type": "text/event-stream; charset=utf-8",
  "cache-control": "no-cache, no-transform",
  "x-accel-buffering": "no",
};

function encodeEvent(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * The agent runs inside a Durable Object (Cloudflare Agents SDK). It holds the
 * question between the two-step SSE handshake and runs the hand-rolled agent loop
 * (retrieve → synthesize → self-eval), streaming StreamEvents over SSE.
 */
export class LegalisAgent extends Agent<Env, AgentState> {
  /** Choose the retrieval backend: local dev bridge if configured, else CF bindings. */
  private deps(): AgentDeps {
    const env = this.env;
    const llm = new OpenAIProvider(env.OPENAI_API_KEY, env.OPENAI_MODEL);
    const search = env.TAVILY_API_KEY ? new TavilySearch(env.TAVILY_API_KEY) : undefined;
    if (env.DEV_RETRIEVAL_URL) {
      return {
        embedder: new HttpEmbedding(env.DEV_RETRIEVAL_URL),
        store: new HttpVectorStore(env.DEV_RETRIEVAL_URL),
        llm,
        search,
        topK: 8,
      };
    }
    if (env.AI && env.VECTORIZE) {
      return {
        embedder: new WorkersAiEmbedding(env.AI),
        store: new VectorizeStore(env.VECTORIZE),
        llm,
        search,
        topK: 8,
      };
    }
    throw new Error("No retrieval backend: set DEV_RETRIEVAL_URL or the AI + VECTORIZE bindings.");
  }

  override async onRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Non-streamed grounded + self-eval answer (M3/M4).
    if (request.method === "POST" && url.pathname.endsWith("/answer")) {
      const body = (await request.json().catch(() => ({}))) as { question?: string };
      const result = await this.answer((body.question ?? "").toString());
      return Response.json(result);
    }

    // Handshake step 1: store the question (+ conversation history) for the streaming GET.
    if (request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as {
        question?: string;
        history?: ChatMessage[];
      };
      this.setState({
        question: (body.question ?? "").toString(),
        history: Array.isArray(body.history) ? body.history : [],
        createdAt: new Date().toISOString(),
      });
      return Response.json({ ok: true });
    }

    // Handshake step 2: EventSource GET → stream the live agent run.
    const current = this.state as AgentState | undefined;
    return this.streamAnswer(current?.question ?? "", current?.history ?? []);
  }

  /** Non-streamed answer with the full gate (incl. bounded revise/re-retrieve). */
  private answer(question: string): Promise<GatedResult> {
    return answerWithSelfEval(question, { ...this.deps(), maxIterations: 2 });
  }

  /** Stream the live agent run as SSE. */
  private streamAnswer(question: string, history: ChatMessage[]): Response {
    const deps = this.deps();
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of runAgent(question, deps, history)) {
            controller.enqueue(encoder.encode(encodeEvent(event)));
          }
        } catch (e) {
          controller.enqueue(
            encoder.encode(
              encodeEvent({
                type: "control",
                phase: "error",
                error: e instanceof Error ? e.message : "stream error",
              }),
            ),
          );
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, { headers: SSE_HEADERS });
  }
}
