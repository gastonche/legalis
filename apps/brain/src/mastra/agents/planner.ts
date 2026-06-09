import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { currentRun } from "../runContext";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

/** A real sub-agent: classifies the question to guide the orchestrator's retrieval. */
export const plannerAgent = new Agent({
  id: "legalis-planner",
  name: "Retrieval Planner",
  instructions: `You are the planning sub-agent for a Cameroon-law research assistant. Given a question (and any prior conversation), give a SHORT analysis to guide retrieval:
- legal domain (labour / business-OHADA / family / criminal / tax / land / constitutional / general)
- likely regime (common-law / civil-law / OHADA / mixed / unclear)
- whether it needs CURRENT or procedural info beyond a static corpus of primary legal texts (→ web search)
- whether the answer materially depends on the Anglophone (common law) vs Francophone (civil law) region the user has NOT specified (pivotal for succession, land, marriage/family; NOT for OHADA/national-statute/tax).
Answer in 2-4 sentences. Do not answer the legal question itself.`,
  model: openai(MODEL),
});

/** Expose the planner sub-agent to the orchestrator as a tool (agents-as-tools). */
export const consultPlanner = createTool({
  id: "consult-planner",
  description:
    "Consult the planning sub-agent to classify the question (domain, regime, whether web search or a region clarification is needed) before retrieving. Recommended for ambiguous questions.",
  inputSchema: z.object({ question: z.string() }),
  outputSchema: z.object({ analysis: z.string() }),
  execute: async ({ question }) => {
    const run = currentRun();
    run.sink.trace("plan", "start");
    run.sink.narration("plan", "Consulting the planner on the area of law and where to look…");
    let analysis = "";
    try {
      const res = await plannerAgent.generate([{ role: "user", content: question }]);
      analysis = res.text ?? "";
    } catch {
      analysis = "";
    }
    run.sink.trace("plan", "end", "ok", analysis ? analysis.slice(0, 60) : undefined);
    return { analysis };
  },
});
