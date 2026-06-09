import { z } from "zod";
import { Authority, Language, LegalDistrict, SourceType } from "./common";

/**
 * Metadata stored per chunk in Vectorize. Language/structure-aware chunking
 * preserves article/section numbers; these tags gate answer quality.
 */
export const ChunkMetadata = z.object({
  sourceId: z.string(), // stable id of the parent document (manifest id)
  title: z.string(),
  language: Language,
  authority: Authority,
  sourceType: SourceType,
  legalDistrict: LegalDistrict.optional(),
  articleSection: z.string().optional(), // canonical label, e.g. "Article 12", "Articles 12-14", "preamble"
  articleNumber: z.string().optional(), // bare number for filtering/citation, e.g. "12", "133-1", "12 bis"
  headingPath: z.string().optional(), // breadcrumb of enclosing structure, e.g. "LIVRE 1 > TITRE 2 > Chapitre 1"
  url: z.string().optional(),
  citation: z.string().optional(), // human-readable locator for display
});
export type ChunkMetadata = z.infer<typeof ChunkMetadata>;

export const RetrievedChunk = z.object({
  id: z.string(),
  text: z.string(),
  score: z.number(),
  metadata: ChunkMetadata,
});
export type RetrievedChunk = z.infer<typeof RetrievedChunk>;
