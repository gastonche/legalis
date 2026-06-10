import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGrader, loadSuite, runSuite, type Provider, type Report } from "promptopus";
import { LEGALIS_GRADERS } from "./graders";
import { gateProvider, orchestratorProvider, plannerProvider, realRetrieval } from "./deep/providers";

/**
 * DEEP model evals: real models over every AI call site — the planner
 * classification, synthesis + the judge gate (multi-model comparison,
 * LLM-as-judge faithfulness/quality), and the live orchestrator's decisions.
 * Env-gated: needs OPENAI_API_KEY; the orchestrator suite needs the brain
 * running. View any result interactively: `npx promptopus view <results.json>`.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(here, "..", "..", "..");
const suitesDir = path.join(here, "..", "suites", "deep");
const resultsDir = path.join(here, "..", "results");

/** Load apps/brain/.env (where the keys live) without overriding the shell env. */
function loadBrainEnv(): void {
  const envPath = path.join(repoRoot, "apps", "brain", ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=["']?([^"'\n]*)["']?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const BRAIN_URL = (): string => process.env.BRAIN_URL ?? "http://127.0.0.1:4111";

async function brainUp(): Promise<boolean> {
  try {
    const res = await fetch(`${BRAIN_URL()}/api/health`, { signal: AbortSignal.timeout(4000) });
    return res.ok;
  } catch {
    return false;
  }
}

function providerFor(name: string, model: string | undefined): Provider {
  if (name.startsWith("planner-")) return plannerProvider(name, model ?? "gpt-4o-mini");
  if (name.startsWith("gate-")) return gateProvider(name, model ?? "gpt-4o-mini");
  if (name === "orchestrator-live") return orchestratorProvider(name, BRAIN_URL());
  throw new Error(`no deep provider registered for '${name}'`);
}

function summarize(report: Report): { passed: number; failed: number; lines: string[] } {
  let passed = 0;
  let failed = 0;
  const lines: string[] = [];
  for (const r of report.results) {
    if (r.status !== "ok") {
      failed++;
      lines.push(`  ✗ ${r.caseId} [${r.providerName}] — provider error: ${r.error?.message ?? "unknown"}`);
      continue;
    }
    for (const g of r.graderResults) {
      if (g.passed) passed++;
      else {
        failed++;
        lines.push(`  ✗ ${r.caseId} [${r.providerName}] · ${g.graderId} — ${g.detail.slice(0, 160)}`);
      }
    }
  }
  return { passed, failed, lines };
}

async function main(): Promise<void> {
  loadBrainEnv();
  if (!process.env.OPENAI_API_KEY) {
    console.log("[deep-evals] OPENAI_API_KEY not set — deep model evals skipped (the keyless suites run via `pnpm eval`).");
    return;
  }
  const { real } = realRetrieval();
  console.log(`[deep-evals] retrieval: ${real ? "REAL local corpus index (e5)" : "committed fixtures (no local index)"}`);
  const orchestratorAvailable = await brainUp();
  if (!orchestratorAvailable)
    console.log(`[deep-evals] brain not reachable at ${BRAIN_URL()} — the orchestrator suite will be skipped.`);

  mkdirSync(resultsDir, { recursive: true });
  let totalPassed = 0;
  let totalFailed = 0;
  const md: string[] = ["# Legalis DEEP eval report (real models)", ""];

  for (const file of readdirSync(suitesDir).filter((f) => f.endsWith(".suite.yaml")).sort()) {
    const suite = loadSuite(path.join(suitesDir, file));
    if (suite.name === "deep-orchestrator" && !orchestratorAvailable) {
      md.push(`## ${suite.name}`, "", "_Skipped — brain not running._", "");
      continue;
    }
    console.log(`\n▶ ${suite.name} (${suite.cases.length} cases × ${suite.providers.length} providers)`);
    const providers = suite.providers.map((spec) => providerFor(spec.name, spec.model));
    const report = await runSuite(suite, {
      providers,
      concurrency: suite.name === "deep-orchestrator" ? 1 : 2,
      onEvent: (e) => {
        if (e.type === "cell") console.log(`  · ${e.caseId} [${e.providerName}] ${e.status === "ok" ? "done" : `ERROR: ${e.error}`}`);
      },
      createGrader: (spec, deps) => {
        const custom = LEGALIS_GRADERS[spec.type];
        return custom ? custom(spec as { type: string }) : createGrader(spec, deps);
      },
    });
    const outFile = path.join(resultsDir, `${suite.name}.json`);
    writeFileSync(outFile, JSON.stringify(report, null, 2));

    const { passed, failed, lines } = summarize(report);
    totalPassed += passed;
    totalFailed += failed;
    console.log(`${failed === 0 ? "✓" : "✗"} ${suite.name} — ${passed} checks passed, ${failed} failed`);
    for (const l of lines) console.log(l);

    md.push(`## ${suite.name}`, "", suite.description ?? "", "");
    for (const p of report.providers) {
      md.push(
        `**${p.providerName}** (${p.model}) — pass rate ${(p.passRate * 100).toFixed(0)}% · p50 ${Math.round(p.latency.p50Ms / 1000)}s · p95 ${Math.round(p.latency.p95Ms / 1000)}s`,
      );
    }
    md.push("", `| case | provider | result |`, `| --- | --- | --- |`);
    for (const r of report.results) {
      const ok = r.status === "ok" && r.graderResults.every((g) => g.passed);
      const detail = ok
        ? "pass"
        : r.graderResults.filter((g) => !g.passed).map((g) => `${g.graderId}: ${g.detail.slice(0, 110)}`).join("<br>") ||
          r.error?.message ||
          "error";
      md.push(`| ${r.caseId} | ${r.providerName} | ${ok ? "✅ pass" : `❌ ${detail}`} |`);
    }
    md.push("", `View interactively: \`npx promptopus view packages/evals/results/${suite.name}.json\``, "");
  }

  md.push("---", "", `**Total: ${totalPassed} checks passed, ${totalFailed} failed.**`);
  writeFileSync(path.join(resultsDir, "deep-report.md"), md.join("\n"));
  console.log(`\nTotal: ${totalPassed} passed, ${totalFailed} failed → packages/evals/results/deep-report.md`);
  console.log(`Dashboard: npx promptopus view packages/evals/results/deep-gate.json`);
  if (totalFailed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("[deep-evals] fatal:", e);
  process.exit(1);
});
