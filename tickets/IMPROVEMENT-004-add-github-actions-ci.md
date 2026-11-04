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

Closure uses the user-confirmed successful push run and locally inspected audit
artifacts. The user accepted the hosted failure-upload verification limitation
for this assessment. Pull-request trigger configuration was validated statically;
no successful pull-request run is claimed.

- [x] Both Linux jobs are configured for pull requests targeting `main` and
  pushes to `main`, using Node 26 and a clean lockfile-based installation. The
  push run is user-confirmed green; the PR trigger is statically validated.
- [x] Root quality checks, frontend typecheck/unit tests/build, and Storybook
  build pass; failures fail the corresponding job.
- [x] Frontend E2E tests run against the supplied backend with JDK 25 and
  Chromium; failures fail the browser job.
- [x] The complete Storybook browser check passes, including previews and Docs;
  failures fail the browser job.
- [x] Browser failure uploads are configured after failed test steps, and local
  checks verify failure propagation and log retention. Exercising the actual
  hosted upload on a failed browser run is explicitly waived for this assessment,
  not recorded as a passed test.
- [x] Full and production audit results remain visible and informational,
  with the IMPROVEMENT-001 exceptions documented.
- [x] Workflow setup and equivalent local verification commands are documented.
- [x] Workflow YAML validation and a successful GitHub-hosted run are recorded
  in the implementation notes before marking this item complete.

## Verification

Workflow syntax, required-check failure propagation and audit error handling were
validated locally. Hosted success is based on the user's confirmation of the
linked run. Actual browser-failure upload testing is waived as stated above;
the green run does not exercise that path. Local checks alone do not establish
GitHub-hosted execution success.

## Implementation and local verification

[The workflow](../.github/workflows/ci.yml) and
[local commands](../README.md#continuous-integration) are implemented. Actionlint,
shell syntax and failure-handling checks, local quality checks, frontend checks,
Storybook build, and both browser suites passed. Separate Standards and Spec
reviews of the uncommitted changes found no issues.

## Hosted evidence and assessment closure

Implemented in commit `cbb660d38b68dbd49f5e05cf5112547a9f03b4e3`. The user pushed
the commit and confirmed that [run 41821753845](https://github.com/Http400/kyc-app/actions/runs/41821753845)
was green. Direct access to the run was unavailable to the agent, so hosted job
success is attributed to the user rather than an independent log inspection.

The user downloaded the `dependency-audits` artifact and supplied its two reports
locally. Both are valid npm audit JSON without collection errors. The full report
contains 15 affected packages (13 moderate, 2 low); production contains 5
(3 moderate, 2 low), all in the Swagger chain. There are no high/critical findings
or new advisories or affected packages relative to the accepted IMPROVEMENT-001
baseline. Counts do not represent distinct advisories.

Hosted browser-failure uploads remain untested under the explicit assessment
exception above. The PR trigger is configured and statically validated; the
reported hosted execution covers a push to `main`.
See [implementation notes](../.scratch/IMPROVEMENT-004-add-github-actions-ci/notes.md) for evidence and
limits. The temporary downloaded reports remain untracked.
