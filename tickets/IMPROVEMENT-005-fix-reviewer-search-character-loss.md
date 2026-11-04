# IMPROVEMENT-005: Fix reviewer search character loss

## Problem

The GitHub Actions Quality and builds job failed at commit
`fcd266f95b66e7ca74eeaf89021e5e1059cb92c3` on 2026-11-04. The reviewer route test
`keeps the complete draft and focus while navigation is pending` expected
`Ada Lovelace`, but both the URL query and search input contained `Ada Loelace`.

[Failed CI job](https://github.com/Http400/kyc-app/actions/runs/41829268311/job/126571907900).

The search synchronization in `frontend/src/routes/reviewer/applications.tsx`
can overwrite newer local input when an older navigation result renders.
An in-memory diagnostic adding 8 ms of render work reproduced character loss
in 20 of 20 runs. A trace showed the draft being reset to older loader data;
the failure also occurred with a plain input replacing the shared TextField.

This follows the synchronization change in
[IMPROVEMENT-002](IMPROVEMENT-002-fix-lint-failure.md). The failure predates
[TICKET-001 registration](TICKET-001-frontend-registration.md); the failing
commit itself changed documentation only.

## Scope

- Fix reviewer search synchronization so older navigation results cannot
  overwrite newer edits during typing.
- Preserve synchronization for direct navigation and browser back/forward,
  including empty queries, without remounting the input or losing focus.
- Preserve search/status pagination resets and active filters when paging.
- Add regression coverage for overlapping typing and navigation updates.
- Record reproduction, the chosen fix, and verification evidence in
  [the working notes](../.scratch/IMPROVEMENT-005-fix-reviewer-search-character-loss/notes.md).

## Out of scope

- Registration changes, backend changes, dependency upgrades, or unrelated
  refactoring.
- Weakening assertions, skipping the failing test, adding retries to conceal
  the race, or disabling lint rules.

## Acceptance criteria

- [x] Every typed character is preserved in the input and final URL query when
  typing overlaps navigation updates, including under slower rendering.
- [x] Direct navigation, back/forward, and clearing search synchronize the
  displayed value correctly; typing preserves input identity and focus.
- [x] Search and status changes reset pagination to page 0; paging preserves
  the active filters.
- [x] A regression test catches the race before the fix and passes afterward;
  the original failing scenario also passes under the diagnostic stress.
- [x] Frontend tests and typecheck, plus root `npm run quality`, pass without
  weakening assertions or disabling rules.
- [x] Verification results and any remaining limitations are recorded in the
  working notes, distinguishing local checks from hosted CI results.
