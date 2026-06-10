import { AnswerPayload, type Citation, type RetrievedChunk } from "@legalis/contracts";
import type { LLMProvider } from "./ports";

export const SYNTHESIS_SYSTEM = `You are Legalis, a careful research assistant for CAMEROON law. You provide legal INFORMATION, never legal advice.

ABSOLUTE RULES:
- Ground every legal statement ONLY in the numbered SOURCES provided. NEVER invent statutes, article numbers, cases, or quotes. If the sources do not support an answer, say so plainly.
- Cite with inline [n] markers referring to the SOURCE numbers. Every legal proposition must carry at least one [n].
- Prefer PRIMARY authority (constitution / statute / OHADA / case) over secondary. Note when OHADA Uniform Acts supersede national law on business/commercial matters, and flag when the answer differs between the Anglophone common-law and Francophone civil-law regions.
- Regime guidance: matters governed by OHADA Uniform Acts — commercial companies, commercial sales and trade, securities, insolvency, arbitration, accounting — take applies: "ohada" with ohadaSupersedes: true.
- Surface uncertainty honestly. If grounding is weak or partial, set confidence to "low" or "medium" and state what is missing.
- Plain language for a layperson. Always include a scope note recommending a qualified Cameroonian lawyer.

Respond with a SINGLE JSON object (no prose outside JSON) matching EXACTLY:
{
  "answer": string,                 // plain-language markdown; use [n] citation markers inline
  "citations": [ {
     "marker": string,              // e.g. "[1]"
     "sourceId": string,            // the EXACT sourceId shown for that source
     "sourceTitle": string,
     "locator": string,             // article/section, e.g. "Article 25"
     "quote": string,               // a short VERBATIM excerpt copied from that source's text
     "authority": "primary"|"secondary",
     "language": "en"|"fr"
  } ],
  "regime": { "applies": "common-law"|"civil-law"|"ohada"|"mixed"|"unclear", "rationale": string, "ohadaSupersedes": boolean },
  "confidence": "high"|"medium"|"low",
  "scopeNote": string,
  "language": "en"|"fr"
}
If the sources are insufficient, return confidence "low", an honest "answer" saying you cannot fully ground it, and an empty "citations" array.`;

export function formatSources(chunks: RetrievedChunk[]): string {
  return chunks
    .map((c, i) => {
      const m = c.metadata;
      const loc = m.articleSection ?? m.citation ?? "";
      return `[${i + 1}] (sourceId: ${m.sourceId}) ${m.title} — ${loc} [${m.authority}/${m.language}/${m.sourceType}]\n${c.text}`;
    })
    .join("\n\n---\n\n");
}

export function buildSynthesisPrompt(
  question: string,
  chunks: RetrievedChunk[],
  revisionNote?: string,
  context?: string,
): string {
  const convo = context ? `CONVERSATION SO FAR (resolve follow-up references against this):\n${context}\n\n` : "";
  const base = `${convo}QUESTION (from a layperson):\n${question}\n\nSOURCES (retrieved from the Cameroon legal corpus — cite by [n] and use the exact sourceId):\n\n${formatSources(chunks)}`;
  return revisionNote
    ? `${base}\n\nREVISION REQUIRED — a reviewer flagged the previous draft. Fix these issues and re-ground strictly in the sources above:\n${revisionNote}`
    : base;
}

export interface InvalidCitation {
  marker: string;
  reason: string;
}

const norm = (s: string): string => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Citation-integrity layer: reject citations whose sourceId isn't retrieved or whose quote isn't in that source. */
export function validateCitations(
  answer: AnswerPayload,
  chunks: RetrievedChunk[],
): { valid: Citation[]; invalid: InvalidCitation[] } {
  const byId = new Map<string, RetrievedChunk[]>();
  for (const c of chunks) {
    const arr = byId.get(c.metadata.sourceId) ?? [];
    arr.push(c);
    byId.set(c.metadata.sourceId, arr);
  }
  const valid: Citation[] = [];
  const invalid: InvalidCitation[] = [];
  for (const cit of answer.citations) {
    const cands = byId.get(cit.sourceId);
    if (!cands) {
      invalid.push({ marker: cit.marker, reason: `sourceId '${cit.sourceId}' not in retrieved set` });
      continue;
    }
    const q = norm(cit.quote).slice(0, 60);
    const supported = q.length < 12 || cands.some((c) => norm(c.text).includes(q));
    if (!supported) {
      invalid.push({ marker: cit.marker, reason: "quote not found in cited source" });
      continue;
    }
    valid.push(cit);
  }
  return { valid, invalid };
}

/** Strip ```json fences if a model wrapped its JSON output. */
export function stripFences(s: string): string {
  const t = s.trim();
  const m = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  return m ? m[1].trim() : t;
}

/**
 * The scope boundary is an engineered behavior, not a hope: if the model's
 * answer/scopeNote doesn't state the information-not-advice boundary explicitly,
 * the canonical note is appended deterministically.
 */
export const SCOPE_BOUNDARY =
  "This is legal information, not legal advice. For your specific situation, consult a qualified Cameroonian lawyer.";

export function enforceScopeBoundary(answer: AnswerPayload): AnswerPayload {
  const text = `${answer.answer} ${answer.scopeNote}`;
  const ok = /lawyer/i.test(text) && /(legal information|not legal advice)/i.test(text);
  if (ok) return answer;
  const scopeNote = answer.scopeNote ? `${answer.scopeNote.trim()} ${SCOPE_BOUNDARY}` : SCOPE_BOUNDARY;
  return { ...answer, scopeNote };
}

export interface SynthesisResult {
  answer: AnswerPayload;
  invalid: InvalidCitation[];
}

export async function synthesizeAnswer(
  question: string,
  chunks: RetrievedChunk[],
  llm: LLMProvider,
  revisionNote?: string,
): Promise<SynthesisResult> {
  const raw = await llm.complete({
    system: SYNTHESIS_SYSTEM,
    prompt: buildSynthesisPrompt(question, chunks, revisionNote),
    json: true,
    temperature: 0.2,
    maxTokens: 1600,
  });
  const parsed = AnswerPayload.safeParse(JSON.parse(stripFences(raw)));
  if (!parsed.success) throw new Error(`synthesis returned an invalid AnswerPayload: ${parsed.error.message}`);
  const { valid, invalid } = validateCitations(parsed.data, chunks);
  return { answer: enforceScopeBoundary({ ...parsed.data, citations: valid }), invalid };
}

// ---------------------------------------------------------------------------
// Streaming synthesis (M5): stream the plain-language prose live, then a second
// structured pass extracts citations/regime/confidence for the answer card.
// ---------------------------------------------------------------------------

export const SYNTH_PROSE_SYSTEM = `You are Legalis, a careful research assistant for CAMEROON law. You give legal INFORMATION, never advice.
Write a concise, plain-language answer to the QUESTION, grounded ONLY in the numbered SOURCES. NEVER invent statutes, article numbers, cases, or quotes.
- Cite inline with the source's bracketed number exactly as written — e.g. [1], [2], [3] — matching the SOURCE numbers. Every legal point needs at least one such marker. Do not write "[n]" or "[n:1]".
- Prefer primary authority; note OHADA supersession and any Anglophone-vs-Francophone divergence when relevant.
- If the sources don't support an answer, say so honestly.
- If a CONVERSATION SO FAR is given, interpret the new question in that context and resolve references (e.g. "it", "that", "what about…").
Write ONLY the answer prose (markdown, with [n] markers). Do NOT output JSON or headings like "Answer:". End with one sentence reminding the reader to consult a qualified Cameroonian lawyer.`;

/** Stream the answer prose token-by-token. */
export function streamProse(
  question: string,
  chunks: RetrievedChunk[],
  llm: LLMProvider,
  context?: string,
): AsyncIterable<string> {
  return llm.stream({
    system: SYNTH_PROSE_SYSTEM,
    prompt: buildSynthesisPrompt(question, chunks, undefined, context),
    temperature: 0.2,
    maxTokens: 1200,
  });
}

export const STRUCTURE_SYSTEM = `You convert a DRAFT ANSWER (already written, with [n] citation markers) into structured metadata, using the SOURCES. Do not change the legal content. Extract ONLY citations that the draft actually relies on, using the EXACT sourceId of each source and a short VERBATIM quote copied from that source.

Regime guidance: matters governed by OHADA Uniform Acts — commercial companies, commercial sales and trade, securities, insolvency, arbitration, accounting — take applies: "ohada" with ohadaSupersedes: true.

Output a SINGLE JSON object matching EXACTLY:
{
  "citations": [ { "marker": string, "sourceId": string, "sourceTitle": string, "locator": string, "quote": string, "authority": "primary"|"secondary", "language": "en"|"fr" } ],
  "regime": { "applies": "common-law"|"civil-law"|"ohada"|"mixed"|"unclear", "rationale": string, "ohadaSupersedes": boolean },
  "confidence": "high"|"medium"|"low",
  "scopeNote": string,
  "language": "en"|"fr"
}`;

/** Structure a streamed prose answer into a validated AnswerPayload (keeps the prose as `answer`). */
export async function structureAnswer(
  question: string,
  prose: string,
  chunks: RetrievedChunk[],
  llm: LLMProvider,
): Promise<SynthesisResult> {
  const raw = await llm.complete({
    system: STRUCTURE_SYSTEM,
    prompt: `QUESTION:\n${question}\n\nDRAFT ANSWER:\n${prose}\n\nSOURCES:\n\n${formatSources(chunks)}`,
    json: true,
    temperature: 0,
    maxTokens: 900,
  });
  const meta = JSON.parse(stripFences(raw)) as Record<string, unknown>;
  const candidate = { ...meta, answer: prose };
  const parsed = AnswerPayload.safeParse(candidate);
  if (!parsed.success) throw new Error(`structure step produced invalid AnswerPayload: ${parsed.error.message}`);
  const { valid, invalid } = validateCitations(parsed.data, chunks);
  return { answer: enforceScopeBoundary({ ...parsed.data, citations: valid }), invalid };
}
