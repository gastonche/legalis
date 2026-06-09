import { SelfEvalVerdict, type AnswerPayload, type RetrievedChunk } from "@legalis/contracts";
import type { LLMProvider } from "./ports";
import { formatSources, stripFences } from "./synthesize";

/**
 * The inline self-evaluation judge (frontier model). Runs AFTER synthesis and
 * BEFORE display, grading the draft against the retrieved sources on groundedness,
 * citation validity, jurisdiction correctness, and uncertainty honesty.
 */
export const JUDGE_SYSTEM = `You are a STRICT auditor of a Cameroon-law assistant's draft answer. You are given a QUESTION, a DRAFT ANSWER (with [n] citation markers and a stated regime/confidence), and the exact SOURCES that were retrieved. Grade the draft ONLY against these sources. Be skeptical and specific; assume nothing the sources don't say.

Grade four dimensions:
1. groundedness — is EVERY legal claim supported by the cited sources? score 0..1; pass only if >= 0.75 AND there are no ungrounded legal claims.
2. citationValidity — does each [n] marker point to a source that actually supports the specific claim it is attached to? List any markers that are wrong or unsupported, with a short reason.
3. jurisdictionCorrect — is the stated regime (common-law / civil-law / OHADA / mixed / unclear) correct for this question, and are OHADA supersession and any Anglophone-vs-Francophone divergence handled correctly? pass/fail + notes.
4. uncertaintyHonest — does the answer honestly flag what it does not know and avoid overclaiming? pass/fail + notes.

Then choose overall:
- "pass" — all four pass.
- "revise" — fixable from the SAME sources (e.g. overclaims, a weak/mismatched citation, wrong regime label).
- "downgrade" — the sources simply do not support a confident answer.

Output a SINGLE JSON object (no prose outside JSON) matching EXACTLY:
{
  "groundedness": { "score": number, "pass": boolean, "notes": string },
  "citationValidity": { "pass": boolean, "invalid": [ { "marker": string, "reason": string } ] },
  "jurisdictionCorrect": { "pass": boolean, "notes": string },
  "uncertaintyHonest": { "pass": boolean, "notes": string },
  "overall": "pass" | "revise" | "downgrade",
  "action": "show" | "re-retrieve" | "revise" | "downgrade",
  "iteration": 0
}`;

export function buildJudgePrompt(
  question: string,
  answer: AnswerPayload,
  chunks: RetrievedChunk[],
): string {
  const cites = answer.citations
    .map((c) => `${c.marker} sourceId=${c.sourceId} locator="${c.locator}" quote="${c.quote}"`)
    .join("\n");
  return [
    `QUESTION:\n${question}`,
    `DRAFT ANSWER (regime=${answer.regime.applies}, ohadaSupersedes=${answer.regime.ohadaSupersedes ?? false}, confidence=${answer.confidence}):\n${answer.answer}`,
    `DRAFT CITATIONS:\n${cites || "(none)"}`,
    `SOURCES:\n\n${formatSources(chunks)}`,
  ].join("\n\n");
}

/** Conservative verdict used when the judge itself fails to produce valid output. */
function failClosed(): SelfEvalVerdict {
  return {
    groundedness: { score: 0, pass: false, notes: "judge output could not be parsed" },
    citationValidity: { pass: false, invalid: [] },
    jurisdictionCorrect: { pass: false, notes: "" },
    uncertaintyHonest: { pass: true, notes: "" },
    overall: "downgrade",
    action: "downgrade",
    iteration: 0,
  };
}

export async function judgeAnswer(
  question: string,
  answer: AnswerPayload,
  chunks: RetrievedChunk[],
  llm: LLMProvider,
): Promise<SelfEvalVerdict> {
  try {
    const raw = await llm.complete({
      system: JUDGE_SYSTEM,
      prompt: buildJudgePrompt(question, answer, chunks),
      json: true,
      temperature: 0,
      maxTokens: 900,
    });
    const parsed = SelfEvalVerdict.safeParse(JSON.parse(stripFences(raw)));
    return parsed.success ? parsed.data : failClosed();
  } catch {
    return failClosed();
  }
}

/** All four dimensions clear. */
export function verdictPasses(v: SelfEvalVerdict): boolean {
  return (
    v.groundedness.pass &&
    v.citationValidity.pass &&
    v.jurisdictionCorrect.pass &&
    v.uncertaintyHonest.pass
  );
}
