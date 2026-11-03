## Agent skills

Original tickets TICKET-001, TICKET-002, and TICKET-003 in `tickets/` are
read-only: never edit, rename, or delete them.

Before managing tickets, plans, or progress, read `docs/agents/issue-tracker.md`.
Before triaging, read `docs/agents/triage-labels.md`.
Before working on domain concepts, read `docs/agents/domain.md`.

## Git commits

Create commits only after the user explicitly requests or confirms
a commit. Invoking an implementation skill alone does not authorize
one. Otherwise, report changes and verification results and leave
the work uncommitted.

Use commit messages in this format:
`<type>(<ticket-ID>): <short description>`

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`.
Example: `feat(TICKET-001): implement applicant registration`

Omit the ticket scope when no ticket applies. Add an optional body
when the change needs explanation. Keep commits focused and exclude
unrelated changes.
