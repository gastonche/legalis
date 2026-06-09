import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { defaultCorpusDir, loadCorpus } from "../manifest";

// OCR stage for scanned (image-only) PDFs: pdftoppm → PNG per page → tesseract
// (fra+eng) → corpus/.extracted/<id>.txt, so the chunker can ingest them too.
const run = promisify(execFile);
const corpusDir = process.argv[2] ?? defaultCorpusDir();
const outDir = path.join(corpusDir, ".extracted");
await mkdir(outDir, { recursive: true });

const docs = (await loadCorpus(corpusDir)).filter((d) => !d.textLayer);
console.log(`OCR ${docs.length} scanned docs (tesseract -l fra+eng @300dpi)…`);

for (const d of docs) {
  const work = await mkdtemp(path.join(os.tmpdir(), "legalis-ocr-"));
  try {
    await run("pdftoppm", ["-png", "-r", "300", d.absPath, path.join(work, "p")], {
      maxBuffer: 1 << 27,
    });
    const pages = (await readdir(work)).filter((f) => f.endsWith(".png")).sort();
    let text = "";
    for (const pg of pages) {
      const { stdout } = await run("tesseract", [path.join(work, pg), "stdout", "-l", "fra+eng"], {
        maxBuffer: 1 << 27,
      });
      text += stdout + "\n\n";
    }
    await writeFile(path.join(outDir, `${d.id}.txt`), text, "utf8");
    console.log(`ocr  ${d.id.padEnd(30)} ${String(pages.length).padStart(3)}pp  ${text.trim().length} chars`);
  } catch (e) {
    console.log(`ERROR ${d.id}: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}
console.log("OCR complete.");
