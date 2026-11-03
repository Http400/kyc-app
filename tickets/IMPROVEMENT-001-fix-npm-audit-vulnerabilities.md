# IMPROVEMENT-001: Fix remaining npm dependency vulnerabilities

## Problem

Vulnerabilities remain after running `npm audit fix`. A read-only root
`npm audit --json` on 2026-11-03 reported 23 vulnerable packages: 1 critical,
2 high, 18 moderate, and 2 low. These are package counts, including packages
affected through dependencies, rather than counts of distinct advisories.

The baseline includes:

- Critical: `storybook`.
- High: `vite` and `zod`.
- Moderate: `vitest` / `@vitest/mocker`, and dependency chains involving
  `minimatch`, `glob`, ESLint, TypeScript ESLint, Storybook's React integration,
  and Swagger UI.
- Low: `deepmerge` and `swagger-ui-react`.

The audit suggests compatible updates for some direct dependencies, but also
major downgrades for others (for example, ESLint 4 and Swagger UI React 4).
Those suggestions need investigation rather than automatic application.
Re-run the audit when implementation starts; advisory data can change.

## Scope

- Audit the complete npm workspace: root tooling, `DS`, and `frontend`,
  including production, development, direct, and transitive dependencies.
- Record the starting full audit and production-only audit, trace affected
  dependency paths, and distinguish application exposure from development
  server, build, and test tooling exposure.
- Resolve findings through compatible dependency updates, upstream fixes,
  or replacement/removal of affected dependencies where necessary. Keep
  shared tooling versions compatible across workspaces.
- Update the relevant manifests and root `package-lock.json` together,
  preserving unrelated existing changes. Make only code/configuration
  adaptations required by the dependency remediation.
- Evaluate any override against the consuming packages' supported APIs and
  version constraints, and document why it is safe. Do not blindly apply
  `npm audit fix --force`, major downgrades, or cross-major overrides.
- Verify application, design system, Storybook, and developer tooling behavior.
  Record commands, results, dependency decisions, and before/after audit
  evidence in [research and implementation notes](../.scratch/IMPROVEMENT-001-fix-npm-audit-vulnerabilities/notes.md).

## Out of scope

- New product features, unrelated refactoring, and general dependency upgrades
  that are unnecessary for remediation or compatibility.
- Hiding findings by disabling auditing, raising severity thresholds, or
  excluding development dependencies from the completion audit.

## Acceptance criteria — assessment scope agreed 2026-11-04

The user approved closing this item for the recruitment assessment with the
exceptions below. The original zero-audit and strict-install targets were not
achieved; they are explicitly waived for this assessment, not recorded as passes.

- [x] Record and accept the installation limitation for this assessment:
  strict peer validation fails and `.npmrc` retains `legacy-peer-deps=true`.
  Passing runtime checks under that policy do not establish strict-install success.
- [x] Record and accept the remaining audit findings for this assessment:
  15 full-workspace and 5 production affected packages, covering two advisories.
  Auditing stays enabled and the reports remain nonzero.
- [x] `npm run quality` passes (lint, design-system typecheck, dependency
  boundaries, design-system tests, and design-system build).
- [x] Frontend checks pass: `npm run typecheck --workspace @kyc/frontend`,
  `npm run test --workspace @kyc/frontend`,
  `npm run build --workspace @kyc/frontend`, and
  `npm run test:e2e --workspace @kyc/frontend`.
- [x] `npm run build-storybook` passes, and smoke checks confirm the
  application, Storybook, and the existing Swagger UI integration still work.
- [x] Notes contain reproducible before/after audit results and explain any
  overrides, replacements, or breaking-version changes. No unrelated
  dependency or application changes are included.

## First-stage result — 2026-11-03

Applied the seven planned manifest updates and root lockfile changes:
Storybook 10.6.5, Vite 8.3.5, Vitest 4.1.12, and frontend Zod 4.6.7.
On Node 26.13.0/npm 11.20.0, full findings fell from 23 to 18 and production
findings from 6 to 5; no critical/high or newly reported findings remain.

Checked verification items passed using the existing `.npmrc` installation
policy and are diagnostic evidence, not strict-install acceptance.
Strict installation fails with ERESOLVE. Storybook builds, but local preview
smoke checks fail with a React default-export error. Application navigation,
reviewer parsing, and Swagger rendering with requests disabled passed.
See [command results and local artifact references](../.scratch/IMPROVEMENT-001-fix-npm-audit-vulnerabilities/notes.md).

## Accepted assessment exceptions

The latest recorded audits (2026-11-04) contain **15 full-workspace affected
packages** (13 moderate, 2 low) and **5 production affected packages**
(3 moderate, 2 low), with **no critical or high findings**. These are package
entries, not distinct vulnerabilities: all remaining entries trace to two
advisories. This is an assessment-specific risk decision, not a claim of zero
production exposure or approval for production deployment.

| Exception | Dependency path, exposure, and decision |
| --- | --- |
| [minimatch: GHSA-g3hv-75wg-m249](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249) | Development: ESLint/config-array, TypeScript ESLint, import-x and React lint plugin → minimatch. Production: swagger-ui-react → swagger-client → @swagger-api/apidom-reference → minimatch. The advisory describes attacker-controlled patterns at optimization level >=2; inspected lint patterns are repository-controlled. The inspected Swagger usage is in its Node file resolver; the browser resolver is disabled, and the app loads local `/openapi.json`. Observed exposure is limited, not proven universally absent. Compatible parent updates were investigated; some consumers need APIs removed by minimatch 11. Broader plugin replacements or patches are deferred for the assessment. |
| [deepmerge: GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) | Production: swagger-ui-react → swagger-client → deepmerge. The [authoritative CVE record](https://raw.githubusercontent.com/CVEProject/cvelistV5/main/cves/2026/93xxx/CVE-2026-93753.json) rejects CVE-2026-93753 as not describing a security vulnerability, while the advisory feed still reports it. No patched release was found. Accept the documented discrepancy for the assessment; no suppression or downgrade was applied. |
| Strict peer installation | The latest strict-install dry run fails with ERESOLVE at eslint-plugin-react's unsupported ESLint 10 peer contract; Swagger dependencies also have React peer limitations. The existing legacy-peer installation policy is retained as an explicit assessment exception. The unused Babel parser and DS peer mismatch were repaired; remaining compatibility work is deferred. |

All production findings originate in the Swagger chain: swagger-ui-react,
swagger-client, @swagger-api/apidom-reference, minimatch, and deepmerge. Swagger
serves developer-facing documentation, but is still shipped in the frontend;
it has not been moved out of production dependencies. Local OpenAPI input and
disabled API requests are preserved and smoke-verified, not treated as proof
that all dependency risks are unreachable.

### Deferred beyond the assessment

Revisit before production use, when accepting external documents or glob
patterns, or when compatible upstream fixes become available:

- Remediate the remaining lint and Swagger dependency paths with validated
  consumer updates, scoped adaptations, or replacements preserving behavior.
- Reconcile the deepmerge CVE/advisory-feed discrepancy.
- Resolve remaining peers, remove `legacy-peer-deps`, and verify default and
  explicit strict clean installation on Node 26.
- Refresh full/production audits and rerun quality, frontend and Storybook
  verification after further dependency changes.

The Storybook docgen chain is already remediated through the validated scoped
glob override. See the [implementation notes](../.scratch/IMPROVEMENT-001-fix-npm-audit-vulnerabilities/notes.md)
for consumer API checks, before/after evidence, and successful verification.

## Related verification issue

[IMPROVEMENT-003: Storybook previews and Docs](IMPROVEMENT-003-fix-storybook-development-previews.md)
was completed in commit `81d4ec1`. The preview failure also reproduced on the
baseline before the dependency updates. Its fixes and expanded browser checks
are retained when restoring this ticket's work.

## Restoration after IMPROVEMENT-003

Restored stash `aa00b518c172ef5fb948b86f0baff426fd644631`, retaining it as a
backup. Resolved the DS manifest and lockfile conflicts by preserving the Docs
addon and aligning it with restored Storybook 10.6.5. Vite 8.3.5, Vitest 4.1.12,
and frontend Zod 4.6.7 are restored along with the original research and evidence.

On Node 26, installation using the existing peer policy, `npm run quality`,
`npm run build-storybook`, and the maintained browser check all passed. The
browser check covers 15 previews, Docs, the manager iframe, and select interaction
with no page errors. See the appended restoration record in the linked notes.

At restoration time, audit and strict-install targets remained unmet and no
exceptions had yet been accepted. Subsequent verification and the assessment
exception decision are recorded below and in the revised acceptance criteria.

## Continuation result — 2026-11-04

Full audit findings fell from 18 to **15** affected packages; production remains
**5**. No critical/high or new findings. A validated consumer-scoped glob 14.0.3
override removes the Storybook docgen findings. Removed the unused Babel ESLint
parser and aligned private DS React peers with workspace 19.3.0.

Quality, frontend typecheck/tests/build/e2e, Storybook build, previews/Docs, and
application/Swagger smoke checks pass. Actual TypeScript docgen file discovery
and generated Button prop metadata match the baseline. Strict-install dry run
still fails on eslint-plugin-react's unsupported ESLint 10 peer contract.

Further lint and Swagger remediation is deferred beyond the assessment. See the latest
[implementation notes](../.scratch/IMPROVEMENT-001-fix-npm-audit-vulnerabilities/notes.md)
and [upstream research](../.scratch/IMPROVEMENT-001-fix-npm-audit-vulnerabilities/continuation-research.md).
The user subsequently accepted the remaining audit findings and installation
limitation for the recruitment assessment as documented above.
