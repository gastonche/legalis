import type { ChunkMetadata, Language } from "@legalis/contracts";
import type { CorpusDoc } from "./manifest";
import {
  ARTICLE_NUMBER,
  CHUNK_CONFIG,
  CONTEXT_LEVELS,
  MARKERS,
  NOISE,
  type StructLevel,
} from "./chunkspec";

export interface Chunk {
  id: string;
  text: string;
  metadata: ChunkMetadata;
}

type Unit = { label: string; number: string | null; text: string; headingPath: string };
type UnitKind = "article" | "section" | "bare";

// ---------- preprocessing ----------

export function preprocess(raw: string): string[] {
  // join hyphenated line-wraps ("tra-\nvail" -> "travail")
  const dehyphenated = raw.replace(/([A-Za-zÀ-ÿ])-\n([a-zà-ÿ])/g, "$1$2");
  return dehyphenated
    .split(/\r?\n/)
    .map((l) => l.replace(/[ \t]+/g, " ").trimEnd())
    .filter((l) => l.trim() === "" || !NOISE.some((r) => r.test(l)));
}

// ---------- unit detection ----------

function count(lines: string[], regexes: RegExp[]): number {
  let n = 0;
  for (const l of lines) if (regexes.some((r) => r.test(l))) n++;
  return n;
}

/** English common-law texts chunk by Section / bare-numbered clause; French texts by Article. */
export function pickUnit(lines: string[]): UnitKind {
  const art = count(lines, MARKERS.article);
  const sec = count(lines, MARKERS.section);
  const bare = count(lines, MARKERS.bareNumber);
  if (art >= 5 && art >= sec) return "article";
  if (sec >= 5 && sec >= bare) return "section";
  if (bare >= 5) return "bare";
  return "article";
}

function unitWord(kind: UnitKind): string {
  return kind === "article" ? "Article" : "Section";
}

function boundaryRegexes(kind: UnitKind): RegExp[] {
  if (kind === "article") return MARKERS.article;
  if (kind === "section") return MARKERS.section;
  return MARKERS.bareNumber;
}

function contextLevels(kind: UnitKind): StructLevel[] {
  // when Section is the chunk unit, it can't also be a context level
  return kind === "section" ? CONTEXT_LEVELS.filter((l) => l !== "section") : CONTEXT_LEVELS;
}

function matchContext(line: string, levels: StructLevel[]): StructLevel | null {
  for (const lvl of levels) if (MARKERS[lvl].some((r) => r.test(line))) return lvl;
  return null;
}

function captureNumber(line: string): string | null {
  const m = ARTICLE_NUMBER.exec(line);
  if (!m?.[1]) return null;
  const n = m[1].trim();
  return /premi/i.test(n) ? "1" : n;
}

// ---------- build article units with heading context ----------

export function buildUnits(lines: string[], kind: UnitKind): Unit[] {
  const ctxLevels = contextLevels(kind);
  const boundary = boundaryRegexes(kind);
  const stack: Partial<Record<StructLevel, string>> = {};
  const pathNow = () =>
    CONTEXT_LEVELS.map((l) => stack[l])
      .filter((v): v is string => Boolean(v))
      .join(" > ");

  const units: Unit[] = [];
  let cur: { number: string | null; body: string[]; headingPath: string } | null = null;
  const pre: string[] = [];
  const word = unitWord(kind);

  let started = false; // have we hit the first article boundary yet?

  const flush = () => {
    if (!cur) return;
    const text = cur.body.join("\n").trim();
    if (text) {
      const label = cur.number
        ? `${word} ${cur.number}`
        : (cur.headingPath.split(" > ").pop() ?? word); // section-intro prose labelled by its heading
      units.push({ label, number: cur.number, text, headingPath: cur.headingPath });
    }
    cur = null;
  };

  for (const line of lines) {
    if (line.trim() === "") {
      if (cur) cur.body.push("");
      continue;
    }
    const ctx = matchContext(line, ctxLevels);
    if (ctx) {
      flush();
      stack[ctx] = line.replace(/\s+/g, " ").trim().slice(0, 90);
      const idx = CONTEXT_LEVELS.indexOf(ctx);
      for (const deeper of CONTEXT_LEVELS.slice(idx + 1)) delete stack[deeper];
      // After the first article, keep an accumulator open so orphan prose under a
      // heading becomes its own chunk instead of leaking into the front matter.
      if (started) cur = { number: null, body: [], headingPath: pathNow() };
      continue;
    }
    if (boundary.some((r) => r.test(line))) {
      started = true;
      flush();
      cur = { number: captureNumber(line), body: [line], headingPath: pathNow() };
      continue;
    }
    if (cur) cur.body.push(line);
    else pre.push(line); // only reached before the first boundary → genuine front matter
  }
  flush();

  const preText = pre.join("\n").trim();
  if (preText.length >= CHUNK_CONFIG.min) {
    units.unshift({ label: "preamble", number: null, text: preText, headingPath: "" });
  }
  return units;
}

// ---------- windowing + packing ----------

function tail(s: string, n: number): string {
  return s.slice(Math.max(0, s.length - n));
}

function windowText(text: string, max: number, overlap: number): string[] {
  const paras = text
    .split(/\n{2,}/)
    .flatMap((p) => (p.length > max ? p.split(/(?<=[.;:])\s+/) : [p]));
  const out: string[] = [];
  let cur = "";
  for (const p of paras) {
    if (cur && cur.length + p.length + 2 > max) {
      out.push(cur);
      cur = tail(cur, overlap) + "\n\n" + p;
    } else {
      cur = cur ? cur + "\n\n" + p : p;
    }
    while (cur.length > max) {
      out.push(cur.slice(0, max));
      cur = cur.slice(max - overlap);
    }
  }
  if (cur.trim()) out.push(cur);
  return out.length ? out : [text.slice(0, max)];
}

function chunkLang(doc: CorpusDoc): Language {
  return doc.languages[0] === "en" ? "en" : "fr";
}

function buildMeta(
  doc: CorpusDoc,
  label: string,
  number: string | null,
  headingPath: string,
): ChunkMetadata {
  return {
    sourceId: doc.id,
    title: doc.title,
    language: chunkLang(doc),
    authority: doc.authority,
    sourceType: doc.sourceType,
    legalDistrict: doc.legalDistrict,
    articleSection: label,
    ...(number ? { articleNumber: number } : {}),
    ...(headingPath ? { headingPath } : {}),
    ...(doc.url ? { url: doc.url } : {}),
    citation: `${doc.title} — ${label}`,
  };
}

/** Chunk one document into retrieval-ready, metadata-tagged chunks. */
export function chunkDoc(doc: CorpusDoc, rawText: string): Chunk[] {
  const lines = preprocess(rawText);
  const kind = pickUnit(lines);
  const units = buildUnits(lines, kind);
  const word = unitWord(kind);
  const { min, max, overlap } = CHUNK_CONFIG;

  const chunks: Chunk[] = [];
  let seq = 0;
  const emit = (text: string, label: string, number: string | null, headingPath: string) => {
    const t = text.trim();
    if (t.length < 24) return; // drop junk fragments
    chunks.push({ id: `${doc.id}::${seq++}`, text: t, metadata: buildMeta(doc, label, number, headingPath) });
  };

  let pend: { texts: string[]; numbers: (string | null)[]; labels: string[]; headingPath: string; size: number } | null =
    null;
  const flushPend = () => {
    if (!pend) return;
    const first = pend.numbers[0];
    const last = pend.numbers[pend.numbers.length - 1];
    const label =
      pend.numbers.length > 1 && first && last
        ? `${word}s ${first}–${last}`
        : (pend.labels[0] ?? word);
    const number = pend.numbers.length === 1 ? (pend.numbers[0] ?? null) : null;
    emit(pend.texts.join("\n\n"), label, number, pend.headingPath);
    pend = null;
  };

  for (const u of units) {
    if (u.label === "preamble") {
      flushPend();
      if (u.text.length > max) {
        const windows = windowText(u.text, max, overlap);
        windows.forEach((w, i) => emit(w, `preamble (part ${i + 1}/${windows.length})`, null, ""));
      } else {
        emit(u.text, "preamble", null, "");
      }
      continue;
    }
    if (u.text.length > max) {
      flushPend();
      const windows = windowText(u.text, max, overlap);
      windows.forEach((w, i) =>
        emit(w, `${u.label} (part ${i + 1}/${windows.length})`, u.number, u.headingPath),
      );
      continue;
    }
    if (
      pend &&
      (pend.headingPath !== u.headingPath || pend.size >= min || pend.size + u.text.length > max)
    ) {
      flushPend();
    }
    pend ??= { texts: [], numbers: [], labels: [], headingPath: u.headingPath, size: 0 };
    pend.texts.push(u.text);
    pend.numbers.push(u.number);
    pend.labels.push(u.label);
    pend.size += u.text.length;
  }
  flushPend();
  return chunks;
}
