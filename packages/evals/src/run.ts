import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGrader, loadSuite, runSuite, type Provider, type Report } from "promptopus";
import { legalisProvider } from "./provider";
import { LEGALIS_GRADERS } from "./graders";
import { FabricatingLLM, ScriptedLLM } from "./scripted";

/**
 * Offline eval harness (Promptopus): runs the YAML suites against the REAL
 * Legalis pipeline (retrieve → synthesize → citation-validate → self-eval gate)
 * with deterministic scripted LLMs + committed fixture retrieval — zero keys,
 * CI-stable. Writes results JSON + a markdown report; exits 1 on any failure.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const suitesDir = path.join(here, "..", "suites");
const resultsDir = path.join(here, "..", "results");

// Suite YAML names a provider; we map it to a real pipeline instance here.
const PROVIDERS: Record<string, () => Provider> = {
  "legalis-scripted": () => legalisProvider("legalis-scripted", "pipeline+scripted-llm", new ScriptedLLM()),
  "legalis-fabricator": () =>
    legalisProvider("legalis-fabricator", "pipeline+fabricating-llm", new FabricatingLLM()),
};

function summarize(report: Report): { passed: number; failed: number; lines: string[] } {
  let passed = 0;
  let failed = 0;
  const lines: string[] = [];
  for (const r of report.results) {
    if (r.status !== "ok") {
      failed++;
      lines.push(`  ✗ ${r.caseId} — provider error: ${r.error?.message ?? "unknown"}`);
      continue;
    }
    for (const g of r.graderResults) {
      if (g.passed) passed++;
      else {
        failed++;
        lines.push(`  ✗ ${r.caseId} · ${g.graderId} — ${g.detail}`);
      }
    }
  }
  return { passed, failed, lines };
}

async function main(): Promise<void> {
  mkdirSync(resultsDir, { recursive: true });
  const suiteFiles = readdirSync(suitesDir).filter((f) => f.endsWith(".suite.yaml")).sort();
  let totalPassed = 0;
  let totalFailed = 0;
  const md: string[] = ["# Legalis eval report", ""];

  for (const file of suiteFiles) {
    const suite = loadSuite(path.join(suitesDir, file));
    const providers = suite.providers.map((spec) => {
      const make = PROVIDERS[spec.name];
      if (!make) throw new Error(`no provider instance registered for '${spec.name}' (${file})`);
      return make();
    });
    const report = await runSuite(suite, {
      providers,
      createGrader: (spec, deps) => {
        const custom = LEGALIS_GRADERS[spec.type];
        return custom ? custom(spec as { type: string }) : createGrader(spec, deps);
      },
    });
    writeFileSync(path.join(resultsDir, `${suite.name}.json`), JSON.stringify(report, null, 2));

    const { passed, failed, lines } = summarize(report);
    totalPassed += passed;
    totalFailed += failed;
    const badge = failed === 0 ? "✓" : "✗";
    console.log(`\n${badge} ${suite.name} — ${passed} checks passed, ${failed} failed`);
    for (const l of lines) console.log(l);

    md.push(`## ${suite.name}`, "", suite.description ?? "", "", `| case | result |`, `| --- | --- |`);
    for (const r of report.results) {
      const ok = r.status === "ok" && r.graderResults.every((g) => g.passed);
      const detail = ok
        ? "pass"
        : r.graderResults.filter((g) => !g.passed).map((g) => `${g.graderId}: ${g.detail}`).join("<br>") ||
          r.error?.message ||
          "error";
      md.push(`| ${r.caseId} | ${ok ? "✅ pass" : `❌ ${detail}`} |`);
    }
    md.push("");
  }

  md.push("---", "", `**Total: ${totalPassed} checks passed, ${totalFailed} failed.**`);
  writeFileSync(path.join(resultsDir, "report.md"), md.join("\n"));
  console.log(`\nTotal: ${totalPassed} passed, ${totalFailed} failed → ${path.relative(process.cwd(), path.join(resultsDir, "report.md"))}`);
  if (totalFailed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("[evals] fatal:", e);
  process.exit(1);
});
