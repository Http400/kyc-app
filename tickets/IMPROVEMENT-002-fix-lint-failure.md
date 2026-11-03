# IMPROVEMENT-002: Fix the npm lint failure

## Problem

Running `npm run lint` from the repository root on 2026-11-03 exits with
code 1 and reports one error and zero warnings:

- File: `frontend/src/routes/reviewer/applications.tsx`, line 438.
- Rule: `react-hooks/set-state-in-effect`.
- Offending code: `useEffect(() => setSearchValue(q), [q])`.
- Diagnostic: calling setState synchronously within an effect can trigger
  cascading renders.

The route initializes local search state from loader data, then synchronizes
it through an effect. The lint failure also prevents `npm run quality` from
advancing past its lint step.

## Scope

- Reproduce the failure and revise the route's search-state synchronization
  to satisfy the existing React Hooks rule without changing user-visible
  search, status-filter, or pagination behavior.
- Keep the displayed search value consistent with URL/loader changes,
  including direct navigation and browser back/forward navigation.
- Add or update focused regression coverage for the affected route behavior,
  including synchronization after navigation and interaction between search,
  status, and pagination.
- Record the cause, chosen approach, and verification results in
  `.scratch/IMPROVEMENT-002/notes.md` when implementation begins.

## Out of scope

- Disabling or suppressing the rule, weakening lint configuration, excluding
  the affected file, or changing scripts to hide the failure.
- Unrelated refactoring, feature changes, or dependency upgrades. Dependency
  vulnerability remediation is tracked separately in
  [IMPROVEMENT-001](IMPROVEMENT-001-fix-npm-audit-vulnerabilities.md).

## Acceptance criteria

- [ ] Root `npm run lint` exits with code 0 and reports no errors or warnings
  across its existing `DS` and `frontend` scope.
- [ ] The synchronous state-setting effect is replaced with an approach that
  satisfies `react-hooks/set-state-in-effect` without lint suppression or
  deferring the same update solely to bypass the rule.
- [ ] Search input remains usable while typing, and URL/loader updates from
  direct navigation and browser back/forward navigation are reflected in the
  displayed search value without stale values or navigation loops.
- [ ] Search and status changes still reset pagination to page 0; page changes
  preserve the active search and status filters.
- [ ] Focused regression tests verify the affected route behavior, and
  `npm run test --workspace @kyc/frontend` and
  `npm run typecheck --workspace @kyc/frontend` pass.
- [ ] `npm run quality` passes, with verification results recorded in the
  ticket notes.
