import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Authority, LegalDistrict, SourceType } from "@legalis/contracts";

/** A primary corpus document resolved from corpus/manifest.json. */
export interface CorpusDoc {
  id: string;
  title: string;
  manifestType: string; // constitution | uniform-act | code | ordinance | statute
  languages: string[]; // ["fr"] | ["en"] | ["fr","en"]
  sourceType: SourceType;
  authority: Authority; // corpus is all primary legal text
  legalDistrict: LegalDistrict;
  url?: string;
  absPath: string;
  textLayer: boolean;
  pages: number;
}

interface ManifestItem {
  id: string;
  title: string;
  languages: string[];
  authority: string;
  url?: string;
  local_path?: string;
  text_layer: boolean;
  pages: number | string;
}

interface Manifest {
  primary: Record<string, ManifestItem[]>;
}

// manifest "type" (grouping) → retrieval SourceType
const TYPE_TO_SOURCE: Record<string, SourceType> = {
  constitution: "constitution",
  "uniform-act": "ohada",
  code: "statute",
  ordinance: "statute",
  statute: "statute",
};

/** Load all downloaded primary documents with retrieval-ready metadata. */
export async function loadCorpus(corpusDir: string): Promise<CorpusDoc[]> {
  const raw = await readFile(path.join(corpusDir, "manifest.json"), "utf8");
  const manifest = JSON.parse(raw) as Manifest;
  const docs: CorpusDoc[] = [];
  for (const [type, items] of Object.entries(manifest.primary)) {
    for (const it of items) {
      if (!it.local_path) continue;
      docs.push({
        id: it.id,
        title: it.title,
        manifestType: type,
        languages: it.languages,
        sourceType: TYPE_TO_SOURCE[type] ?? "statute",
        authority: "primary",
        legalDistrict: type === "uniform-act" ? "ohada" : "national",
        url: it.url,
        absPath: path.join(corpusDir, it.local_path),
        textLayer: it.text_layer,
        pages: Number(it.pages) || 0,
      });
    }
  }
  return docs;
}

/** Repo-root/corpus, resolved from this file's location. */
export function defaultCorpusDir(): string {
  return path.resolve(import.meta.dirname, "../../../corpus");
}
