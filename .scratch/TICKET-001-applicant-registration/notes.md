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
