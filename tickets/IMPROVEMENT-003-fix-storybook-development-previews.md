# IMPROVEMENT-003: Restore Storybook previews and Docs

Discovered during verification of [IMPROVEMENT-001](IMPROVEMENT-001-fix-npm-audit-vulnerabilities.md). The React preview failure reproduced on the restored baseline, so the stashed audit-remediation updates did not introduce it. Audit work remains preserved separately.

## Problem and scope

Storybook initially built but failed to render story previews because React's raw CommonJS entry did not supply the expected ESM default export. Explicit React prebundling fixed that failure.

Follow-up verification exposed a separate Docs error: `docsParameter.renderer is not a function`. Autodocs tags created the page entry, but the Docs renderer addon was absent. The configuration also retained the removed `docs.autodocs` option. Earlier browser checks skipped Docs pages, and the TypeScript include pattern skipped the hidden `.storybook` directory.

Fix story previews, Docs rendering, and their verification gaps while preserving security protections and keeping unrelated dependency remediation in IMPROVEMENT-001.

## Acceptance criteria

- [x] Determine the preview root cause and relationship to the audit updates.
- [x] Apply compatible fixes while preserving security protections.
- [x] Pass all 15 story previews, manager iframe, and interactive select checks with no browser page errors.
- [x] Render Components/Docs directly and through the manager, including its heading and a live example.
- [x] Include `.storybook/main.ts` and `.storybook/preview.tsx` in the normal typecheck and remove the invalid configuration option.
- [x] Pass `npm run quality` and `npm run build-storybook` on Node 26.
- [x] Record audit impact and evidence linking back to IMPROVEMENT-001.

## Resolution and verification

The configuration explicitly prebundles React and registers `@storybook/addon-docs@10.6.0`, matching the installed Storybook version. Documentation remains enabled through the existing story tags. Explicit TypeScript globs ensure the configuration is checked.

Run `node scripts/test-storybook.mjs` from the repository root on Node 26 with Playwright Chromium installed. It starts Storybook on port 16006 and stops it on exit. The `--first-story` option is a narrow preview diagnostic; full acceptance requires the default complete run.

The expanded suite passed on cold and warm starts, and quality/build passed. Audits remain at 23 full and 6 production affected packages, with no new affected packages or advisory sources from this change. See [diagnosis and verification summary](../.scratch/IMPROVEMENT-003-fix-storybook-development-previews/notes.md).
