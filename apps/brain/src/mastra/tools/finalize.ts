import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { currentRun } from "../runContext";
import { produceFinalAnswer } from "../produce";

/**
 * Produces the final, GROUNDED answer. The model decides WHEN to call this (after
 * gathering sources); the answer itself is produced deterministically by
 * @legalis/core (streamProse → structureAnswer → self-eval judge), so grounding
 * integrity + the grade-before-show gate stay authoritative and outside the model.
 */
export const finalizeAnswer = createTool({
  id: "finalize-answer",
  description:
    "Write the final cited answer for the user. Call this ONLY after gathering enough sources with search-corpus (and search-web if needed). Do NOT write the answer yourself — this tool produces the grounded, cited, self-checked answer from the retrieved sources.",
  inputSchema: z.object({
    summary: z.string().describe("a one-line note on what the answer covers"),
  }),
  outputSchema: z.object({ done: z.boolean(), grounded: z.boolean() }),
  execute: async () => produceFinalAnswer(currentRun()),
});
