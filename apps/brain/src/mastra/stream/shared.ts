import type { ComponentDirective, RetrievedChunk, SourceItem } from "@legalis/contracts";

export const TALK_TO_LAWYER: ComponentDirective = {
  component: "talk-to-a-lawyer",
  props: {
    message:
      "For your specific situation — especially anything time-sensitive — a qualified Cameroonian lawyer can confirm how this applies to you.",
    jurisdictionNote:
      "Where the answer turns on your region (Anglophone common law vs Francophone civil law), confirm which rules apply to you.",
  },
};

/** De-duplicate accumulated chunks by document, keeping order. */
export function dedupeChunks(chunks: RetrievedChunk[]): RetrievedChunk[] {
  const seen = new Set<string>();
  const out: RetrievedChunk[] = [];
  for (const c of chunks) {
    const key = `${c.metadata.sourceId}|${c.metadata.articleSection ?? c.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

/** Build the sources card from accumulated chunks (deduped by document, max 6). */
export function sourcesComponent(chunks: RetrievedChunk[]): ComponentDirective {
  const seen = new Set<string>();
  const items: SourceItem[] = [];
  for (const c of chunks) {
    if (seen.has(c.metadata.sourceId)) continue;
    seen.add(c.metadata.sourceId);
    items.push({
      id: c.id,
      title: c.metadata.title,
      authority: c.metadata.authority,
      sourceType: c.metadata.sourceType,
      language: c.metadata.language,
      ...(c.metadata.url ? { url: c.metadata.url } : {}),
      ...(c.metadata.articleSection ? { locator: c.metadata.articleSection } : {}),
    });
    if (items.length >= 6) break;
  }
  return { component: "sources", props: { items } };
}
