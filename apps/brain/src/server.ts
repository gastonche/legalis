import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { chatHistory, streamChat } from "./mastra/routes/handlers";
import { loadTurns } from "./mastra/sessions";

/**
 * Host for the Mastra brain: a thin Hono server (run under tsx, which resolves
 * the workspace's raw-TS imports) that exposes the agent over SSE. When
 * BRAIN_TOKEN is set (any public exposure, e.g. via a Cloudflare Tunnel), every
 * /api/chat request must carry it as a bearer token — only the edge proxy knows it.
 */
const app = new Hono();
app.use("/api/*", cors());

const TOKEN = process.env.BRAIN_TOKEN;
/** Cost ceiling: one conversation can't run the model forever. */
const MAX_TURNS_PER_CHAT = Number(process.env.MAX_TURNS_PER_CHAT ?? 20);

app.use("/api/chat/*", async (c, next) => {
  if (TOKEN && c.req.header("authorization") !== `Bearer ${TOKEN}`) {
    return c.json({ error: "unauthorized" }, 401);
  }
  await next();
});

app.get("/api/health", (c) => c.json({ ok: true, service: "legalis-brain" }));

app.post("/api/chat/:chatId/stream", async (c) => {
  const chatId = c.req.param("chatId");
  const { question } = (await c.req.json().catch(() => ({}))) as { question?: string };
  const q = (question ?? "").toString();
  if (!q.trim()) return c.json({ error: "question required" }, 400);
  if (q.length > 2000) return c.json({ error: "question too long" }, 413);
  if ((await loadTurns(chatId)).length >= MAX_TURNS_PER_CHAT) {
    return c.json({ error: "this conversation has reached its limit — start a new chat" }, 429);
  }
  return streamChat(chatId, q);
});

app.get("/api/chat/:chatId/history", async (c) => c.json(await chatHistory(c.req.param("chatId"))));

const port = Number(process.env.BRAIN_PORT ?? 4111);
serve({ fetch: app.fetch, port }, (info) =>
  console.log(`legalis brain → http://127.0.0.1:${info.port}${TOKEN ? " (bearer-auth on)" : ""}`),
);
