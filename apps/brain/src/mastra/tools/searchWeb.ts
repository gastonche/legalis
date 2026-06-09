import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { ALLOWLIST, webResultsToChunks } from "@legalis/core";
import type { WebResult } from "@legalis/core";
import { currentRun } from "../runContext";

/** Allowlist-biased web search as a model-invoked tool (the web half of retrieveFused). */
export const searchWeb = createTool({
  id: "search-web",
  description:
    "Search official + scholarly web sources (Cameroon government, OHADA, ILO/WIPO, law-library guides) for CURRENT or PROCEDURAL information not in the static primary-law corpus — latest amendments, fees, official procedures, recent developments. Provide both an English and a French query for best coverage.",
  inputSchema: z.object({
    queryEn: z.string().describe("English web query (will be scoped to Cameroon sources)"),
    queryFr: z.string().optional().describe("French web query"),
  }),
  outputSchema: z.object({ found: z.number() }),
  execute: async ({ queryEn, queryFr }) => {
    const run = currentRun();
    if (!run.deps.search) return { found: 0 };
    run.sink.trace("reflect", "start");
    run.sink.narration("reflect", "Widening the search to official web sources…");
    const queries = [...new Set([queryEn, queryFr].filter((q): q is string => Boolean(q)))];
    const search = run.deps.search;
    const batches = await Promise.all(
      queries.map((q) =>
        search.search(q, { maxResults: 4, allowlist: ALLOWLIST }).catch(() => [] as WebResult[]),
      ),
    );
    const byUrl = new Map<string, WebResult>();
    for (const r of batches.flat()) if (!byUrl.has(r.url)) byUrl.set(r.url, r);
    const chunks = webResultsToChunks([...byUrl.values()]);
    run.chunks.push(...chunks);
    run.sink.trace("reflect", "end", chunks.length ? "ok" : "warn", `${chunks.length} web sources`);
    return { found: chunks.length };
  },
});
