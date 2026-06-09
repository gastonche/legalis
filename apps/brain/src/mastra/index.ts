import { Mastra } from "@mastra/core";
import { registerApiRoute } from "@mastra/core/server";
import { orchestrator } from "./agents/orchestrator";
import { plannerAgent } from "./agents/planner";
import { streamRoute } from "./routes/stream";
import { historyRoute } from "./routes/history";

/**
 * Legalis "brain" — the Mastra service. The orchestrator + planner sub-agent run
 * the model-driven tool loop; custom routes expose the SSE stream + chat history
 * to the Cloudflare Worker proxy.
 */
export const mastra = new Mastra({
  agents: { orchestrator, planner: plannerAgent },
  server: {
    port: Number(process.env.BRAIN_PORT ?? 4111),
    apiRoutes: [
      registerApiRoute("/health", { method: "GET", handler: (c) => c.json({ ok: true, service: "legalis-brain" }) }),
      streamRoute,
      historyRoute,
    ],
  },
});
