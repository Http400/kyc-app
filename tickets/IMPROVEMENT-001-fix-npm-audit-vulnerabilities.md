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
  evidence in `.scratch/IMPROVEMENT-001/notes.md` when work begins.

## Out of scope

- New product features, unrelated refactoring, and general dependency upgrades
  that are unnecessary for remediation or compatibility.
- Hiding findings by disabling auditing, raising severity thresholds, or
  excluding development dependencies from the completion audit.

## Acceptance criteria

- [ ] A clean `npm ci` succeeds on the project's declared Node.js version,
  using the committed manifests and lockfile without bypassing peer dependency
  validation through `--force` or `--legacy-peer-deps`.
- [ ] Root `npm audit --json` and `npm audit --omit=dev --json` report zero
  vulnerabilities. If a finding cannot be safely resolved, document its
  advisory, dependency path, exposure, attempted remedies, mitigation, and
  linked follow-up ticket; completion with any remaining finding requires
  explicit user acceptance of that exception.
- [ ] `npm run quality` passes (lint, design-system typecheck, dependency
  boundaries, design-system tests, and design-system build).
- [ ] Frontend checks pass: `npm run typecheck --workspace @kyc/frontend`,
  `npm run test --workspace @kyc/frontend`,
  `npm run build --workspace @kyc/frontend`, and
  `npm run test:e2e --workspace @kyc/frontend`.
- [ ] `npm run build-storybook` passes, and smoke checks confirm the
  application, Storybook, and the existing Swagger UI integration still work.
- [ ] Notes contain reproducible before/after audit results and explain any
  overrides, replacements, or breaking-version changes. No unrelated
  dependency or application changes are included.
