import { registerApiRoute } from "@mastra/core/server";
import { streamChat } from "./handlers";

/** POST /api/chat/:chatId/stream — Mastra-server route for the deploy path. */
export const streamRoute = registerApiRoute("/chat/:chatId/stream", {
  method: "POST",
  handler: async (c) => {
    const { question } = (await c.req.json().catch(() => ({}))) as { question?: string };
    const q = (question ?? "").toString();
    if (!q.trim()) return c.json({ error: "question required" }, 400);
    return streamChat(c.req.param("chatId"), q);
  },
});
