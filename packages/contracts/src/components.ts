import { z } from "zod";
import { Authority, Language, SourceType } from "./common";
import { AnswerPayload } from "./answer";

/**
 * Fixed, typed registry of adaptive UI components. The agent emits a
 * zod-validated `{ component, props }` directive chosen from THIS set — it never
 * emits raw HTML. The SPA maps each directive to a real React component.
 */

/** Disambiguate region/domain/language with chips — never free text. */
export const ClarifyingQuestionProps = z.object({
  question: z.string(),
  kind: z.enum(["region", "domain", "language"]),
  options: z
    .array(z.object({ id: z.string(), label: z.string(), hint: z.string().optional() }))
    .min(2),
});
export type ClarifyingQuestionProps = z.infer<typeof ClarifyingQuestionProps>;

/** Shown when jurisdiction is pivotal to the answer. */
export const RegionSelectorProps = z.object({
  reason: z.string(),
  regions: z.array(z.object({ id: z.string(), label: z.string() })).min(2),
});
export type RegionSelectorProps = z.infer<typeof RegionSelectorProps>;

export const SourceItem = z.object({
  id: z.string(),
  title: z.string(),
  authority: Authority,
  sourceType: SourceType,
  language: Language,
  url: z.string().optional(),
  locator: z.string().optional(),
});
export type SourceItem = z.infer<typeof SourceItem>;

export const SourcesProps = z.object({ items: z.array(SourceItem) });
export type SourcesProps = z.infer<typeof SourcesProps>;

/** Calm banner reflecting the self-eval gate outcome (not raw internals). */
export const VerificationBannerProps = z.object({
  status: z.enum(["verified", "partial", "downgraded"]),
  message: z.string(),
  checks: z.array(z.object({ name: z.string(), passed: z.boolean() })),
});
export type VerificationBannerProps = z.infer<typeof VerificationBannerProps>;

/** Persistent scope boundary recommending a qualified Cameroonian lawyer. */
export const TalkToLawyerProps = z.object({
  message: z.string(),
  jurisdictionNote: z.string().optional(),
});
export type TalkToLawyerProps = z.infer<typeof TalkToLawyerProps>;

/** The citation-linked answer card carries the full AnswerPayload. */
export const AnswerCardProps = AnswerPayload;
export type AnswerCardProps = z.infer<typeof AnswerCardProps>;

export const ComponentDirective = z.discriminatedUnion("component", [
  z.object({ component: z.literal("clarifying-question"), props: ClarifyingQuestionProps }),
  z.object({ component: z.literal("region-selector"), props: RegionSelectorProps }),
  z.object({ component: z.literal("sources"), props: SourcesProps }),
  z.object({ component: z.literal("answer"), props: AnswerCardProps }),
  z.object({ component: z.literal("verification-banner"), props: VerificationBannerProps }),
  z.object({ component: z.literal("talk-to-a-lawyer"), props: TalkToLawyerProps }),
]);
export type ComponentDirective = z.infer<typeof ComponentDirective>;
export type ComponentName = ComponentDirective["component"];
