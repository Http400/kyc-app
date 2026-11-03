# IMPROVEMENT-003: Diagnosis and verification

Ticket: [Restore Storybook previews and Docs](../../tickets/IMPROVEMENT-003-fix-storybook-development-previews.md)

## Diagnosis and changes

Verified on Node 26.13.0 / npm 11.20.0 with Storybook 10.6.0,
Vite 8.3.0, and React 19.3.0.

- Story previews failed with `The requested module '/node_modules/react/index.js' does not provide an export named 'default'` (the observed URL also included a cache query). The browser received React's raw CommonJS entry because the optimizer had no standalone React entry. Including `react` in Storybook's existing `optimizeDeps.include` fixed the preview. Removing the fix and starting with a fresh cache reproduced the failure; cache clearing alone was insufficient. The fix produced an optimized `react.js` with `needsInterop: true`.
- The failure also reproduced before the stashed dependency updates, so IMPROVEMENT-001 did not introduce it. This identifies the missing prebundle without claiming an upstream scanner defect. See [Vite dependency optimization](https://vite.dev/config/dep-optimization-options).
- Components/Docs separately failed with `docsParameter.renderer is not a function`. The story's `autodocs` tag created its page entry, but the Docs renderer addon was absent. Added and registered `@storybook/addon-docs@10.6.0`, matching the installed Storybook release. The lockfile adds the addon and four transitive packages; existing versions are unchanged. See [Storybook Autodocs setup](https://storybook.js.org/docs/writing-docs/autodocs).
- Removed the obsolete `docs.autodocs` option, retaining the existing story tag. Explicit TypeScript includes for `.storybook/**/*.ts` and `.storybook/**/*.tsx` ensure the normal typecheck discovers both configuration files. Previously, the directory-only include skipped them. See [Storybook migration guidance](https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#mainjs-docsautodocs-is-deprecated).
- The maintained browser regression check is [scripts/test-storybook.mjs](../../scripts/test-storybook.mjs). It covers all 15 previews, Docs directly and through the manager, a rendered Docs example, the manager story iframe, select interaction, and browser page errors. The `--first-story` option is a narrow diagnostic, not full acceptance.
- ESLint now declares Node globals and permits CLI logging for `scripts/**/*.mjs`. Both lint commands include the scripts directory. The application launcher received formatting and built-in import ordering cleanup to pass the existing rules; its behavior was not changed.

No application API or security-protection changes were made. Existing peer
validation and install-script policies remain unchanged.

## Verification results

Results recorded during implementation on 2026-11-03; activate Node 26
before running these commands from the repository root. Browser checks
require Playwright Chromium and start a local server on port 16006.

| Command or scenario | Result |
| --- | --- |
| `npm ci --fetch-retries=0`, restored baseline before adding Docs | Exit 0 under the existing installation policy; not strict peer-validation acceptance. |
| `node scripts/test-storybook.mjs --first-story`, before React fix | Exit 1: empty preview and the React default-export error. |
| React fix removed, fresh Storybook cache | Exit 1: same preview failure. |
| `node scripts/test-storybook.mjs`, Docs coverage added before addon | Exit 1: empty Docs page and `docsParameter.renderer is not a function`. |
| `npm run typecheck`, explicit config includes added before removing obsolete option | Exit 1: TS2353, `autodocs` does not exist in the supported Docs options type. |
| `node scripts/test-storybook.mjs`, complete fix | Exit 0 on cold and warm starts: all previews, Docs, manager and select checks passed without browser page errors. |
| `npm run quality`, after Docs fix | Exit 0: lint, UI/configuration typecheck, dependency boundaries, three UI tests, and UI build. |
| `npm run build-storybook` | Exit 0. |
| `npm run lint`, after extending coverage to all scripts | Exit 0. |
| `node --check scripts/run-application.mjs` and `node scripts/run-application.mjs --help` | Both exit 0 after formatting cleanup. |
| `npm audit --json --fetch-retries=0` | Exit 1: 23 affected packages, unchanged by the Docs addon. |
| `npm audit --omit=dev --json --fetch-retries=0` | Exit 1: 6 affected packages, unchanged by the Docs addon. |
| `git diff --check` | Exit 0. |

Full audit: 1 critical, 2 high, 18 moderate, 2 low. Production audit:
1 high, 3 moderate, 2 low. No new affected packages or advisory sources
were introduced by the addon. These are affected-package counts, not
counts of distinct advisories. Audit remediation remains IMPROVEMENT-001 work.

Sandbox restrictions initially prevented registry access and localhost
binding; approved retries supplied the recorded results. Storybook retains
its Node module-register deprecation warning and build chunk-size warning.
The cold browser run overlapped the build and logged generated-output
reloads without browser errors; the warm run ran independently.

Raw evidence and the superseded scratch harness are retained locally and
ignored by Git. This summary and the maintained regression script provide
the committed diagnosis, results, and reproduction procedure.

## Preserved audit work

The local IMPROVEMENT-001 stash is `aa00b518c172ef5fb948b86f0baff426fd644631`,
named `IMPROVEMENT-001: park audit remediation before Storybook fix`.
It contains the dependency updates and associated research and tracking
changes. It remains unapplied. When resuming that work, reconcile its
status row with completed IMPROVEMENT-003 and keep the Docs addon aligned
with the selected Storybook version.
