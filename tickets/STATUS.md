# Task status

Progress statuses and update conventions are defined in
[`docs/agents/issue-tracker.md`](../docs/agents/issue-tracker.md).

Initial entries are `todo` for tracking purposes. Existing implementation has
not been assessed against the acceptance criteria during this setup.

| Ticket | Status | Summary |
| --- | --- | --- |
| [TICKET-001](TICKET-001-frontend-registration.md) | done | Registration and review follow-up implemented; progress announcement regressions, frontend tests, backend browser flows, and Storybook verified. |
| [TICKET-002](TICKET-002-frontend-login.md) | done | Login, accessible feedback and API journey navigation implemented; frontend, quality and real-backend browser checks pass. |
| [TICKET-003](TICKET-003-frontend-save-and-resume-form.md) | in-progress | Draft loading and saving implemented; remaining work: evidence upload and logout/resume verification. |
| [IMPROVEMENT-001](IMPROVEMENT-001-fix-npm-audit-vulnerabilities.md) | done | Targeted fixes verified; no critical/high findings. Assessment exceptions accepted: 15 full/5 production affected packages (production: Swagger chain), plus retained legacy-peer-deps. See ticket for rationale. |
| [IMPROVEMENT-002](IMPROVEMENT-002-fix-lint-failure.md) | done | Replaced search synchronization effect; route regressions, lint, frontend checks, and quality pass. |
| [IMPROVEMENT-003](IMPROVEMENT-003-fix-storybook-development-previews.md) | done | Previews and Docs render; cold/warm browser checks, configuration typecheck, quality, and build pass. |
| [IMPROVEMENT-004](IMPROVEMENT-004-add-github-actions-ci.md) | done | GitHub CI pass confirmed by user; audit artifacts inspected and match accepted findings. Hosted failure-upload testing waived for assessment; PR trigger validated statically. |
| [IMPROVEMENT-005](IMPROVEMENT-005-fix-reviewer-search-character-loss.md) | done | Preserved newer search edits across navigation updates; regression, 20 stress repetitions, frontend checks, and quality pass locally. Hosted CI pending. |
