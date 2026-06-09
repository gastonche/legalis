import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { currentRun } from "../runContext";
import { TALK_TO_LAWYER } from "../stream/shared";

/**
 * The human-in-the-loop tool — the real, model-driven replacement for the old
 * static `pivotalRegionMissing` branch. The model decides to ask; this emits the
 * region-selector / clarifying-question component and ends the run (the user's
 * chip answer arrives as the next turn on the same chat, with full context).
 */
export const askClarification = createTool({
  id: "ask-clarification",
  description:
    "Ask the user ONE clarifying question and STOP — do not call any other tool after this. Use ONLY when the answer materially depends on a missing pivotal fact, especially the Anglophone (common law / customary) vs Francophone (civil law) region for matters like succession, land, marriage/family. Do NOT use for matters governed uniformly nationwide (OHADA business law, national statutes, tax, most labour/criminal).",
  inputSchema: z.object({
    kind: z.enum(["region", "other"]).default("region"),
    question: z.string().describe("the question to put to the user"),
    options: z
      .array(z.object({ id: z.string(), label: z.string() }))
      .default([])
      .describe("answer choices the user can tap"),
  }),
  outputSchema: z.object({ asked: z.boolean() }),
  execute: async ({ kind, question, options }) => {
    const run = currentRun();
    const opts = options ?? [];
    run.sink.narration("plan", "This turns on a missing detail, so I'll ask before answering rather than guess.");
    if (kind === "region") {
      run.sink.component({
        component: "region-selector",
        props: {
          reason: question,
          regions:
            opts.length >= 2
              ? opts
              : [
                  { id: "anglophone", label: "Anglophone (NW / SW)" },
                  { id: "francophone", label: "Francophone" },
                ],
        },
      });
    } else {
      run.sink.component({
        component: "clarifying-question",
        props: {
          question,
          kind: "domain",
          options: opts.length >= 2 ? opts : [{ id: "yes", label: "Yes" }, { id: "no", label: "No" }],
        },
      });
    }
    run.sink.component(TALK_TO_LAWYER);
    run.clarified = true;
    return { asked: true };
  },
});
