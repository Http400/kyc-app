# TICKET-002 verification

Source: [Applicant login](../../tickets/TICKET-002-frontend-login.md).

Implemented JSON:API session creation with same-origin cookies, exact credentials,
201 response validation and safe local API journey navigation. The API destination
wins over returnTo. No session credential is read or stored by application code.
Required/email validation, 400 field feedback, uniform 401 errors, 429 retry guidance,
network and unexpected-response feedback preserve email. Pending requests are guarded
synchronously; controls are disabled and progress is announced outside the busy form.
Focus moves on submission feedback only, never while correcting inputs. Automatic
mutation retries are disabled. Password input is cleared on successful login.

## Verification (2026-11-04)

- Frontend Vitest: 66 tests pass across 5 files, including 20 new login cases.
- Frontend typecheck: pass.
- Repository quality: lint, UI typecheck, dependency boundaries, 4 UI tests and UI build pass.
- Frontend production build: pass (existing large Swagger chunk warning).
- Full Chromium browser suite against supplied Java backend: 7 tests pass.
  New login cases at 320px and 1440px exercise required validation, keyboard correction,
  invalid credentials, retained email, successful API-directed navigation, HttpOnly
  session and XSRF cookies, and authenticated current-application access (204 for a
  new Applicant). Existing registration browser tests also pass.
- git diff --check: pass.

Initial quality checks caught a render-time ref read, import ordering and a nested
ternary; corrected before final verification. The first browser run caught focus
moving from email to password on error correction. Added a keyboard regression test
and changed focus to run only for new submission feedback; final full suite passes.
Sandbox restrictions prevented local server binding for browser tests and build
prerendering; both were rerun successfully with approved elevated execution.

No backend, API contract or original ticket changes. Save/resume remains TICKET-003.
Implementation was verified before committing. The user subsequently authorized renaming
the notes folder and committing the implementation, tests and tracking documents.
Manual screen-reader testing and hosted CI were not performed.
