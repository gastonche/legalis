import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { chatHistory, streamChat } from "./mastra/routes/handlers";

/**
 * Dev host for the Mastra brain: a thin Hono server (run under tsx, which resolves
 * the workspace's raw-TS imports) that exposes the agent over SSE. The Mastra
 * agents/tools/sub-agent do the work; this only hosts them. (Deploy uses Mastra's
 * own server via src/mastra/index.ts + the CloudflareDeployer.)
 */
const app = new Hono();
app.use("/api/*", cors());

app.get("/api/health", (c) => c.json({ ok: true, service: "legalis-brain" }));

app.post("/api/chat/:chatId/stream", async (c) => {
  const { question } = (await c.req.json().catch(() => ({}))) as { question?: string };
  const q = (question ?? "").toString();
  if (!q.trim()) return c.json({ error: "question required" }, 400);
  return streamChat(c.req.param("chatId"), q);
});

app.get("/api/chat/:chatId/history", async (c) => c.json(await chatHistory(c.req.param("chatId"))));

const port = Number(process.env.BRAIN_PORT ?? 4111);
serve({ fetch: app.fetch, port }, (info) => console.log(`legalis brain → http://127.0.0.1:${info.port}`));
