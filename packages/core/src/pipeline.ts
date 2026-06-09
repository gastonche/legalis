import type { AnswerPayload, RetrievedChunk } from "@legalis/contracts";
import type { EmbeddingProvider, LLMProvider, VectorStore } from "./ports";
import { synthesizeAnswer, type InvalidCitation } from "./synthesize";

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
