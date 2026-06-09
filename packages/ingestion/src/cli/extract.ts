import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { defaultCorpusDir, loadCorpus } from "../manifest";
import { extractPdf } from "../extract";

// Stage 1 of ingestion: PDF → text. Writes corpus/.extracted/<id>.txt (gitignored).
const corpusDir = process.argv[2] ?? defaultCorpusDir();
const outDir = path.join(corpusDir, ".extracted");

const docs = await loadCorpus(corpusDir);
await mkdir(outDir, { recursive: true });

let ok = 0;
let skipped = 0;
for (const d of docs) {
  if (!d.textLayer) {
    console.log(`skip  ${d.id.padEnd(34)} (scanned — needs OCR)`);
    skipped++;
    continue;
  }
  try {
    const { text, pageCount } = await extractPdf(d.absPath);
    const chars = text.trim().length;
    await writeFile(path.join(outDir, `${d.id}.txt`), text, "utf8");
    console.log(
      `ok    ${d.id.padEnd(34)} ${String(pageCount).padStart(4)}pp ${String(chars).padStart(9)} chars  [${d.sourceType}/${d.languages.join("+")}]`,
    );
    ok++;
  } catch (e) {
    console.log(`ERROR ${d.id}: ${e instanceof Error ? e.message : String(e)}`);
  }
}
console.log(`\nExtracted ${ok} docs · skipped ${skipped} scanned → ${outDir}`);
