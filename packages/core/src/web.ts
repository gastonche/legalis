import type { RetrievedChunk, SourceType } from "@legalis/contracts";
import type { WebResult } from "./ports";

/**
 * Official + scholarly domains web search is biased toward. Gov/OHADA/treaty
 * bodies map to primary authority; law-library guides to secondary.
 */
export const ALLOWLIST = [
  "minjustice.gov.cm",
  "prc.cm",
  "spm.gov.cm",
  "assnat.cm",
  "senat.cm",
  "impots.cm",
  "dgi.cm",
  "ohada.org",
  "ohada.com",
  "wipo.int",
  "natlex.ilo.org",
  "ilo.org",
  "guides.loc.gov",
  "loc.gov",
  "nyulawglobal.org",
  "droit-afrique.com",
  "juricaf.org",
];

function classify(url: string): { authority: "primary" | "secondary"; sourceType: SourceType } {
  const h = url.toLowerCase();
  if (h.includes("ohada.")) return { authority: "primary", sourceType: "ohada" };
  if (/(minjustice|prc|spm|assnat|senat|impots|dgi)\.(gov\.)?cm/.test(h))
    return { authority: "primary", sourceType: "statute" };
  if (h.includes("natlex.ilo.org") || h.includes("wipo.int"))
    return { authority: "primary", sourceType: "statute" };
  if (h.includes("loc.gov") || h.includes("nyulawglobal"))
    return { authority: "secondary", sourceType: "guide" };
  return { authority: "secondary", sourceType: "web" };
}

const FR = /\b(le|la|les|des|une?|droit|loi|du|au|aux|que|qui|est|sont|pour|dans|cameroun)\b/gi;
const EN = /\b(the|of|and|to|in|is|are|law|act|shall|which|that|cameroon)\b/gi;
function detectLang(text: string): "en" | "fr" {
  return (text.match(FR) ?? []).length > (text.match(EN) ?? []).length ? "fr" : "en";
}

/** Map Tavily web results into RetrievedChunks so they fuse with corpus chunks. */
export function webResultsToChunks(results: WebResult[]): RetrievedChunk[] {
  return results
    .filter((r) => r.snippet && r.snippet.length > 40)
    .map((r, i) => {
      const { authority, sourceType } = classify(r.url);
      return {
        id: `web:${r.url}`,
        text: r.snippet,
        score: 0.55 - i * 0.02,
        metadata: {
          sourceId: r.url,
          title: r.title,
          language: detectLang(r.snippet),
          authority,
          sourceType,
          url: r.url,
          citation: r.title,
        },
      };
    });
}
