import { readFile } from "node:fs/promises";
import { extractText, getDocumentProxy } from "unpdf";

export interface ExtractedDoc {
  /** Whole-document text (pages joined). */
  text: string;
  /** Per-page text, for page-anchored citations. */
  pages: string[];
  pageCount: number;
}

/**
 * Pure-JS PDF text extraction (unpdf → pdf.js under the hood). Workers-compatible,
 * no native/system dependency. Scanned (image-only) PDFs yield little/no text and
 * are detected by the caller via the manifest's text_layer flag.
 */
export async function extractPdf(absPath: string): Promise<ExtractedDoc> {
  const data = new Uint8Array(await readFile(absPath));
  const pdf = await getDocumentProxy(data);
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text : [text];
  return { text: pages.join("\n\n"), pages, pageCount: totalPages };
}
