import { registerApiRoute } from "@mastra/core/server";
import { chatHistory } from "./handlers";

/** GET /api/chat/:chatId/history — Mastra-server route for the deploy path. */
export const historyRoute = registerApiRoute("/chat/:chatId/history", {
  method: "GET",
  handler: async (c) => c.json(await chatHistory(c.req.param("chatId"))),
});
