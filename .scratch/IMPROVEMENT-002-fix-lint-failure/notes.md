# IMPROVEMENT-002 notes

Task: [Fix the npm lint failure](../../tickets/IMPROVEMENT-002-fix-lint-failure.md).

## Diagnosis

- Root `npm run lint` exits 1 with one error and zero warnings: `react-hooks/set-state-in-effect` at applications.tsx:438.
- Minimized command `./node_modules/.bin/eslint frontend/src/routes/reviewer/applications.tsx` reproduces the same diagnostic.
- Existing focused suite passes all 5 tests, but tests presentation callbacks rather than route navigation.
- The cause is the synchronous effect copying loader `q` into local search state after commit. The exact lint diagnostic makes speculative hypotheses and instrumentation unnecessary; these skill phases are intentionally skipped.
- Retain immediate local editing and track the loader query alongside it; adjust both during render only when that query changes. This avoids cascading commits and remounting the input.
- Behavioral regression tests can pass before the fix; lint is the red signal for this defect.

## Implementation and verification

- Replaced the effect with a guarded render-time update of `{ loaderQuery, value }`. Input changes still update the draft immediately; changed loader queries reset it before children commit. Input identity is preserved.
- Added three route tests using a memory router and the real client loader, with multi-page response fixtures. They cover direct navigation, back/forward and empty queries, full typing and focus during pending navigation, and search/status/page interaction.
- All 8 focused tests passed before the implementation change. The original lint diagnostic supplied the failing signal, without fabricating a behavioral failure.
- `npm run test --workspace @kyc/frontend`: passed, 12 tests across 2 files, including the 8 reviewer tests.
- `npm run typecheck --workspace @kyc/frontend`: passed. An initial test fixture narrowing error was corrected with `satisfies` before the successful run.
- `npm run quality`: passed, including root `npm run lint` (zero errors/warnings), UI typecheck, dependency checks, 3 UI tests, and UI build. An initial new-test `prefer-const` finding was fixed before this successful run.
- `git diff --check`: passed.
- Environment limitation: available Node is v22.14.0 rather than package.json's required Node 26. React Router printed its minimum-version warning during typecheck; the command nevertheless exited 0. No dependency or runtime changes were made.
- No debug instrumentation or temporary prototypes were introduced. Changes remain uncommitted.
