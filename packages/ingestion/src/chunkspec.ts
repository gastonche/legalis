/**
 * Structure-aware chunking spec, derived from a per-doc-type analysis of the
 * actual extracted corpus text (see chunkspec.analysis.json). Marker regexes are
 * line-anchored and case-insensitive for robustness across FR/EN and mixed case.
 */

export const CHUNK_CONFIG = { min: 300, max: 1600, overlap: 150 } as const;

const SRC = {
  part: ["^\\s*PART\\s+[IVXLC]+\\b", "^\\s*PARTIE\\s+(?:PREMI[EÈ]RE|[IVXLC]+|[0-9]+)\\b"],
  book: [
    "^\\s*BOOK\\s+[IVXLC]+\\b",
    "^\\s*LIVRE\\s+(?:PR[EÉ]LIMINAIRE|PREMIER|PREMI[EÈ]RE|DEUXIEME|TROISIEME|[IVXLC]+|[0-9]+)\\b",
  ],
  title: ["^\\s*TITRE\\s+(?:PREMIER|[IVXLC]+|[0-9]+)\\b", "^\\s*TITLE\\s+[IVXLC0-9]+\\b"],
  chapter: ["^\\s*CHAPITRE\\s+(?:PREMIER|[IVXLC]+|[0-9]+)\\b", "^\\s*CHAPTER\\s+[IVXLC]+\\b"],
  section: [
    "^\\s*SECTION\\s+(?:PREMI[EÈ]RE|[IVXLC]+|[0-9]+(?:-[0-9]+)?)\\s*[:.\\-–—]?",
    "^\\s*SOUS-SECTION\\s+(?:[IVXLC]+|[0-9]+)\\b",
  ],
  // article-level markers for French/most texts (the chunk unit)
  article: [
    "^\\s*ARTICLE\\s+(?:PREMIER|[0-9]+(?:-[0-9]+)?)\\s*(?:\\.-|\\.|:|[—–-])",
    "^\\s*Article\\s+[0-9]+(?:-[0-9]+)?(?:\\s+(?:bis|ter|quater|quinquies|sexies|septies|octies|nonies|decies))?\\s*(?:\\.-|\\.|[:—–-])?",
    "^\\s*Art\\.?\\s*[0-9]+(?:-[0-9]+)?\\s*\\.?\\s*[—–-]",
  ],
  // bare-numbered clause (English copyright-style "3.—(1)") — only used when the
  // doc has no "Article" markers, to avoid splitting French sub-paragraphs.
  bareNumber: ["^\\s*[0-9]+\\s*\\.\\s*[—–]"],
} as const;

function compile(arr: readonly string[]): RegExp[] {
  return arr.map((s) => new RegExp(s, "i"));
}

export const MARKERS = {
  part: compile(SRC.part),
  book: compile(SRC.book),
  title: compile(SRC.title),
  chapter: compile(SRC.chapter),
  section: compile(SRC.section),
  article: compile(SRC.article),
  bareNumber: compile(SRC.bareNumber),
};

export type StructLevel = "part" | "book" | "title" | "chapter" | "section";
export const CONTEXT_LEVELS: StructLevel[] = ["part", "book", "title", "chapter", "section"];

export const ARTICLE_NUMBER = new RegExp(
  "^\\s*(?:ARTICLE|Article|Art\\.?|SECTION|Section)?\\s*" +
    "((?:PREMI[EÈ]RE|PREMIER|[0-9]+(?:-[0-9]+)?)" +
    "(?:\\s+(?:bis|ter|quater|quinquies|sexies|septies|octies|nonies|decies))?)",
  "i",
);

export const NOISE = compile([
  "^\\s*[0-9]{1,3}\\s*$", // bare page number
  "^\\s*[IVXLC]{1,5}\\s*$", // bare roman-numeral page number (structural romans are prefixed: "TITRE II")
  "^\\s*[-–—]\\s*[0-9]+\\s*[-–—]\\s*$", // "- 4 -" page footer
  "Code\\s+G[eé]n[eé]ral\\s+des\\s+Imp[oô]ts\\s*[–-]\\s*[EÉ]dition", // CGI running footer
  "\\.{4,}", // any table-of-contents dot-leader line ("LIVRE I ......... 1")
  "^\\s*Loi\\s+n[°o]",
  "^\\s*L'Assembl[eé]e\\s+Nationale",
  "^\\s*LA\\s+CONSTITUTION\\s*$",
  "PR[EÉ]SIDENCE\\s+(?:DE|OE|0£)\\s+[IVL].?A?\\s+REPU",
  "COPIE\\s+CERTI[FEA]",
  "SECR[EÉ]TARIA[TI]?\\s+G[EÉ]N",
  "SECRETA[MR]+A?I",
  "RESIDENCE\\s+O[EI]?[lL]A\\s+REPUBLI",
  "^\\s*\\?.*REPUBLI",
  "Journal\\s+Offic",
  "Num[eé]ro\\s+Sp[eé]cial",
  "^\\s*S\\s*O\\s*M\\s*M\\s*A\\s*I\\s*R\\s*E\\s*$",
  "^\\s*SOMMAIRE\\s*$",
  "^\\s*TABLE\\s+DES\\s+MATI[EÈ]RES\\s*$",
  "^\\s*TABLE\\s+OF\\s+CONTENTS\\s*$",
  "Prix\\s*:\\s*[0-9]+\\s*FCFA",
  "ORGANISATION\\s+POUR\\s+L'HARMONISATION",
  "Edit[eé]\\s+par\\s+InterActing",
  "www\\.Droit-Afrique\\.com",
  "^\\s*Code\\s+du\\s+travail\\s+[0-9]+/[0-9]+\\s*$",
  "Site\\s+web\\s*:\\s*www\\.impots\\.cm",
  "Peace\\s*[-–]?\\s*Work\\s*[-–]?\\s*Fatherland",
  "Imprimerie\\s+Nationale",
  "Collection\\s+of\\s+Laws\\s+for\\s+Electronic\\s+Access",
  "\\bpage\\s+[0-9]+\\s*/\\s*[0-9]+\\s*$",
]);
