# IMPROVEMENT-005 notes

Task: [Fix reviewer search character loss](../../tickets/IMPROVEMENT-005-fix-reviewer-search-character-loss.md).

## CI evidence — 2026-11-04

- [Quality and builds job](https://github.com/Http400/kyc-app/actions/runs/41829268311/job/126571907900)
  checked out `fcd266f95b66e7ca74eeaf89021e5e1059cb92c3` on `main`.
- Environment: Ubuntu 24.04.5, Node v26.13.0, npm 11.20.0, Vitest 4.1.12.
  Local Node/npm versions matched.
- Frontend result: 1 failed and 11 passed. The failing test was
  `Reviewer applications route > keeps the complete draft and focus while navigation is pending`.
- Expected query: `{ q: 'Ada Lovelace', status: 'all', page: '0' }`.
  Received query: `{ q: 'Ada Loelace', status: 'all', page: '0' }`.
  The DOM dump showed the same shortened value in the input.
- The user supplied `failed-ci-logs.txt` after unauthenticated access to the
  job failed. It remains an untracked local artifact; the relevant evidence is
  captured here so this note does not depend on committing that log.

## Diagnosis

The affected route and test were unchanged between the failing commit and
registration branch HEAD `42c523c`, where the local probes were performed.
The failing commit itself changed documentation, not the reviewer code.

Initial normal-speed attempts passed: 20 separate focused test invocations,
100 focused repetitions in one Vitest process, and 10 full frontend-suite runs.
Those passes did not resolve the CI failure.

An in-memory Vite transform added 8 ms of synchronous work to each
`ReviewerApplicationsView` render and repeated the original failing test.
All 20 repetitions failed with character loss. The exact missing characters
varied from CI (for example, `Ada oeae`); the same final query assertion failed.
The probe changed neither tracked source files nor dependencies.

Ranked hypotheses were stale route data overwriting the draft, a shared
TextField issue, and incorrect test keyboard events. Targeted tracing showed:

1. The test dispatched the requested characters, including `v`.
2. Input handlers received new values and updated local state.
3. The guard `search.loaderQuery !== q` reset the draft to an older loader query
   during an overlapping render; for example, `Ada L` was reset to `Ada `.
4. Later keystrokes used the shortened value, which propagated into the URL.

Replacing only the search TextField with a native controlled input in memory
still reproduced the failure under the same render delay. This isolates the
route synchronization as the cause; the shared component is not required for
the failure. No manual browser reproduction has been performed.

The guarded synchronization was introduced by
`b8c6c8a fix(IMPROVEMENT-002): fix reviewer search synchronization lint error`.
See [IMPROVEMENT-002 notes](../IMPROVEMENT-002-fix-lint-failure/notes.md).

## Reproduction command

From the repository root, this diagnostic runs the affected test with the
render delay applied in memory. A single traced run failed in about 2.6 seconds.
The delay is diagnostic instrumentation, not a proposed production change or
the final regression-test design.

```bash
DEBUG_PRINT_LIMIT=0 node --input-type=module <<'JS'
import { startVitest } from 'vitest/node'
const runner = await startVitest('test', ['src/routes/reviewer/-applications.test.tsx'], {
  root: process.cwd() + '/frontend',
  run: true,
  testNamePattern: 'keeps the complete draft',
  reporters: ['dot'],
}, {
  plugins: [{
    name: 'reviewer-render-timing-probe',
    enforce: 'pre',
    transform(source, id) {
      if (!id.endsWith('/reviewer/applications.tsx')) return
      return source.replace(
        '  const { result } = response',
        '  const diagnosticStart = performance.now(); while (performance.now() - diagnosticStart < 8) {}\n  const { result } = response',
      )
    },
  }],
})
await runner.close()
JS
```

## Next work and checkpoint

- Design synchronization that preserves newer edits while accepting deliberate
  direct and history navigation. The implementation approach is not yet chosen.
- Add a regression at the route boundary that exercises overlapping updates,
  then verify the fix against both that test and the original stress scenario.
- Preserve the existing navigation, focus, filtering, and pagination coverage.
- Run frontend tests/typecheck and root quality checks; record actual results.

Only the ticket, these notes, and the status entry are being created at this
checkpoint. No fix, test changes, commits, or pushes are included.

## Implementation and verification — 2026-11-04

Continued on `fix/IMPROVEMENT-005-reviewer-search-character-loss`, branched from
`main` at `fcd266f`. Registration remains on its separate branch.

### Regression before the fix

Added a controlled-overlap route test using the real memory router. A test-only
Suspense gate holds the render for `Ada Lov`; a second loader is held after
typing `e`. Releasing the older render must leave the input at `Ada Love`.
This exercises the actual route boundary without wall-clock delays or mocking
the synchronization implementation.

```bash
DEBUG_PRINT_LIMIT=0 npm test --workspace @kyc/frontend -- src/routes/reviewer/-applications.test.tsx -t 'preserves a newer edit'
```

Before the fix: failed in 203 ms of test execution, with expected input
`Ada Love` and received input `Ada Lov`. The same test passes after the fix and
also verifies continued typing to `Ada Lovelace`, final URL, focus, and input
identity.

### Changes

- Local navigation history state carries a component source identifier and
  monotonically increasing edit revision. The route acknowledges location keys
  and preserves newer drafts when an older local navigation renders. Latest
  results still use the parsed loader query; direct navigation and history
  traversal restore the selected entry's query.
- Metadata stays in history state; URL query parameters and backend contracts
  are unchanged. No shared DS components were added or changed.
- Clearing search and status previously invoked two callbacks that could issue
  competing navigations with stale values. A single `onClearFilters` callback
  now clears search/status and resets pagination atomically. The route test
  verifies the cleared URL and one-step history restoration.
- Additional coverage checks back/forward through locally edited queries,
  clearing the input, direct navigation after editing, and preserved focus.
  Existing filter and pagination tests remain intact.

### Verification

- `npm run format`: passed.
- `npm test --workspace @kyc/frontend`: 15 tests passed across two files,
  including 11 reviewer tests.
- `npm run typecheck --workspace @kyc/frontend`: passed.
- `npm run quality`: passed, including lint, UI typecheck, dependency checks,
  all three DS tests, and the UI build. An initial duplicate React import in the
  new test failed lint; it was consolidated before the successful run.
- The original in-memory 8 ms render-delay probe, repeated 20 times: all
  20 passed, versus 20 failures before the fix. The controlled-overlap regression
  also passed under that delay (21 checks total).
- `git diff --check`: passed. No debug logging or artificial render delay is
  present in application or test source. Diagnostic transforms only ran in memory.

All verification above is local. Hosted CI and manual browser testing have not
been performed for this fix. The existing Node localStorage warning remained
non-failing. No retries, weakened assertions, or disabled lint rules were added.

Paused after implementation and verification with changes unstaged and
uncommitted. The user-supplied `failed-ci-logs.txt` remains untracked and unchanged.
