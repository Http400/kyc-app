# TICKET-003 incremental verification

Original: ../../tickets/TICKET-003-frontend-save-and-resume-form.md

Commit 1 implements API draft lookup/creation, controlled answers, partial saves, CSRF, version conflicts and accessible discard confirmation. Backend and original ticket unchanged.

Commit 2 adds document evidence upload, saved presence, refreshed versions and partial-failure recovery.

Commit 1 verification: 80 frontend tests pass; frontend typecheck, repository lint and diff whitespace checks pass.

Commit 2 verification: 81 frontend tests pass; frontend typecheck, repository lint and diff whitespace checks pass.
