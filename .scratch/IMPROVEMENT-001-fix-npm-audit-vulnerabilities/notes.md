# IMPROVEMENT-001: Research evidence

Ticket: [Fix remaining npm dependency vulnerabilities](../../tickets/IMPROVEMENT-001-fix-npm-audit-vulnerabilities.md)

Plan: [Stage the confirmed dependency fixes](plan.md)

Raw reports under `evidence/` and the investigation scripts `smoke.mjs` and
`check-docgen.mjs` are local artifacts excluded from Git. References to them
below identify files retained in the working copy; they are not available in a
fresh checkout. This document records the commands, results and conclusions.

## Assessment exception decision — 2026-11-04

The user approved the closure plan for the recruitment assessment, including
both remaining audit findings and the installation limitation. Targeted fixes
and application/tooling verification are complete for this agreed scope.
Original zero-audit and strict-install goals remain technically unmet and are
waived for this assessment; they are not reported as passed.

- Last recorded audits: 15 full affected packages (13 moderate, 2 low),
  5 production (3 moderate, 2 low); no critical/high findings. All five
  production entries are in Swagger's dependency chain. These entries
  represent the minimatch and deepmerge advisories, not 15 distinct issues.
- minimatch: inspected lint patterns are repository-controlled; Swagger's
  inspected use is its Node file resolver, disabled in the browser. The app
  uses local OpenAPI documentation with requests disabled. This supports
  limited observed exposure, not a guarantee of no production impact.
- deepmerge: the CVE is rejected in the authoritative record, but the audit
  feed continues reporting it. The discrepancy is accepted for the assessment.
- Strict peer validation still fails; `.npmrc` retains `legacy-peer-deps=true`.
  Its acceptance is a maintenance/installation exception, separate from
  vulnerability exposure. Passing checks under this policy are not evidence
  of strict clean-install compatibility.

See the [ticket's exception rationale](../../tickets/IMPROVEMENT-001-fix-npm-audit-vulnerabilities.md#accepted-assessment-exceptions)
for advisory sources, dependency paths, attempted remedies and deferred work.
Reassess before production use, when external documents/patterns are accepted,
or when compatible upstream fixes become available. No additional migrations,
audit suppression, commits or stash removal are part of this closure.

The historical records below describe the decisions and results at each earlier
stage; their previous non-acceptance statements are superseded by this decision.
Raw audit reports, test logs, research and the stash are preserved unchanged.
Lifecycle status remains centralized in `tickets/STATUS.md`.

## Research record — 2026-11-03

The user invoked the research skill to refresh audits, trace dependency
chains, investigate primary sources, and propose the smallest compatible
changes. Research was read-only. The user selected **Stage safe fixes**:
apply confirmed updates first in a later implementation, document remaining
blockers, and keep the ticket open without accepting exceptions.

These notes preserve the investigation from the conversation. Full audit
JSON was returned by the commands but was not saved as a separate file during
Plan mode. The tables below are summaries, not substitutes for fresh raw
before/after audit evidence at implementation time. No dependency update,
clean install, build, test, or browser smoke check was performed in research.

The full folder name is the user's explicit choice and supersedes the shorter
`.scratch/IMPROVEMENT-001/` path mentioned in the ticket. Lifecycle status
remains in `tickets/STATUS.md`.

## Commands and baseline results

Run from the repository root:

```sh
node --version
npm --version
npm audit --json
npm audit --omit=dev --json
npm ls storybook @storybook/react-vite swagger-ui-react swagger-client deepmerge minimatch glob vite vitest @vitest/mocker zod eslint typescript-eslint --all
npm ls --all --json
npm ls react react-dom --all
npm explain tree-sitter
```

- Runtime: Node `v22.14.0`, npm `10.9.2`; the root manifest requires Node
  `^26.0.0`. Only Node `v22.14.0` was found in the local nvm installation.
- Initial sandboxed audit requests failed with registry DNS errors. Retried
  with network approval; both audits returned reports and exit code 1 due
  to findings.
- Full audit: **23 affected packages** — 1 critical, 2 high, 18 moderate,
  2 low. Production-only audit: **6 affected packages** — 1 high, 3 moderate,
  2 low. These are affected package counts, not distinct advisory counts.
- `npm ls` reported peer problems, including ESLint and React, plus optional
  tree-sitter and extraneous/missing native WASM package entries. A clean
  installation is required to distinguish residual installation artifacts
  from persistent dependency problems.
- Repository status was clean at the end of research. Saving these documents
  is separate from implementing the remediation.

Production findings were `zod`, `minimatch`, `@swagger-api/apidom-reference`,
`swagger-client`, `deepmerge`, and `swagger-ui-react`.

## Traced dependency paths and exposure

| Installed dependency path | Finding and exposure |
| --- | --- |
| DS → `storybook@10.6.0` | Critical origin-validation/code-injection finding and high development-server finding; development exposure, not the built Storybook site. |
| Root/frontend → `vite@8.3.0` | Development-server/editor integration and filesystem access findings. Also shared by React Router development tooling and Storybook. |
| Root/frontend → `vitest@4.1.11` → `@vitest/mocker@4.1.11` | Test-tooling redirect/path-traversal findings; exploitability depends on use and reachability of affected mocker plugins. |
| Frontend → `zod@4.1.12` | Production dependency with collection-validation resource-exhaustion finding. Observed usage is the scalar reviewer-search schema in `frontend/src/routes/reviewer/applications.tsx`; this inspection does not establish universal non-exploitability. |
| Root → ESLint `10.11.0` / `@eslint/config-array@0.23.5` / import-x `4.17.1` / TypeScript ESLint `8.71.0` → `minimatch@10.2.6` | Lint/configuration glob processing; repository-controlled patterns in inspected configuration. |
| Root → `eslint-plugin-react@7.37.5` → `minimatch@3.1.5` | Legacy minimatch API consumer included by the advisory's broad affected range. |
| DS → `@storybook/react-vite@10.6.0` → `@joshwooding/vite-plugin-react-docgen-typescript@0.7.0` → `glob@13.0.6` → `minimatch@10.2.6` | Storybook documentation/build tooling. The installed plugin uses `globSync`; the glob advisory describes cancellation behavior, so affected-package presence alone does not prove this call path is exploitable. |
| Frontend → `swagger-ui-react@5.33.0` → `swagger-client@3.38.4` → `@swagger-api/apidom-reference@1.13.3` → `minimatch@10.2.6` | Production dependency chain; the inspected minimatch use is the Node file resolver. The application loads a local `/openapi.json` in the browser. |
| Frontend → `swagger-ui-react@5.33.0` → `swagger-client@3.38.4` → `deepmerge@4.3.1` | npm still reports prototype poisoning, despite the associated CVE's rejection. |

The Swagger route dynamically imports Swagger UI, reads `/openapi.json`, and
sets `supportedSubmitMethods={[]}`. Its existing e2e test checks the page
heading, Swagger title, and successful OpenAPI fetch. Disabling requests is
an existing application behavior, not proof that every dependency finding
is unreachable.

## Confirmed candidates and primary sources

Registry metadata was queried with `npm view <package>@<version>` for
versions, dependencies, engines, and peers. Exact versions below are research
candidates, not verified installations.

| Proposed update | Compatibility evidence and source |
| --- | --- |
| `storybook` and `@storybook/react-vite` → `10.6.5` together | Advisory fixes begin at `10.6.2`; registry metadata for react-vite `10.6.5` accepts React 19, Vite 8, and Storybook `^10.6.5`. [Origin advisory](https://github.com/storybookjs/storybook/security/advisories/GHSA-f2ph-cmg5-wxc8), [local-network advisory](https://github.com/storybookjs/storybook/security/advisories/GHSA-px85-f4q5-jh77). |
| Root/frontend Vite → `8.3.5` | Audit affected range is `8.3.0`–`8.3.2`; the inspected React Router dev `8.4.0` accepts Vite 7 or 8. [Advisory](https://github.com/advisories/GHSA-587h-7wmj-h5pm), [release](https://github.com/vitejs/vite/releases/tag/v8.3.5). |
| Root/frontend Vitest → `4.1.12` | Registry metadata pins mocker and other Vitest internals to `4.1.12` and accepts Vite 6, 7, or 8. [Upstream traversal advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-xp26-3454-mjgp). |
| Frontend Zod → `4.6.7` | Patched range starts at `4.6.6`; `4.6.7` is also already installed for the lint tooling's separate Zod dependency. [Advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). |

Storybook's security patch changes development-server network/origin
behavior. Check previews locally without enabling insecure compatibility
flags. The installed configuration has no addons or remote composition.

## Why the other findings need separate work

### minimatch and glob

[The minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249)
lists versions below `11.0.1` as affected. Its described amplification occurs
with advanced pattern optimization. The
[version 11 changelog](https://raw.githubusercontent.com/isaacs/minimatch/v11.0.1/changelog.md)
removes `makeRe`, changes `Minimatch.set` from regular expressions to matcher
objects, and removes other methods. Earlier majors also differ in export
shape.

Inspected consumers provide concrete reasons against a blanket override:

- import-x imports `makeRe` for `no-internal-modules`.
- eslint-plugin-react calls the CommonJS minimatch export as a function.
- glob 13 processes minimatch pattern internals that changed in version 11.

Registry checks found ESLint `10.14.0` still depending on minimatch
`^10.2.6`, TypeScript ESLint `8.72.1` using typescript-estree with minimatch
`^10.2.2`, and import-x `4.17.1` accepting only minimatch 9/10. Updating those
parents to the researched latest versions does not resolve the finding.

[The glob advisory](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4)
lists `14.0.2` as patched. Registry metadata for `glob@14.0.3` requires
minimatch `^11.0.2`. However, Storybook `10.6.5` still requests docgen plugin
`^0.7.0`, and even docgen plugin `0.9.0` declares glob `^13.0.6`. A parent
update therefore does not provide an in-range fix. A narrowly scoped glob
override may be investigated later; it has not been validated.
[Glob migration changes](https://raw.githubusercontent.com/isaacs/node-glob/v14.0.2/changelog.md)
must be checked against actual consumers before adopting it.

### Swagger and deepmerge

Registry queries found Swagger UI React `5.34.1` still using swagger-client
`^3.38.4`; swagger-client `3.38.4` uses deepmerge `~4.3.0` and API DOM reference
`^1.12.1`. API DOM reference `1.13.3` uses minimatch `^10.2.6`. A Swagger minor
update alone therefore does not remove these paths.

npm's [deepmerge advisory](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)
was present in both refreshed reports. The
[CVE program record](https://raw.githubusercontent.com/CVEProject/cvelistV5/main/cves/2026/93xxx/CVE-2026-93753.json)
records CVE-2026-93753 as rejected on 2026-11-02 because it does not describe
a security vulnerability. This is an advisory-feed discrepancy; recheck it
at implementation time. It is not permission to suppress the audit or accept
an exception. Do not downgrade Swagger to the audit-suggested `4.1.3`.

### Peer validation and runtime

The root `.npmrc` sets `legacy-peer-deps=true`. Inspected manifests and
`npm ls` show:

- ESLint `10.11.0` is outside the peers of `@babel/eslint-parser@7.29.9`
  and `eslint-plugin-react@7.37.5`. React plugin `7.37.5` remained the latest
  registry release checked. [Upstream ESLint 10 compatibility issue](https://github.com/jsx-eslint/eslint-plugin-react/issues/3977).
- DS pins React and React DOM peers to `19.0.0`; root/frontend use `19.3.0`.
- Swagger's `react-debounce-input@3.3.0` and `react-inspector@6.0.2` peers
  exclude React 19, despite Swagger's own peer range accepting it.

ESLint `9.39.5` and matching `@eslint/js` were investigated as a possible
future peer-compatible direction, but ESLint 9 still uses minimatch 3 and
would not solve the audit. Babel parser `8.0.7` supports ESLint 10 but requires
Babel core 8. Neither change is part of the selected first stage.

A strict `npm ci` was not run during read-only research. Existing peer
conflicts are evidence of a likely acceptance blocker, not a recorded result
of a clean install on Node 26. Test that gate explicitly with
`npm ci --legacy-peer-deps=false`; do not mistake the repository's current
default install policy for peer validation.

## Evidence requested for implementation

- Exact Node/npm versions and fresh full/production audit JSON or faithful
  captured output before and after changes.
- Manifest and lockfile decisions, resulting dependency paths, and all
  install/check command exit codes.
- Results for every verification command and smoke scenario in [plan.md](plan.md),
  distinguishing passed, failed, and blocked checks.
- Any residual advisory's path, exposure, remedies considered, mitigation,
  and remaining work; link independently scoped issues separately.
  At this research stage, no residual finding had been accepted; the later
  assessment decision above records the agreed exceptions.

## First-stage implementation — 2026-11-03

The user authorized the first stage, verification on Node 26, progress and
research updates, and leaving the ticket open without a commit. The existing
research folder was untracked at the start; no existing application edits
were present. Original TICKET-001/002/003 files were left untouched.

### Runtime and installation

The user installed Node **v26.13.0** under nvm during implementation. The
shell still selected Node 22 by default, so **every install, audit, build,
test, dependency inspection, and browser harness command below** explicitly
prepended the Node 26 directory:

```sh
export PATH=/Users/pawel/.nvm/versions/node/v26.13.0/bin:$PATH
node --version # v26.13.0
npm --version  # 11.20.0
```

Use the equivalent Node 26 activation on other machines. JDK 25.0.5 was
available for the e2e backend. Playwright Chromium 153.0.8010.12 (revision
1243) was installed for browser verification.

1. Refreshed both baseline audits before changing any manifest or lockfile.
   The sandbox could not resolve the npm registry; network-approved retries
   produced the saved reports below. Both exit 1 because of findings.
2. Edited exactly seven version entries across the three manifests, then ran
   `npm install --package-lock-only --ignore-scripts --no-audit --fetch-retries=0`
   (exit 0). This used the existing `legacy-peer-deps=true` policy. An initial
   sandbox attempt could not access npm; the successful retry had registry
   access. Lockfile command output (local artifact: `evidence/lockfile-update.txt`).
3. Ran `npm ci --legacy-peer-deps=false --fetch-retries=0` (exit 1). After
   retrying the initial sandbox DNS failure with registry access, npm reported
   **ERESOLVE**: `@babel/eslint-parser@7.29.9` accepts ESLint 7/8/9, while
   root uses ESLint 10.11.0. This is a real acceptance failure, not a network
   limitation. Strict-install output (local artifact: `evidence/strict-install.txt`).
4. Ran diagnostic `npm ci --fetch-retries=0` under the unchanged `.npmrc`
   (exit 0, 876 packages installed). This populated the updated tree for
   checks; it **does not satisfy strict clean-install acceptance**.
   Diagnostic installation (local artifact: `evidence/diagnostic-install.txt`).
5. npm 11 warned about install scripts not covered by `allowScripts` for
   11 packages. No blanket approval or install-policy change was made.
   Relevant build/test checks below ran successfully, but this warning and
   remaining peer validation stay in this ticket's strict-install work.

### Dependency decisions and lockfile scope

| Entry | Before | After |
| --- | --- | --- |
| DS `storybook`, `@storybook/react-vite` | 10.6.0 | 10.6.5 |
| Root/frontend `vite` | 8.3.0 | 8.3.5 |
| Root/frontend `vitest` | 4.1.11 | 4.1.12 |
| Frontend `zod` | 4.1.12 | 4.6.7 |

Lockfile review confirmed changes within these dependency subtrees:

- Storybook builder-vite, React renderer, and React DOM shim moved together
  to 10.6.5.
- Vitest internals, including mocker, moved to 4.1.12. Its resolved nested
  chai moved 6.2.2 → 6.3.0 and tinyrainbow 3.1.1 → 3.2.0.
- Vite's resolved rolldown and platform bindings moved 1.2.9 → 1.2.16,
  rolldown's OXC types 0.150.0 → 0.156.0, postcss 8.5.28 → 8.5.32, and
  nanoid 3.3.19 → 3.3.20.
- Frontend Zod now shares the existing root 4.6.7 package; the vulnerable
  nested 4.1.12 entry was removed and root Zod is now a production dependency.

These are npm's resolved dependencies of the selected updates. No other
direct dependency, override, replacement, application code, or configuration
changed. `.npmrc` and Storybook origin protections are unchanged. Lockfile
SHA-256 after verification:
`210b6f7fe90f81d382df673c92ccf3e41f2795ff9f90ccd7e2f3d3aea85f36cf`.

`npm ls storybook @storybook/react-vite swagger-ui-react swagger-client deepmerge minimatch glob vite vitest @vitest/mocker zod eslint typescript-eslint --all`
confirmed the updated installed versions, but exited 1 for the existing
ESLint peer conflicts. Resolved tree (local artifact: `evidence/dependency-tree-after.txt`).
`npm ls react react-dom --all` also exited 1 for React peer conflicts.
React peer evidence (local artifact: `evidence/react-peers-after.txt`).

### Fresh before/after audits

Commands: `npm audit --json` and `npm audit --omit=dev --json`, each executed
before and after the update on Node 26. All four exited **1** because of
reported vulnerabilities; none failed to retrieve its saved final report.

| Report | Critical | High | Moderate | Low | Total affected packages |
| --- | ---: | ---: | ---: | ---: | ---: |
| Before: full (local artifact: `evidence/audit-before-full.json`) | 1 | 2 | 18 | 2 | 23 |
| After: full (local artifact: `evidence/audit-after-full.json`) | 0 | 0 | 16 | 2 | 18 |
| Before: production (local artifact: `evidence/audit-before-production.json`) | 0 | 1 | 3 | 2 | 6 |
| After: production (local artifact: `evidence/audit-after-production.json`) | 0 | 0 | 3 | 2 | 5 |

`storybook`, `vite`, `vitest`, `@vitest/mocker`, and `zod` disappear from the
full audit; `zod` disappears from production. The direct advisories attached
to those selected packages are absent in the after report. No new affected
package or advisory source appears. `@storybook/react-vite` remains affected
through docgen → glob; its upgrade alone does not fix that path.

### Required verification results

All successful checks below used the freshly installed updated tree under
the existing legacy-peer policy. They are **diagnostic passes**, not evidence
that the unresolved strict-install gate passed.

| Command | Exit | Result and evidence |
| --- | ---: | --- |
| `npm ci --legacy-peer-deps=false --fetch-retries=0` | 1 | Failed: Babel parser/ESLint peer conflict; output (local artifact: `evidence/strict-install.txt`). |
| `npm audit --json` | 1 | 18 findings; report (local artifact: `evidence/audit-after-full.json`). |
| `npm audit --omit=dev --json` | 1 | 5 findings; report (local artifact: `evidence/audit-after-production.json`). |
| `npm run quality` | 0 | Lint, UI typecheck, dependency boundaries, 3 UI tests in 2 files, and UI build passed; output (local artifact: `evidence/quality.txt`). |
| `npm run typecheck --workspace @kyc/frontend` | 0 | Passed; output (local artifact: `evidence/frontend-typecheck.txt`). |
| `npm run test --workspace @kyc/frontend` | 0 | 12 tests in 2 files passed, including reviewer parsing and navigation regressions; output (local artifact: `evidence/frontend-test.txt`). |
| `npm run build --workspace @kyc/frontend` | 0 | Passed, including SPA prerender; output (local artifact: `evidence/frontend-build.txt`). |
| `npm run test:e2e --workspace @kyc/frontend` | 0 | Both Chromium tests passed with the real backend started by the runner; output (local artifact: `evidence/frontend-e2e.txt`). |
| `npm run build-storybook` | 0 | Passed; output (local artifact: `evidence/storybook-build.txt`). |
| `node .scratch/IMPROVEMENT-001-fix-npm-audit-vulnerabilities/smoke.mjs` | 1 | Application/reviewer/Swagger passed; local Storybook preview failed; output (local artifact: `evidence/smoke.txt`). |
| `node .scratch/IMPROVEMENT-001-fix-npm-audit-vulnerabilities/smoke.mjs --storybook-only` | 1 | Reproduced preview failure in isolation; output (local artifact: `evidence/storybook-smoke-isolated.txt`). |
| `git diff --check` | 0 | Passed. |

Environment retries and nonfatal output:

- The first frontend build exited 1 because the sandbox denied React Router's
  prerender listener (`listen EPERM ::1`). The approved retry passed.
- The initial sandbox e2e attempt exited 1: its port probe reports all listen
  errors as “port already in use.” Outside the sandbox, servers started;
  both tests then failed because Chromium was absent. After
  `npx --no-install playwright install chromium` (exit 0;
  download output (local artifact: `evidence/playwright-install.txt`)), the required suite
  passed. These were environment failures, not counted as passes.
- Builds warn about chunks over 500 kB. Frontend unit tests emit Node's
  localStorage experimental warning. Storybook emits a Node module-register
  deprecation warning. No warning thresholds or runtime flags were changed.
- The passing e2e run logs an initial Vite optimization/reload dynamic-import
  rejection and React Router's warning for the redirect-only `/api/docs`
  route. The final two tests pass. The separate application smoke reaches
  the expected routes and Swagger content; these log messages are retained,
  not represented as a warning-free run.

### Smoke coverage and new unresolved preview finding

The local investigation harness `smoke.mjs` starts local application and Storybook servers
on 13001/16006 and terminates them on exit. It checked:

- Home redirect → create-account → sign-in → create-account navigation.
- Reviewer URL parsing with valid search/status values, typed search updates,
  and fallback defaults for overlength query, unknown status, and negative
  page. The current route is fixture-backed; this is not a backend filtering
  assertion. Existing frontend tests additionally cover pagination and history.
- `/api/docs` loading `/openapi.json`, Swagger title rendering, and every
  operation expanded with no “Try it out” or “Execute” button.
- Storybook discovered 15 stories, but the first direct preview stayed empty.
  The browser and server reported React's unoptimized CommonJS entry lacking
  an ESM default export. The remaining 14 previews, manager iframe, and
  interactive select checks were **blocked by that first preview failure**.

The diagnosing-bugs skill was used to retain a red-capable browser loop and
minimize it to Storybook alone. The isolated repeat reproduced the same
React default-export failure without the application server. Cache metadata
showed react-dom and runtime entries plus a React chunk, but no standalone
optimized React entry. This is an observation, not an established cause.
No old-version browser baseline was run, so regression attribution remains
unknown. Further hypothesis testing and fixes are deferred to the linked
independent issue IMPROVEMENT-003 within the user's staged scope; no fix or passing regression test
is claimed. No source instrumentation or compatibility workaround was added.

### Remaining advisories, exposure, mitigation, and work

The full audit now contains three distinct advisory sources, propagated
through 18 packages. Production has the minimatch/deepmerge sources across
5 packages. The preceding research sections retain primary sources and
consumer/API evidence; the raw after reports preserve exact affected nodes.

| Finding/path | Remedies evaluated and present mitigation | Tracking |
| --- | --- | --- |
| GHSA-g3hv-75wg-m249: lint/config-array/TypeScript ESLint/import-x → minimatch 10; React lint plugin → minimatch 3 | Researched parent releases still use affected majors; minimatch 11 removes APIs these consumers need. No blanket override attempted. Inspected configuration patterns are repository-controlled; this limits observed exposure, not the audit finding. | [IMPROVEMENT-001 — lint remediation](../../tickets/IMPROVEMENT-001-fix-npm-audit-vulnerabilities.md#accepted-assessment-exceptions) |
| GHSA-3g3m-2fjr-6pw4 and minimatch advisory: Storybook React → docgen → glob 13 → minimatch 10 | Storybook upgrade applied but this build/docs path remains. Researched docgen releases still declare glob 13; patched glob is outside that range. Investigate a scoped override with consumer tests. Existing discovery patterns are local and inspected code uses globSync; cancellation exploitability is not proven. | [IMPROVEMENT-001 — docgen remediation](../../tickets/IMPROVEMENT-001-fix-npm-audit-vulnerabilities.md#accepted-assessment-exceptions) |
| minimatch advisory and GHSA-gcqx-w48m-w2h4: Swagger → swagger-client → API DOM/minimatch and deepmerge | Researched upstream releases retain both paths; no audit-suggested downgrade applied. Local OpenAPI and disabled requests were smoke-verified. Inspected minimatch usage is a Node file resolver; no universal non-exploitability claim. | [IMPROVEMENT-001 — Swagger remediation](../../tickets/IMPROVEMENT-001-fix-npm-audit-vulnerabilities.md#accepted-assessment-exceptions) |
| Strict clean-install compatibility | Strict install was attempted and fails; diagnostic legacy-peer installation passes. Existing ESLint and React conflicts remain without an accepted bypass. | [IMPROVEMENT-001 — strict-install compatibility](../../tickets/IMPROVEMENT-001-fix-npm-audit-vulnerabilities.md#accepted-assessment-exceptions) |
| Local Storybook preview failure | Confirmed twice with current dependencies, including an isolated run; build success does not satisfy preview acceptance. Origin protections remain enabled. | [IMPROVEMENT-003](../../tickets/IMPROVEMENT-003-fix-storybook-development-previews.md) |

The [authoritative CVE record](https://raw.githubusercontent.com/CVEProject/cvelistV5/main/cves/2026/93xxx/CVE-2026-93753.json)
was rechecked during implementation: CVE-2026-93753 remains **REJECTED**,
updated/rejected 2026-11-02, while both fresh after audits still report the
deepmerge advisory. The discrepancy remains open; nothing was suppressed.

At this first-stage checkpoint the ticket stayed open, with no exceptions yet
accepted. The later assessment decision above supersedes that restriction.
No commit was created.

### Tracking cleanup — 2026-11-03

The user requested selective consolidation. Lint minimatch, Storybook docgen,
Swagger dependencies, and strict-install compatibility are remaining work
within IMPROVEMENT-001's existing scope and acceptance criteria. Their separate
uncommitted tickets and status rows were removed after consolidating their
requirements into the ticket's remaining-work checklist and these notes.
The investigations and raw evidence above are preserved.

When addressing these areas, refresh upstream support and affected paths;
validate any override against consumer APIs. For docgen, explicitly check
generated prop documentation as well as discovery and local previews. For
Swagger, recheck the authoritative CVE/feed discrepancy and retain the local
OpenAPI document with requests disabled. Coordinate lint and React peer
changes with security remediation: verify default and explicit strict clean
installation on Node 26, inspect installed peers, and review any necessary
install-script policy without blanket approval. Rerun both audits and the
required quality, frontend, and Storybook verification after changes.

[IMPROVEMENT-003](../../tickets/IMPROVEMENT-003-fix-storybook-development-previews.md)
remains independent: it was discovered during verification, and whether the
dependency updates caused it is unknown. The failed Storybook smoke criterion
remains unmet. No exception or completion status changed during this cleanup.
Dependency changes, raw evidence, and the reproduction script were preserved;
no commit was made.

## Restoration after IMPROVEMENT-003

Restored stash `aa00b518c172ef5fb948b86f0baff426fd644631` on top of commit
`81d4ec1` with `git stash apply`; the stash is retained. The apply restored all
research/evidence but reported conflicts in DS/package.json and package-lock.json.
Resolved these by retaining the completed Docs integration and aligning
`@storybook/addon-docs` with Storybook/react-vite at 10.6.5. Compared with the
original stashed lockfile, the only additions are the matching Docs addon and
its four transitive packages. The committed React optimization, Docs configuration,
TypeScript coverage, CLI linting, launcher formatting, and regression harness
are preserved. No new audit-remediation strategy was applied.

On Node 26.13.0/npm 11.20.0:

- `npm install --ignore-scripts --no-audit --fetch-retries=0`: exit 0 after an approved network retry (sandbox DNS initially failed). Uses the existing legacy-peer policy; does not satisfy strict installation acceptance.
- `npm run quality`: exit 0; output (local artifact: `evidence/restored-quality.txt`).
- `npm run build-storybook`: exit 0; output (local artifact: `evidence/restored-storybook-build.txt`).
- `node scripts/test-storybook.mjs`: exit 0; all 15 previews, Docs, manager and select checks passed with no page errors; output (local artifact: `evidence/restored-storybook-smoke.txt`).
- `git diff --check`: passed; no unmerged paths remain.

Both audits and frontend-specific checks were not repeated for this restoration;
18 full/5 production findings are the last recorded results, not fresh counts.
Original historical failures above are preserved. IMPROVEMENT-003 is complete;
At restoration it remained in progress. Restored changes were unstaged and no new
commit was created.

## Continuation — 2026-11-04

Refreshed full and production audits on Node 26.13.0/npm 11.20.0. Before:
18 full (16 moderate, 2 low), 5 production (3 moderate, 2 low). After the
changes below: **15 full (13 moderate, 2 low), 5 production**, no new affected
packages. Critical/high remain zero. Raw JSON: `evidence/continuation-audit-before-full.json`,
`continuation-audit-before-production.json`, `continuation-audit-after-full.json`,
and `continuation-audit-after-production.json` (all audit commands exit 1 for findings).
Sandbox DNS failures were followed by successful approved registry retries.

### Changes and rationale

- Removed only the unused direct `@babel/eslint-parser`. A source/configuration search found no use; ESLint uses TypeScript ESLint's parser. This removes its unsupported ESLint 10 peer contract without upgrading Babel or weakening lint rules.
- Aligned private DS React and React DOM peers from exact 19.0.0 to exact 19.3.0, matching root/frontend and the versions exercised by the checks. This does not claim support for an untested wider range.
- Added an override scoped to **`@joshwooding/vite-plugin-react-docgen-typescript@0.7.0` → `glob@14.0.3`**. Root-wide minimatch overrides were not used. The plugin's only glob API is `globSync(pattern, {absolute:true, cwd, ignore, nodir:true})`; it does not access pattern internals, matcher internals, debug options, or cancellation. This API and these options remain available in glob 14.
- Compared the [glob 14 changelog](https://raw.githubusercontent.com/isaacs/node-glob/v14.0.3/changelog.md) against that consumer. Changes include minimatch 11 internals and some glob matching edge cases, which is why functional validation was required. [The advisory](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) is patched from 14.0.2. Exact 14.0.3 uses patched minimatch 11.
- The current Storybook defaults use react-docgen, so a passing default Storybook build alone would not exercise the overridden TypeScript plugin. Added local `check-docgen.mjs` which runs the actual TypeScript docgen plugin with DS include/exclude patterns, checks discovery and generated Button variant/size/fullWidth metadata, and captures results. Before/after discovery and generated metadata are identical (`evidence/docgen-before.json`, `docgen-after.json`). Three component files are included; stories and tests are excluded. Validation ran on the project's Node 26/macOS environment, not every platform.
- A plain npm install initially retained the old locked glob despite the override; `npm ls` exposed glob 13.0.6 as invalid. `npm update glob --ignore-scripts --no-audit --fetch-retries=0` resolved the override after an approved registry retry. Re-ran the plugin comparison and confirmed the actual consumer resolves glob 14.0.3. Only these final results count as validation of the override.

The three eliminated affected packages are glob, the TypeScript docgen plugin,
and @storybook/react-vite. Other minimatch consumers retain their existing
versions because incompatible APIs prevent a blanket update.

### Verification

| Command | Exit | Local artifacts under `evidence/` |
| --- | --- | --- |
| `npm ci --dry-run --legacy-peer-deps=false --ignore-scripts --no-audit --fetch-retries=0`, before | 1 | continuation-strict-dry-run-before.txt; Babel parser peer conflict |
| Same strict dry run, after | 1 | continuation-strict-dry-run-after.txt; React lint plugin peer conflict |
| `node .scratch/IMPROVEMENT-001-fix-npm-audit-vulnerabilities/check-docgen.mjs after` | 0 | docgen-after.json; identical to before after confirming glob 14.0.3 |
| `npm run quality` | 0 | continuation-quality.txt |
| `npm run build-storybook` | 0 | continuation-storybook-build.txt |
| `node scripts/test-storybook.mjs` | 0 | continuation-storybook-smoke.txt; 15 previews, Docs, manager and select, no page errors |
| `npm run typecheck --workspace @kyc/frontend` | 0 | continuation-frontend-typecheck.txt |
| `npm run test --workspace @kyc/frontend` | 0 | continuation-frontend-test.txt |
| `npm run build --workspace @kyc/frontend` | 0 | continuation-frontend-build.txt |
| `npm run test:e2e --workspace @kyc/frontend` | 0 | continuation-frontend-e2e.txt; both Chromium tests pass |
| `node .scratch/IMPROVEMENT-001-fix-npm-audit-vulnerabilities/smoke.mjs` | 0 | continuation-application-smoke.txt; application/reviewer navigation, Swagger local OpenAPI with all requests disabled, and stories pass |
| `git diff --check` | 0 | No whitespace or conflict errors |

These checks used the existing installation policy; strict clean install did
not pass. That limitation is now covered by the assessment exception above. E2e still emits the existing redirect-only /api/docs route warning.
No origin protection, advisory threshold, audit scope, or peer validation rule was relaxed.

### Remaining decisions and blockers

[Fresh primary-source research](continuation-research.md) confirms no published
in-range lint update clears minimatch. Import-x statically imports removed
`makeRe`; React plugin expects the older callable export and does not support
ESLint 10 peers. Other consumers may allow narrowly scoped adaptations, but
these need their own differential lint-policy and file-discovery tests.

Swagger's latest checked parent releases retain minimatch and deepmerge paths,
and its React dependencies still have peer limitations. The deepmerge CVE remains
rejected in the authoritative CVE record while the advisory feed reports it.
No suppression was applied. The subsequent user decision accepts the residual
findings and installation limitation for the assessment, preserving the current
stack. Replacement migrations are deferred beyond that scope.

At the continuation checkpoint, exceptions were still pending. The assessment
decision above resolves that question. Original stash remains untouched; no commit
was created. Prior evidence and the completed IMPROVEMENT-003 fixes are preserved.
