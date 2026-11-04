# IMPROVEMENT-004 implementation notes

Ticket: [Add GitHub Actions CI](../../tickets/IMPROVEMENT-004-add-github-actions-ci.md).
Plan: [Implementation plan](plan.md).

## Implementation

The workflow uses independent quality/build and browser jobs on Ubuntu 24.04.
Both install through Node 26 and npm ci, respecting the existing .npmrc. The
browser job installs Temurin JDK 25 and Chromium plus Linux dependencies. Each
job builds the design system before consumers need its generated output.
Existing application, backend and verification scripts are unchanged.

Explicit Bash execution gives GitHub run steps errexit and pipefail semantics.
Frontend E2E and Storybook output is captured through tee without masking failure.
Storybook remains eligible after frontend E2E failure when browser setup succeeded.
On failure, the workflow uploads available logs and frontend/test-results traces
for seven days. Databases and backend data directories are excluded from artifacts.

Full and production audit reports run after installation, even if a later quality
check fails. Findings remain informational. Exit codes above 1, malformed/empty
JSON, npm error objects, or missing report metadata fail collection explicitly.
Both reports are attempted and retained, including when one fails. Counts are
written to the job summary, and JSON artifacts are retained for seven days. This
does not establish a zero-vulnerability result or strict peer compatibility.

Permissions are contents: read; checkout credentials are not persisted. New runs
cancel superseded runs for the same workflow/ref. Job timeouts are 20 minutes for
quality and 30 minutes for browsers. No deployment or repository settings changed.

## Local validation

Environment: macOS ARM64, Node 26.13.0, existing installed dependencies, Temurin
JDK 25 and installed Playwright Chromium. Browser/build rerun used CI=true.

| Check | Result |
| --- | --- |
| actionlint 1.7.12 on .github/workflows/ci.yml | Passed: YAML, GitHub expressions, jobs, action inputs |
| Prettier on workflow and README | Passed after formatting the new YAML |
| bash -n for every workflow run step | Passed |
| Audit step with controlled npm responses | Eight cases passed: zero findings, findings with exit 1, registry error, malformed JSON, empty output, missing metadata, invalid total type, unexpected exit 2 |
| Audit collection preservation | Both full and production attempted; both JSON files retained and summary entries written in every case |
| Browser logging pipelines with deliberate exit 7 | Both commands retained logs and propagated exit 7 under GitHub-equivalent Bash flags |
| npm run quality | Passed: lint, typecheck, boundaries, 3 design-system tests and build |
| npm run typecheck --workspace @kyc/frontend | Passed |
| npm run test --workspace @kyc/frontend | Passed: 12 tests |
| npm run build --workspace @kyc/frontend | Passed outside sandbox |
| npm run build-storybook | Passed |
| npm run test:e2e --workspace @kyc/frontend | Passed against supplied backend |
| node scripts/test-storybook.mjs | Passed: 15 previews, Docs pages, manager iframe and select interaction; no page errors |

Actionlint was downloaded from its official release into /private/tmp; no tooling
dependency or lockfile changed. ShellCheck was not installed, so shell validation
used bash -n plus execution of the actual YAML run blocks with controlled failure
inputs. The temporary test fixtures and tools are not repository deliverables.

Initial frontend prerendering failed because the sandbox prohibited opening a
local preview server (listen EPERM on ::1). The approved rerun outside the sandbox
passed, then Storybook build and both browser suites completed successfully.
Existing build-size, Node experimental and route warnings remain unchanged.

## Review

Used the implementation and code-review skills. The user explicitly requested
uncommitted review and prohibited committing/pushing, overriding the implementation
skill's commit step. The review compared tracked changes against
62eb4b671a727dd5a6c46ddf65497faa198c5dc6 and directly read new untracked files;
a committed three-dot diff alone would omit this work.

- **Standards:** no findings against AGENTS.md, README scope and the issue-tracker
  rules; no actionable baseline code smells.
- **Spec:** no findings. Triggers, dependencies, ordering, checks, diagnostics and
  audit policy match the ticket. At review time, hosted execution was pending;
  the subsequent evidence and assessment decision are recorded below.

## Hosted evidence and assessment closure

The user separately authorized commit `cbb660d38b68dbd49f5e05cf5112547a9f03b4e3`
and subsequently pushed it. The user confirmed that
[GitHub run 41821753845](https://github.com/Http400/kyc-app/actions/runs/41821753845)
was green. The unauthenticated API returned 404 and the run page could not be
fetched by the agent. Hosted success is therefore user-confirmed, not an
independent inspection of the job logs. The workflow runs both quality/build and
browser jobs, including clean npm installation and toolchain provisioning.

The user downloaded the `dependency-audits` artifact and placed `full.json` and
`production.json` in the temporary root `dependency-audits/` directory. Both files
were inspected locally: auditReportVersion is 2, no error object is present, and
the vulnerability metadata is valid.

| Report | Affected packages | Moderate | Low | High / critical |
| --- | --- | --- | --- | --- |
| Full | 15 | 13 | 2 | 0 / 0 |
| Production | 5 | 3 | 2 | 0 / 0 |

Counts and affected-package sets match the saved IMPROVEMENT-001 continuation
baseline exactly. No new advisories were found. Both reports contain the same
two advisory sources, minimatch GHSA-g3hv-75wg-m249 and deepmerge
GHSA-gcqx-w48m-w2h4. The five production entries are swagger-ui-react,
swagger-client, @swagger-api/apidom-reference, minimatch and deepmerge. Existing
audit and installation exceptions remain unchanged.

The user explicitly accepted documenting the hosted browser-failure upload
limitation for this assessment. The workflow's upload condition was reviewed,
and local checks proved that failed commands retain logs and propagate their
exit codes. Actual upload on a failed hosted browser run was not exercised and
is waived, not reported as passed. A green run cannot verify that path.

The reported hosted run covers a push to main. The pull-request trigger remains
configured and statically validated; no hosted PR execution is claimed. These
limits are recorded in the revised acceptance criteria and central status.

This closure changes documentation only. The downloaded reports are unchanged
and untracked; no additional commit or push is authorized by the closure request.

## Primary references

- [Node setup and npm caching](https://github.com/actions/setup-node)
- [Checkout options](https://github.com/actions/checkout)
- [Java setup and Maven caching](https://github.com/actions/setup-java)
- [Artifact upload and retention](https://github.com/actions/upload-artifact)
- [Playwright CI setup](https://playwright.dev/docs/ci)
- [actionlint installation](https://github.com/rhysd/actionlint/blob/main/docs/install.md)

Official action READMEs were checked for the current v7 checkout/setup-node/upload
actions and v6 setup-java inputs. Future action updates should be validated again.
