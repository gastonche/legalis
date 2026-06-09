import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { ComponentDirective } from "@legalis/contracts";
import { currentRun } from "../runContext";
import { TALK_TO_LAWYER } from "../stream/shared";

// Unambiguous region signals: NW/SW towns + region names → Anglophone; major
// Francophone towns + explicit labels → Francophone. (Bare "west" is excluded —
// it collides with "north-west".)
const ANGLOPHONE =
  /\b(bamenda|buea|limbe|kumba|kumbo|mamfe|wum|tiko|bali|nkambe|ndop|fundong|north[ -]?west|south[ -]?west|anglophone|common[ -]law)\b/i;
const FRANCOPHONE =
  /\b(douala|yaound[ée]|bafoussam|garoua|maroua|ngaound[ée]r[ée]|bertoua|ebolowa|kribi|ed[ée]a|dschang|foumban|bafang|nkongsamba|francophone|civil[ -]law)\b/i;

function inferRegion(text: string): string | null {
  if (ANGLOPHONE.test(text)) return "Anglophone (North-West / South-West, common law)";
  if (FRANCOPHONE.test(text)) return "Francophone (civil law)";
  return null;
}

/**
 * The human-in-the-loop tool — the model decides to ask; this emits the
 * region-selector / clarifying-question component and ends the run (the user's
 * answer arrives as the next turn on the same chat, with full context). Refuses
 * to re-ask if this chat already asked a clarification — the model must then
 * infer from context and proceed.
 */
export const askClarification = createTool({
  id: "ask-clarification",
  description:
    "Ask the user ONE clarifying question and STOP — do not call any other tool after this (unless it returns asked:false). Use ONLY when the answer materially depends on a missing pivotal fact, especially the Anglophone (common law / customary) vs Francophone (civil law) region for succession, land, or family matters. NEVER call this when the question names ANY Cameroonian town or region — INFER the regime instead (Bamenda, Buea, Limbe, Kumba, Kumbo, Mamfe, North-West, South-West → Anglophone common law; Douala, Yaoundé, Bafoussam, Garoua, Maroua, Ngaoundéré, Bertoua, Ebolowa, Kribi, or any other region → Francophone civil law). NEVER call this when a prior message in the conversation already asked or answered it. Do NOT use for OHADA, national statutes, tax, or matters applying uniformly nationwide. If it returns asked:false, the user was already asked earlier — infer the most likely answer from the conversation and continue to finalize-answer.",
  inputSchema: z.object({
    kind: z.enum(["region", "other"]).default("region"),
    question: z.string().describe("the question to put to the user"),
    options: z
      .array(z.object({ id: z.string(), label: z.string() }))
      .default([])
      .describe("answer choices the user can tap"),
  }),
  outputSchema: z.object({ asked: z.boolean(), note: z.string().optional() }),
  execute: async ({ kind, question, options }) => {
    const run = currentRun();
    // Guards: the model decides to ask, but the tool refuses clearly-wrong asks
    // (region already evident, or already asked once) with actionable feedback.
    const conversation = `${run.history.map((m) => m.content).join(" ")} ${run.question}`;
    if (kind === "region") {
      const inferred = inferRegion(conversation);
      if (inferred) {
        return {
          asked: false,
          note: `Do not ask — the conversation already indicates the ${inferred} region. Use it and call finalize-answer now.`,
        };
      }
    }
    if (run.alreadyClarified || run.clarified) {
      return {
        asked: false,
        note: "Do not ask — a clarification was already asked in this conversation. Infer the answer from the user's reply and call finalize-answer now.",
      };
    }

    const opts = options ?? [];
    run.sink.narration("plan", "This turns on a missing detail, so I'll ask before answering rather than guess.");
    let directive: ComponentDirective;
    if (kind === "region") {
      directive = {
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
      };
    } else {
      directive = {
        component: "clarifying-question",
        props: {
          question,
          kind: "domain",
          options: opts.length >= 2 ? opts : [{ id: "yes", label: "Yes" }, { id: "no", label: "No" }],
        },
      };
    }
    run.sink.component(directive);
    run.sink.component(TALK_TO_LAWYER);
    run.clarified = true;
    run.clarifierDirective = directive;
    return { asked: true };
  },
});
