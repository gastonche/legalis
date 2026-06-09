import { Agent } from "agents";
import { demoStream } from "@legalis/core";
import type { StreamEvent } from "@legalis/contracts";
import type { Env } from "./env";

/** Small state held on the Agent between the POST (store question) and GET (stream). */
interface AgentState {
  question: string;
  createdAt: string;
}

const SSE_HEADERS: Record<string, string> = {
  "content-type": "text/event-stream; charset=utf-8",
  "cache-control": "no-cache, no-transform",
  "x-accel-buffering": "no", // disable proxy buffering so events flush immediately
};

function encodeEvent(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * The agent runs inside a Durable Object (Cloudflare Agents SDK) so it can hold
 * multi-step state and stream over a long-running request. Milestone 1 replays a
 * scripted demo stream; the hand-rolled agent loop replaces `streamDemo` later.
 */
export class LegalisAgent extends Agent<Env, AgentState> {
  override async onRequest(request: Request): Promise<Response> {
    // Step 1 of the handshake: store the user's question on this instance.
    if (request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as { question?: string };
      this.setState({
        question: (body.question ?? "").toString(),
        createdAt: new Date().toISOString(),
      });
      return Response.json({ ok: true });
    }

    // Step 2: EventSource GET opens the SSE stream for the stored question.
    const current = this.state as AgentState | undefined;
    return this.streamDemo(current?.question ?? "");
  }

  private streamDemo(question: string): Response {
    const events = demoStream(question);
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        for (const event of events) {
          controller.enqueue(encoder.encode(encodeEvent(event)));
          // small delay so the stub visibly streams (removed once the real loop lands)
          await new Promise((resolve) => setTimeout(resolve, 140));
        }
        controller.close();
      },
    });
    return new Response(body, { headers: SSE_HEADERS });
  }
}
