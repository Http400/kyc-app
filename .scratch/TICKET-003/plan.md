# TICKET-003 implementation

Original: ../../tickets/TICKET-003-frontend-save-and-resume-form.md

1. Draft loading and saving, controlled answers, CSRF and explicit failure recovery.
2. Document evidence upload and refreshed version, including partial failures.
3. Logout, cache clearing and real-backend resume coverage.

Include tests with each change. Save permits partial drafts; navigation retains presence checks. Preserve edits on failure, confirm discard on navigation/reload, never silently merge conflicts. No browser-persisted answers, backend changes or submission implementation. Run frontend tests, typecheck, build, quality and E2E. Leave uncommitted until explicitly authorized.
