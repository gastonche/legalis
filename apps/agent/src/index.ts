import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./env";

/**
 * Edge proxy: the Cloudflare Worker forwards conversation requests to the Mastra
 * "brain" service (which runs the model-driven agent loop + holds sessions) and
 * pipes its SSE / JSON straight back. Keeps the StreamEvent wire contract intact.
 */
const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", cors());

app.get("/api/health", (c) => c.json({ ok: true, service: "legalis-proxy" }));

// Model-driven agent stream (SSE passthrough).
app.post("/api/chat/:chatId/stream", async (c) => {
  const chatId = c.req.param("chatId");
  const upstream = await fetch(`${c.env.BRAIN_URL}/api/chat/${encodeURIComponent(chatId)}/stream`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: await c.req.text(),
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
});

// Persisted conversation history for rehydration (JSON passthrough).
app.get("/api/chat/:chatId/history", async (c) => {
  const chatId = c.req.param("chatId");
  const upstream = await fetch(`${c.env.BRAIN_URL}/api/chat/${encodeURIComponent(chatId)}/history`);
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "content-type": "application/json" },
  });
});

export default app;
