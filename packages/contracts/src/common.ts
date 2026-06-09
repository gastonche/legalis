import { z } from "zod";

/** Source/answer language. The corpus and web sources are bilingual (FR authoritative for OHADA). */
export const Language = z.enum(["en", "fr"]);
export type Language = z.infer<typeof Language>;

/** Primary authority (statute/OHADA/case/constitution) is preferred over secondary (guides). */
export const Authority = z.enum(["primary", "secondary"]);
export type Authority = z.infer<typeof Authority>;

export const SourceType = z.enum([
  "constitution",
  "statute",
  "ohada",
  "case",
  "gazette",
  "guide",
  "web",
]);
export type SourceType = z.infer<typeof SourceType>;

/** Which legal regime governs the answer. Bijural: common law (Anglophone) vs civil law (Francophone); OHADA supersedes on business matters. */
export const Regime = z.enum(["common-law", "civil-law", "ohada", "mixed", "unclear"]);
export type Regime = z.infer<typeof Regime>;

/** Per-chunk jurisdiction tag used for retrieval filtering and regime classification. */
export const LegalDistrict = z.enum([
  "anglophone",
  "francophone",
  "national",
  "ohada",
  "unclear",
]);
export type LegalDistrict = z.infer<typeof LegalDistrict>;

export const Confidence = z.enum(["high", "medium", "low"]);
export type Confidence = z.infer<typeof Confidence>;

/** The hand-rolled agent loop steps. Every step emits a trace event. */
export const StepName = z.enum([
  "understand",
  "plan",
  "retrieve",
  "reflect",
  "synthesize",
  "self-eval",
]);
export type StepName = z.infer<typeof StepName>;
