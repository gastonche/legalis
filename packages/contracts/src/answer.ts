import { z } from "zod";
import { Authority, Confidence, Language, Regime } from "./common";

/**
 * Every legal proposition must carry a citation pointing to a specific retrieved
 * source + locator (article/section/case). The citation-validation layer rejects
 * any marker whose locator is not present in the retrieved set.
 */
export const Citation = z.object({
  marker: z.string(), // inline marker, e.g. "[1]"
  sourceId: z.string(), // matches a RetrievedChunk.metadata.sourceId
  sourceTitle: z.string(),
  locator: z.string(), // article/section/case ref within the source
  quote: z.string(), // supporting snippet drawn from the retrieved text
  url: z.string().optional(),
  authority: Authority,
  language: Language,
});
export type Citation = z.infer<typeof Citation>;

/** Which regime governs, why, and whether OHADA supersedes national law here. */
export const RegimeAssessment = z.object({
  applies: Regime,
  rationale: z.string(),
  ohadaSupersedes: z.boolean().optional(),
});
export type RegimeAssessment = z.infer<typeof RegimeAssessment>;

export const AnswerPayload = z.object({
  answer: z.string(), // plain-language markdown
  citations: z.array(Citation),
  regime: RegimeAssessment,
  confidence: Confidence,
  scopeNote: z.string(), // contextual "legal information, not advice → consult a Cameroonian lawyer"
  language: Language,
});
export type AnswerPayload = z.infer<typeof AnswerPayload>;
