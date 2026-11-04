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

## Review fixes

Addressed all three functional review findings and the retained autocomplete gap. Failed post-upload refresh now freezes editing and offers a GET-only retry, displays the latest persisted answers, and never automatically PATCHes or advances. Logout signals successful revocation before clearing queries/navigating so the already-confirmed departure bypasses the dirty blocker; failed logout preserves edits and the blocker. Continue/Save and review check required controls, announce missing fields and focus the first invalid input; partial Save remains permissive. Added personal/contact/residential input-purpose tokens.

Regression tests cover another tab changing answers during refresh failure (including repeated refresh failure and no extra PATCH/upload), successful dirty logout after one confirmation, logout failure/retry and retained navigation protection, and partial Save versus incomplete navigation. Browser journeys now additionally verify empty required fields, consent, missing evidence, first-invalid focus, autocomplete metadata and confirmed dirty logout at 320px and 1440px. Initial browser run exposed suppressed native invalid-field focus; explicit focus/announcement fixed it.

Final verification: 88 frontend tests in 7 files, frontend typecheck, repository lint, production build/prerender and all 9 Chromium E2E tests pass. git diff --check passes. Existing Swagger chunk-size warning remains. No manual screen-reader audit or hosted CI run performed.

Original tickets, backend and API contract remain unchanged. The existing three commits are preserved; the user authorized a follow-up commit containing the review fixes and scratch-directory rename. Optional naming, answer-type and shared-decoder cleanup remains deferred as agreed.
