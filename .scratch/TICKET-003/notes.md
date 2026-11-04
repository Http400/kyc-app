# TICKET-003 verification

Original: [Save and resume Applicant form](../../tickets/TICKET-003-frontend-save-and-resume-form.md).

Implemented current-draft lookup and explicit creation, controlled two-step answers, partial Save, versioned JSON:API writes with CSRF, confirmed success and accessible pending/error feedback. Failed writes retain edits. Conflicts require confirmed reload; expired sessions explain unsaved-value loss before sign-in. In-app navigation and logout use an accessible discard dialog; browser departures use beforeunload.

Evidence uses a separate bounded JPG/PNG upload. Answer save precedes upload; upload success is followed by a form refresh to obtain the new version. Partial failures explicitly distinguish persisted answers from unfinished document operations. Logout revokes the session and clears cached state; login clears previous applicant queries before navigation.

## Verification

- Frontend Vitest: 84 tests across 7 files pass, including request contracts, field filtering/clears, error statuses, malformed responses, retained edits, retry, conflict reload confirmation, duplicate prevention, logout cancellation and previous-applicant cache removal.
- Frontend typecheck: pass.
- Frontend production build: pass, including prerender. Required sandbox escalation for the temporary local preview server; existing Swagger chunk-size warning remains.
- Root quality: pass (lint, design-system typecheck, dependency boundaries, 4 design-system tests and build). Subsequent changed files individually linted with ESLint.
- Full Chromium E2E against Java backend: 9 pass. New flows at 320px and 1440px save an incomplete draft, log out and in, restore all text answers and consent, upload evidence, and restore its presence. Mobile flow additionally forces upload failure and verifies retained answers and successful retry.
- Existing layout test now supplies an API fixture with a real UUID instead of visiting the retired prototype ID.
- git diff --check: pass. Original tickets, backend sources and OpenAPI contract unchanged.

No manual screen-reader audit or hosted CI run was performed. Final review/submission remains the pre-existing prototype and is outside this ticket. User authorized three commits: draft persistence, evidence, and logout/resume verification. Intermediate snapshots were reconstructed and tested independently; final implementation files match the pre-split backup.

## Commit split verification

- First snapshot: 80 frontend tests, typecheck and lint passed.
- Second snapshot: 81 frontend tests, typecheck and lint passed.
- Final code restored byte-for-byte from the completed implementation backup.
- Final snapshot rechecked: 84 frontend tests, typecheck, lint and diff whitespace checks pass. The previously passing 9 browser tests and production build apply to the identical restored implementation.
