# TICKET-001 verification notes

Source: [Applicant registration](../../tickets/TICKET-001-frontend-registration.md).
Plan: [Implementation plan](plan.md).

## Step 1 checkpoint

Committed as `e2337d3`: ApplicantRegistration presentation, nine registration stories,
shared TextField accessibility changes and five dedicated stories, Storybook discovery
and browser checks, and initial planning/tracking documents.

## Step 2 checkpoint — 2026-11-04

Reviewed and completed the existing uncommitted registration behavior:

- Connects the presentation to client validation and the registration mutation.
- Validates the existing password policy and exact confirmation, then revalidates
  edited fields after submission. Changing the password revalidates confirmation.
- Sends only email/password attributes with the JSON:API resource type and headers;
  treats empty-body 201 as success and never establishes an Applicant session.
- Handles multiple field errors, duplicate email, throttling, malformed documents,
  network failures, and unexpected responses. Preserves email after failure.
- Prevents concurrent submissions and explicitly disables automatic mutation retries.
- Clears form values on success and retains the accepted returnTo in the sign-in URL.

Strengthened the correction/retry test to edit both rejected credentials and
confirmation, assert accessible feedback/focus, and verify the corrected request.
Added regression coverage for invalid input making no request, password edits
invalidating confirmation, form-level failure and success focus, multiple errors
for one field, document errors, and malformed validation responses.
Tests configure global mutation retries to prove registration's retry override.

Two regressions were reproduced and fixed:

1. An oversized Retry-After integer produced an unusable delay message. Only positive,
   safely representable integer seconds are displayed; invalid/missing headers use
   the generic throttling message.
2. Whitespace-only API error details produced blank field feedback. These are ignored,
   with generic request feedback when no usable errors remain.

Verification after fixes:

- `npm run lint`: passed.
- `npm run typecheck --workspace @kyc/frontend`: passed.
- `npm run test --workspace @kyc/frontend`: 44 tests passed across four files,
  including 24 registration integration tests and eight validation tests.
- Existing Node localStorage experimental warnings do not fail the tests.

Paused at the requested step-2 checkpoint. No staging, commit, push, backend changes,
or original-ticket edits. The existing untracked E2E draft was left unchanged for
step 3; final acceptance was not performed in this step. Lifecycle remains in-progress
in tickets/STATUS.md pending review and final acceptance.

## Step 3 acceptance — 2026-11-04

Step 2 was committed as `f3bc20e`. Completed the browser test draft with:

- Real backend account creation and duplicate-email responses at 320px mobile
  and 1440px desktop widths.
- Keyboard entry through all three fields, submission, success focus, and keyboard
  activation of the sign-in link with the preserved returnTo.
- Confirmation that registration sends no session request and creates no session cookie.
- Field-error descriptions and focus, preserved email after duplicate registration,
  and no horizontal overflow in error/success states.
- A controlled browser response for pending and 429 states: busy semantics, disabled
  submit, status feedback, retry guidance, restored controls, and form-error focus.

The success and duplicate-email flows use the supplied backend; only the pending/429
scenario intercepts the response to make timing and throttling deterministic.

Final checks:

- `npm run quality`: passed, including lint, DS typecheck, dependency boundaries,
  four DS tests, and DS build.
- `npm run typecheck --workspace @kyc/frontend`: passed.
- `npm run test --workspace @kyc/frontend`: 44 tests passed.
- `npm run build --workspace @kyc/frontend`: passed, including SPA prerender.
- `npm run build-storybook`: passed.
- `npm run test:e2e --workspace @kyc/frontend`: all five browser tests passed.
- `node scripts/test-storybook.mjs`: all 29 previews, three Docs pages, manager
  iframe checks, and interactive select passed with no page errors.
- After correcting screenshot capture to wait for the initial heading, targeted
  registration E2E passed again (three tests), as did targeted ESLint.

Inspected screenshots of empty, error, and success states on mobile and desktop,
plus the pending state. Text wraps, controls remain visible, and focus outlines
are visible. Images are generated under ignored `frontend/test-results/`.
Existing axe checks passed for registration errors/success and the shared TextField.
This combines automated accessibility checks, keyboard checks, and visual inspection;
a manual screen-reader session was not performed.

### Acceptance criteria evidence

| Criterion | Evidence |
| --- | --- |
| Email, password, confirmation | Component tests and desktop/mobile browser flow. |
| Contract validation | Eight validation tests plus correction, mismatch, and no-request-on-invalid-input integration coverage. |
| JSON:API submission | Integration assertions on headers and exact request document; real backend creation. |
| Accessible failures | Integration coverage for multiple field/document errors, malformed bodies, duplicate email, throttling, network failures, and unexpected responses; browser focus and feedback checks. |
| Success without sign-in | Empty-body 201 integration coverage and real browser checks for confirmation, no session requests/cookies, and sign-in navigation. |
| Accessibility and responsiveness | Labels/error associations, keyboard order, focus transitions, busy/status semantics, axe checks, and screenshots at 320px and 1440px. |

Existing non-failing warnings remain: Node localStorage/deprecation warnings, large
bundle warnings, and the API-docs redirect route warning. No dependencies, backend
code, API contract, or original tickets were changed. All checks here were local;
no branch was pushed and no hosted CI run was triggered.

Paused at the step-3 checkpoint with the E2E test and tracking updates unstaged and
uncommitted. TICKET-001 is marked done based on the acceptance evidence above.
