import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { RetrievedChunk } from "@legalis/contracts";
import { currentRun } from "../runContext";

/** Corpus retrieval as a model-invoked tool (the corpus half of the old retrieveFused). */
export const searchCorpus = createTool({
  id: "search-corpus",
  description:
    "Search the Cameroon primary-law corpus (Constitution, national statutes/codes, OHADA Uniform Acts) for provisions relevant to the question. Call this FIRST for any legal question. Returns how many sources were found and their document titles.",
  inputSchema: z.object({
    query: z.string().describe("a focused legal search query; English or French both work"),
  }),
  outputSchema: z.object({ found: z.number(), titles: z.array(z.string()) }),
  execute: async ({ query }) => {
    const run = currentRun();
    run.sink.trace("retrieve", "start");
    run.sink.narration("retrieve", "Searching the Cameroon corpus for the governing provisions…");
    let chunks: RetrievedChunk[] = [];
    try {
      const [qv] = await run.deps.embedder.embed([query], "query");
      if (qv) chunks = await run.deps.store.query(qv, { topK: run.deps.topK ?? 8 });
    } catch {
      chunks = [];
    }
    run.chunks.push(...chunks);
    const titles = [...new Set(chunks.map((c) => c.metadata.title))].slice(0, 6);
    run.sink.trace("retrieve", "end", chunks.length ? "ok" : "warn", `${chunks.length} corpus chunks`);
    return { found: chunks.length, titles };
  },
});
