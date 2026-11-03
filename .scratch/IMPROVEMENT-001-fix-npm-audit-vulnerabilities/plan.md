# IMPROVEMENT-001: Stage the confirmed dependency fixes

Ticket: [Fix remaining npm dependency vulnerabilities](../../tickets/IMPROVEMENT-001-fix-npm-audit-vulnerabilities.md)

Research: [Evidence and sources](notes.md)

Prepared from the 2026-11-03 investigation. The user selected **Stage safe
fixes** and requested the full ticket filename stem for this working folder.

## Agreed assessment scope — 2026-11-04

The user approved closure with documented exceptions for the remaining 15 full /
5 production affected packages and the existing legacy-peer installation policy.
The verified targeted fixes satisfy this revised assessment scope; zero-audit
and strict clean-install targets are waived, not claimed as achieved. See the
[ticket](../../tickets/IMPROVEMENT-001-fix-npm-audit-vulnerabilities.md#accepted-assessment-exceptions)
and [notes](notes.md#assessment-exception-decision--2026-11-04) for rationale
and revisit conditions. Preserve evidence and the original stash; no further
code changes, audit suppression or commit is included in closure.

The following sections preserve the earlier plan and execution history.
Their requirements to leave the item open are superseded by the explicit
assessment exception decision above.

## Findings and scope

The refreshed audits on **2026-11-03** report:

| Audit | Critical | High | Moderate | Low | Total affected packages |
| --- | ---: | ---: | ---: | ---: | ---: |
| Full workspace | 1 | 2 | 18 | 2 | 23 |
| Production only | 0 | 1 | 3 | 2 | 6 |

Proceed with the selected **safe first stage**. Keep the ticket open for
unresolved findings and installation compatibility. At this planning stage, no exceptions had been
accepted. Saving this plan does not implement the dependency changes.

## Proposed changes

Change these seven manifest entries and update their resolved dependencies
in the root lockfile:

| Dependency | Location | Current → proposed |
| --- | --- | --- |
| `storybook`, `@storybook/react-vite` | DS | `10.6.0` → `10.6.5` |
| `vite` | Root and frontend | `8.3.0` → `8.3.5` |
| `vitest` | Root and frontend | `4.1.11` → `4.1.12` |
| `zod` | Frontend | `4.1.12` → `4.6.7` |

These stay within existing major versions. Registry metadata confirms that
the proposed Storybook and Vitest releases support Vite 8.

- **Storybook:** fixes start at `10.6.2`. The advisory concerns the development
  server; built Storybooks are unaffected. Preserve the new origin protections
  and check local story previews.
  [Upstream advisory](https://github.com/storybookjs/storybook/security/advisories/GHSA-f2ph-cmg5-wxc8)
- **Vite:** the audited `8.3.x` vulnerabilities affect versions through
  `8.3.2`; use the researched `8.3.5` patch.
  [Advisory](https://github.com/advisories/GHSA-587h-7wmj-h5pm),
  [release](https://github.com/vitejs/vite/releases/tag/v8.3.5)
- **Vitest:** upgrading also moves `@vitest/mocker` to patched `4.1.12`.
  [Upstream advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-xp26-3454-mjgp)
- **Zod:** fixes start at `4.6.6`. The application currently validates scalar
  search parameters, rather than the collection input described in the
  advisory; still update the vulnerable dependency.
  [Advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)

No public API changes are intended. Exclude unrelated upgrades, dependency
replacements, and overrides from this stage.

## Remaining dependency paths and blockers

- **Lint tooling → minimatch:** ESLint/config-array, TypeScript ESLint, and
  import-x use minimatch 10; the React lint plugin uses minimatch 3. Patched
  minimatch starts at `11.0.1`, but version 11 removes APIs used by consumers,
  including `makeRe`. A blanket override is incompatible.
  [Advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249),
  [upstream changes](https://raw.githubusercontent.com/isaacs/minimatch/v11.0.1/changelog.md)
- **Storybook React integration → docgen plugin → glob 13 → minimatch 10:**
  upgrading Storybook alone leaves this path. Glob's fix starts at `14.0.2`,
  outside the plugin's declared range. Evaluate a scoped override separately,
  including story discovery and generated prop documentation.
  [Glob advisory](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4)
- **Swagger UI → swagger-client → API DOM → minimatch**, plus
  **swagger-client → deepmerge:** upstream releases checked during research
  retain these dependencies. The deepmerge CVE was formally rejected on
  November 2, while npm still reported it on November 3. Record that
  discrepancy and recheck the feed; do not downgrade Swagger to silence it.
  [Authoritative CVE record](https://raw.githubusercontent.com/CVEProject/cvelistV5/main/cves/2026/93xxx/CVE-2026-93753.json)
- **Clean-install compatibility:** `.npmrc` currently enables
  `legacy-peer-deps`. Existing conflicts include ESLint 10 versus React/Babel
  lint plugins, DS React peers pinned to `19.0.0` versus installed `19.3.0`,
  and Swagger dependencies whose React peers stop at 18. Preserve this as a
  documented blocker; resolving it requires a subsequent compatibility change.

## Verification and completion rules

Use the declared **Node 26** environment. The research shell had Node
`22.14.0`, so implementation verification has not been performed.

After applying the staged updates, run:

```sh
npm ci --legacy-peer-deps=false
npm audit --json
npm audit --omit=dev --json
npm run quality
npm run typecheck --workspace @kyc/frontend
npm run test --workspace @kyc/frontend
npm run build --workspace @kyc/frontend
npm run test:e2e --workspace @kyc/frontend
npm run build-storybook
```

Record strict-install failures explicitly. Checks using the existing
installation policy are diagnostic and do not satisfy clean-install
acceptance. If installation prevents a check from running against the updated
dependency tree, record that check as blocked rather than passed.

Smoke-check application navigation, reviewer search parsing, Storybook
previews, and `/api/docs` loading `/openapi.json` with requests still disabled.

When implementation begins, append commands, dependency decisions, and
before/after audit evidence to [notes.md](notes.md), refreshing the baseline
because advisory data can change. Record remaining remediation work in this
ticket and its notes; link separate tickets for independently scoped issues.
Confirm that the selected advisories disappear and identify any
newly reported findings.

This stage is partial remediation: **at that stage, completion required meeting the audit and
clean-install criteria or a later explicit revision of scope.** No commit is authorized by
this plan.

## Execution record — 2026-11-03

The seven manifest updates and corresponding lockfile changes were applied.
All listed verification commands were run on Node 26.13.0/npm 11.20.0.
Quality, frontend typecheck/tests/build/e2e, and Storybook build passed under
the repository's existing legacy-peer installation policy. Strict clean
installation failed with the known Babel parser/ESLint conflict.

Full audit: 23 → 18 packages (16 moderate, 2 low). Production: 6 → 5
(3 moderate, 2 low). Selected advisories disappeared; no new advisory was
reported. Application/reviewer/Swagger smokes passed. Local Storybook preview
smoke failed with a React default-export error, reproduced in isolation.

See [verification notes and local artifact references](notes.md) for exact commands, retries, limits,
and remaining remediation work consolidated into IMPROVEMENT-001.
[IMPROVEMENT-003](../../tickets/IMPROVEMENT-003-fix-storybook-development-previews.md)
independently tracks the preview failure discovered during verification;
whether the dependency updates introduced it is unknown. Storybook smoke
acceptance remains unmet. No exceptions were accepted and no commit was
made. The ticket remained open at that checkpoint.

## Restoration after Storybook fix

The first-stage work has been restored on top of IMPROVEMENT-003 (`81d4ec1`).
The Docs addon is aligned with Storybook 10.6.5; quality, build, and the expanded
preview/Docs browser checks pass. The stash remains as backup. See the latest
notes for evidence. Remaining work is audit remediation, strict-install
compatibility, and final full verification; the original preview blocker is resolved.

## Continuation result — 2026-11-04

Scoped docgen/glob remediation and two peer repairs are implemented and verified;
full findings are now 15, production 5. Actual docgen output, quality, all frontend
checks, Storybook previews/Docs/build, and application/Swagger smokes pass. Strict
installation still fails at the React lint plugin. Remaining lint/Swagger changes
need consumer-specific validation and a choice of preserving or replacing affected
packages. See notes.md and continuation-research.md. These findings alone did not authorize an exception or commit; the later user
approval above establishes the assessment exceptions. No commit is requested.
