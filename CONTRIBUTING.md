# Contributing

## Ground rules

- **TypeScript strict, no `any` in core logic** (ESLint enforces it).
- `packages/contracts` is the wire format — change it deliberately, additively where possible,
  and keep the SPA + brain in the same commit.
- The trust mechanics are not optional: any change to synthesis, citation validation, or the
  judge gate must keep `pnpm eval` green, and behavior changes need a suite update in the same PR.
- The brain's `finalize-answer` stays deterministic (`@legalis/core`): models orchestrate,
  they do not write the cited answer free-hand.

## Workflow

```bash
pnpm install
pnpm typecheck && pnpm lint   # must pass
pnpm eval                     # behavior suites (offline, keyless)
pnpm eval:deep                # real-model suites over every AI call site (needs OPENAI_API_KEY;
                              # orchestrator suite needs the brain running — auto-skips otherwise)
```

Dev stack (three terminals): brain (`:4111`) → worker proxy (`:8787`) → web (`:5173`); see the
README. Commit style: `feat(scope): …` / `fix(scope): …` with meaningful bodies — the git log is
the project's narrative.

## Corpus changes

Corpus texts are verified against official versions before ingestion (see `corpus/MANIFEST.md`).
To add or correct a text: update `corpus/manifest.json`, drop the PDF under `corpus/primary/`,
re-run `pnpm ingest`, and regenerate the SPA sources page data
(`apps/web/src/pages/corpusData.ts`). Wrong-version reports take priority.

## Eval suites

Suites live in `packages/evals/suites/*.suite.yaml` (Promptopus). Custom graders are registered
in `packages/evals/src/graders.ts`; scripted/fabricating LLMs in `src/scripted.ts`; retrieval
fixtures (real corpus excerpts) in `fixtures/chunks.json`. Keep suites deterministic and keyless —
real-model suites belong behind an env-gated job, not in the default CI path.
