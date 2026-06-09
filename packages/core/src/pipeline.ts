import type {
  AnswerPayload,
  RetrievedChunk,
  SelfEvalVerdict,
  VerificationBannerProps,
} from "@legalis/contracts";
import type { EmbeddingProvider, LLMProvider, VectorStore } from "./ports";
import { synthesizeAnswer, type InvalidCitation } from "./synthesize";
import { judgeAnswer, verdictPasses } from "./judge";

export const SCOPE_NOTE =
  "This is general legal information, not legal advice. Cameroon law differs by region " +
  "(Anglophone common law vs Francophone civil law), and OHADA rules can override national law " +
  "on business matters. For your specific situation, consult a qualified Cameroonian lawyer.";

export interface GroundedDeps {
  embedder: EmbeddingProvider;
  store: VectorStore;
  llm: LLMProvider;
  topK?: number;
}

export interface GroundedResult {
  answer: AnswerPayload;
  chunks: RetrievedChunk[];
  invalidCitations: InvalidCitation[];
  grounded: boolean;
}

/** The honest insufficient-grounding answer — surfaced instead of guessing. */
export function refusal(question: string, reason: string): AnswerPayload {
  return {
    answer:
      `I can't fully ground an answer to "${question.trim()}" in the sources available, so I won't guess. ` +
      `${reason} Please consult a qualified Cameroonian lawyer, who can advise on your specific situation.`,
    citations: [],
    regime: {
      applies: "unclear",
      rationale: "Insufficient grounded sources to determine the governing regime.",
    },
    confidence: "low",
    scopeNote: SCOPE_NOTE,
    language: "en",
  };
}

/**
 * Single-step grounded slice: embed → retrieve → synthesize a cited, regime-aware
 * answer, with an explicit honest-refusal path when grounding is insufficient.
 */
export async function groundedAnswer(question: string, deps: GroundedDeps): Promise<GroundedResult> {
  const [qv] = await deps.embedder.embed([question], "query");
  if (!qv) {
    return { answer: refusal(question, "Embedding failed."), chunks: [], invalidCitations: [], grounded: false };
  }
  const chunks = await deps.store.query(qv, { topK: deps.topK ?? 8 });
  if (chunks.length === 0) {
    return {
      answer: refusal(question, "No relevant sources were found in the corpus."),
      chunks: [],
      invalidCitations: [],
      grounded: false,
    };
  }
  try {
    const { answer, invalid } = await synthesizeAnswer(question, chunks, deps.llm);
    const grounded = answer.citations.length > 0;
    return {
      answer: grounded
        ? answer
        : refusal(question, "The retrieved sources did not clearly support an answer."),
      chunks,
      invalidCitations: invalid,
      grounded,
    };
  } catch {
    return {
      answer: refusal(question, "I hit an error while grounding the answer."),
      chunks,
      invalidCitations: [],
      grounded: false,
    };
  }
}

// ---------------------------------------------------------------------------
// M4: self-evaluation gate — grade-before-show with bounded revise/re-retrieve.
// ---------------------------------------------------------------------------

export interface GateDeps extends GroundedDeps {
  maxIterations?: number; // cap on revise/re-retrieve rounds (default 2)
}

export interface GatedResult {
  answer: AnswerPayload;
  verdict: SelfEvalVerdict;
  banner: VerificationBannerProps;
  chunks: RetrievedChunk[];
  iterations: number;
}

export function downgradeVerdict(notes: string): SelfEvalVerdict {
  return {
    groundedness: { score: 0, pass: false, notes },
    citationValidity: { pass: false, invalid: [] },
    jurisdictionCorrect: { pass: false, notes: "" },
    uncertaintyHonest: { pass: true, notes: "" },
    overall: "downgrade",
    action: "downgrade",
    iteration: 0,
  };
}

export function buildBanner(verdict: SelfEvalVerdict, answer: AnswerPayload): VerificationBannerProps {
  const checks = [
    { name: "Grounded in sources", passed: verdict.groundedness.pass },
    { name: "Citations valid", passed: verdict.citationValidity.pass },
    { name: "Regime correct", passed: verdict.jurisdictionCorrect.pass },
    { name: "Uncertainty surfaced", passed: verdict.uncertaintyHonest.pass },
  ];
  if (verdict.action === "show") {
    return answer.confidence === "high"
      ? {
          status: "verified",
          message:
            "Checked before showing: every claim is backed by a cited source and the legal regime was confirmed.",
          checks,
        }
      : {
          status: "partial",
          message:
            "Checked before showing: grounded and cited, with some uncertainty deliberately flagged.",
          checks,
        };
  }
  return {
    status: "downgraded",
    message:
      "I couldn't fully verify this against the sources, so it's shown as a tentative answer — please confirm with a qualified Cameroonian lawyer.",
    checks,
  };
}

export function downgradeAnswer(answer: AnswerPayload): AnswerPayload {
  return {
    ...answer,
    confidence: "low",
    answer:
      "⚠ I couldn't fully verify this against the available sources, so treat it as tentative and confirm with a qualified Cameroonian lawyer.\n\n" +
      answer.answer,
  };
}

function revisionNote(v: SelfEvalVerdict): string {
  const parts: string[] = [];
  if (!v.groundedness.pass) parts.push(`Groundedness: ${v.groundedness.notes}`);
  if (!v.citationValidity.pass) {
    parts.push(
      `Citations: ${v.citationValidity.invalid.map((i) => `${i.marker} — ${i.reason}`).join("; ") || "tighten weak citations"}`,
    );
  }
  if (!v.jurisdictionCorrect.pass) parts.push(`Regime: ${v.jurisdictionCorrect.notes}`);
  if (!v.uncertaintyHonest.pass) parts.push(`Uncertainty: ${v.uncertaintyHonest.notes}`);
  return parts.join("\n");
}

async function safeSynth(
  question: string,
  chunks: RetrievedChunk[],
  llm: LLMProvider,
  note?: string,
): Promise<{ answer: AnswerPayload; grounded: boolean }> {
  try {
    const { answer } = await synthesizeAnswer(question, chunks, llm, note);
    return { answer, grounded: answer.citations.length > 0 };
  } catch {
    return { answer: refusal(question, "I hit an error while grounding the answer."), grounded: false };
  }
}

/**
 * Production-facing answer with the inline self-eval gate: synthesize → judge →
 * (pass: show) | (revise/re-retrieve under the cap) | (honest downgrade). Returns
 * the final answer, the structured verdict, and a calm verification banner.
 */
export async function answerWithSelfEval(question: string, deps: GateDeps): Promise<GatedResult> {
  const maxIter = deps.maxIterations ?? 2;
  let topK = deps.topK ?? 8;

  const [qv] = await deps.embedder.embed([question], "query");
  if (!qv) {
    const a = refusal(question, "Embedding failed.");
    const v = downgradeVerdict("embedding failed");
    return { answer: a, verdict: v, banner: buildBanner(v, a), chunks: [], iterations: 0 };
  }

  let chunks = await deps.store.query(qv, { topK });
  if (chunks.length === 0) {
    const a = refusal(question, "No relevant sources were found in the corpus.");
    const v = downgradeVerdict("no sources retrieved");
    return { answer: a, verdict: v, banner: buildBanner(v, a), chunks: [], iterations: 0 };
  }

  let synth = await safeSynth(question, chunks, deps.llm);
  let verdict = downgradeVerdict("not yet judged");
  let iter = 0;

  for (;;) {
    verdict = { ...(await judgeAnswer(question, synth.answer, chunks, deps.llm)), iteration: iter };

    if (synth.grounded && verdictPasses(verdict)) {
      verdict = { ...verdict, overall: "pass", action: "show" };
      break;
    }
    if (iter >= maxIter || !synth.grounded || verdict.overall === "downgrade") {
      verdict = { ...verdict, action: "downgrade" };
      break;
    }
    iter += 1;
    if (verdict.overall === "revise") {
      verdict = { ...verdict, action: "revise" };
      synth = await safeSynth(question, chunks, deps.llm, revisionNote(verdict));
    } else {
      verdict = { ...verdict, action: "re-retrieve" };
      topK *= 2;
      chunks = await deps.store.query(qv, { topK });
      synth = await safeSynth(question, chunks, deps.llm);
    }
  }

  const finalAnswer =
    verdict.action === "show"
      ? synth.answer
      : synth.grounded
        ? downgradeAnswer(synth.answer)
        : synth.answer; // an honest refusal stays as-is
  return { answer: finalAnswer, verdict, banner: buildBanner(verdict, finalAnswer), chunks, iterations: iter };
}
