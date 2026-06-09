import { z } from "zod";

/**
 * Structured verdict from the inline self-evaluation gate (frontier model as judge),
 * run AFTER synthesis and BEFORE display. Grades the draft on groundedness, citation
 * validity, jurisdiction correctness, and uncertainty honesty, then routes the gate.
 */
export const SelfEvalVerdict = z.object({
  groundedness: z.object({
    score: z.number().min(0).max(1),
    pass: z.boolean(),
    notes: z.string(),
  }),
  citationValidity: z.object({
    pass: z.boolean(),
    // markers whose cited locator is absent from the retrieved set or unsupported by it
    invalid: z.array(z.object({ marker: z.string(), reason: z.string() })),
  }),
  jurisdictionCorrect: z.object({ pass: z.boolean(), notes: z.string() }),
  uncertaintyHonest: z.object({ pass: z.boolean(), notes: z.string() }),
  overall: z.enum(["pass", "revise", "downgrade"]),
  // what the gate should do next (bounded by the iteration cap)
  action: z.enum(["show", "re-retrieve", "revise", "downgrade"]),
  iteration: z.number().int().min(0),
});
export type SelfEvalVerdict = z.infer<typeof SelfEvalVerdict>;
