import { Hono } from "hono";
import { cors } from "hono/cors";
import { getAgentByName } from "agents";
import { LegalisAgent } from "./agent";
import type { Env } from "./env";

// The DO class must be exported from the Worker entry so the runtime registers it.
export { LegalisAgent };

const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", cors());

app.get("/api/health", (c) =>
  c.json({ ok: true, service: "legalis-agent", milestone: 1 }),
);

/**
 * SSE handshake, step 1: create a session and store the question on a fresh
 * Agent instance keyed by sessionId.
 */
app.post("/api/sessions", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { question?: string };
  const question = (body.question ?? "").toString();
  const sessionId = crypto.randomUUID();
  const agent = await getAgentByName(c.env.AGENT, sessionId);
  await agent.fetch(
    new Request("https://agent/store", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question }),
    }),
  );
  return c.json({ sessionId });
});

/**
 * M3: single-step grounded answer (non-streamed). Retrieves from Vectorize and
 * synthesizes a cited, regime-aware AnswerPayload via the frontier model.
 */
app.post("/api/ask-sync", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { question?: string };
  const agent = await getAgentByName(c.env.AGENT, crypto.randomUUID());
  const res = await agent.fetch(
    new Request("https://agent/answer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: body.question ?? "" }),
    }),
  );
  return new Response(res.body, {
    status: res.status,
    headers: { "content-type": "application/json" },
  });
});

/**
 * Step 2: the browser's EventSource opens this GET; we hand back the Agent's
 * long-lived text/event-stream for that session.
 */
app.get("/api/stream/:id", async (c) => {
  const id = c.req.param("id");
  const agent = await getAgentByName(c.env.AGENT, id);
  return agent.fetch(new Request("https://agent/stream", { method: "GET" }));
});

export default app;
