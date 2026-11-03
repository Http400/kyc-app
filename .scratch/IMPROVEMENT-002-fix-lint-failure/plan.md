# IMPROVEMENT-002 implementation plan

Task: [Fix the npm lint failure](../../tickets/IMPROVEMENT-002-fix-lint-failure.md).

1. Add memory-router tests around the real route and loader for URL/history synchronization, typing during pending navigation, filter changes, and pagination.
2. Replace the synchronous effect with a guarded render-time adjustment of local draft state when loader `q` changes. Preserve input identity and existing navigation semantics.
3. Run focused tests, root lint, frontend tests and typecheck, and root quality checks.
4. Record results and update the central ticket status. Leave changes uncommitted.
