# IMPROVEMENT-004: Add GitHub Actions CI

## Problem and scope

Quality, build and browser checks currently run locally. Automate the existing
checks on GitHub so reviewers can verify the assessment in a clean environment
and subsequent changes receive regression coverage.

Add one workflow for pull requests targeting `main` and pushes to `main`, with
two Linux jobs:

- **Quality and builds:** run `npm run quality`, frontend typecheck, unit tests
  and build, and `npm run build-storybook`. Root quality checks cover lint,
  dependency boundaries, and design-system typecheck, tests and build; frontend
  checks must run explicitly using the `@kyc/frontend` workspace scripts.
- **Browser tests:** run `npm run test:e2e --workspace @kyc/frontend` and the
  complete `node scripts/test-storybook.mjs` check, including previews and Docs.

Use Node 26, `npm ci`, and the committed root lockfile. Install JDK 25 for the
existing E2E runner, which starts the supplied backend, and install Playwright
Chromium with its Linux dependencies. Build the design system before consumers
need its generated output in each job.

Preserve the installation policy accepted in
[IMPROVEMENT-001](IMPROVEMENT-001-fix-npm-audit-vulnerabilities.md), including
`legacy-peer-deps=true`. Run full and production audits as informational checks:
keep their results visible without making accepted findings fail CI. Auditing
must remain enabled; report collection failures must be distinguishable from
valid reports containing findings.

Reuse the browser coverage established in
[IMPROVEMENT-003](IMPROVEMENT-003-fix-storybook-development-previews.md).

## Out of scope

- Deployment, operating-system matrices, and branch-protection changes.
- Further dependency remediation or changes to the accepted installation policy.
- A separate backend test pipeline or changes to backend business behavior.
- Application API changes.

## Acceptance criteria

- [ ] Both Linux jobs run automatically on pull requests targeting `main` and
  pushes to `main`, using Node 26 and a clean lockfile-based installation.
- [ ] Root quality checks, frontend typecheck/unit tests/build, and Storybook
  build pass; failures fail the corresponding job.
- [ ] Frontend E2E tests run against the supplied backend with JDK 25 and
  Chromium; failures fail the browser job.
- [ ] The complete Storybook browser check passes, including previews and Docs;
  failures fail the browser job.
- [ ] Browser failure diagnostics are uploaded when available, even after a
  failed test step.
- [ ] Full and production audit results remain visible and informational,
  with the IMPROVEMENT-001 exceptions documented.
- [x] Workflow setup and equivalent local verification commands are documented.
- [ ] Workflow YAML validation and a successful GitHub-hosted run are recorded
  in the implementation notes before marking this item complete.

## Verification

Validate the workflow syntax and confirm that required checks propagate failure
instead of being silently ignored. Verify artifact collection on browser failure
and distinguish informational audit findings from successful quality checks.
Record the GitHub run URL and results when the workflow is published and run.
Local checks alone do not establish GitHub-hosted execution success.

## Implementation and local verification

[The workflow](../.github/workflows/ci.yml) and
[local commands](../README.md#continuous-integration) are implemented. Actionlint,
shell syntax and failure-handling checks, local quality checks, frontend checks,
Storybook build, and both browser suites passed. Separate Standards and Spec
reviews of the uncommitted changes found no issues.

Hosted acceptance remains unverified, including actual triggers, clean Linux
installation and artifact upload. No commit or push has been performed. See
[implementation notes](../.scratch/IMPROVEMENT-004/notes.md) for verification
details, limitations and the remaining hosted check.
