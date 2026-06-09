import path from "node:path";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { defaultCorpusDir, loadCorpus } from "../manifest";
import { chunkDoc, type Chunk } from "../chunk";

interface DocStat {
  id: string;
  type: string;
  lang: string;
  chunks: number;
  avg: number;
  min: number;
  max: number;
  withArticleNo: number;
  withHeading: number;
}

const corpusDir = process.argv[2] ?? defaultCorpusDir();
const extractedDir = path.join(corpusDir, ".extracted");
const outDir = path.join(corpusDir, ".chunks");
await mkdir(outDir, { recursive: true });

const docs = await loadCorpus(corpusDir);
const all: Chunk[] = [];
const stats: DocStat[] = [];

for (const d of docs) {
  const txtPath = path.join(extractedDir, `${d.id}.txt`);
  if (!existsSync(txtPath)) continue; // scanned/skipped docs have no extracted text
  const raw = await readFile(txtPath, "utf8");
  const chunks = chunkDoc(d, raw);
  all.push(...chunks);
  const lens = chunks.map((c) => c.text.length);
  const total = lens.reduce((a, b) => a + b, 0);
  stats.push({
    id: d.id,
    type: d.sourceType,
    lang: d.languages.join("+"),
    chunks: chunks.length,
    avg: lens.length ? Math.round(total / lens.length) : 0,
    min: lens.length ? Math.min(...lens) : 0,
    max: lens.length ? Math.max(...lens) : 0,
    withArticleNo: chunks.filter((c) => c.metadata.articleNumber).length,
    withHeading: chunks.filter((c) => c.metadata.headingPath).length,
  });
}

stats.sort((a, b) => b.chunks - a.chunks);
for (const s of stats) {
  console.log(
    `${s.id.padEnd(34)} ${String(s.chunks).padStart(4)} chunks  ` +
      `avg ${String(s.avg).padStart(4)}c  [${String(s.min)}–${String(s.max)}]  ` +
      `art#=${Math.round((100 * s.withArticleNo) / Math.max(1, s.chunks))}%  hdr=${Math.round((100 * s.withHeading) / Math.max(1, s.chunks))}%  [${s.type}/${s.lang}]`,
  );
}

await writeFile(path.join(outDir, "chunks.jsonl"), all.map((c) => JSON.stringify(c)).join("\n"), "utf8");
await writeFile(
  path.join(outDir, "stats.json"),
  JSON.stringify({ totalChunks: all.length, docs: stats }, null, 2),
  "utf8",
);

const avgAll = all.length ? Math.round(all.reduce((a, c) => a + c.text.length, 0) / all.length) : 0;
const withNo = all.filter((c) => c.metadata.articleNumber).length;
console.log(
  `\nTOTAL ${all.length} chunks · avg ${avgAll} chars · ${Math.round((100 * withNo) / Math.max(1, all.length))}% carry an article/section number → ${outDir}`,
);
