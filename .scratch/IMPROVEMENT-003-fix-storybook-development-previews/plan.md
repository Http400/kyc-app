# IMPROVEMENT-003: Restore Storybook previews and Docs

Ticket: [Restore Storybook previews and Docs](../../tickets/IMPROVEMENT-003-fix-storybook-development-previews.md)

1. Preserve IMPROVEMENT-001 in a separate stash and reproduce Storybook on the restored Node 26 baseline.
2. Establish a failing browser check, isolate missing React prebundling, and apply the smallest configuration fix.
3. Add Docs regression coverage and explicit configuration typechecking; install the matching Docs addon and remove the obsolete autodocs option.
4. Include Node scripts in lint coverage and apply the required launcher formatting cleanup.
5. Verify cold/warm browser checks, quality, build, script linting, and audit impact. Keep unrelated audit remediation separate.

See [diagnosis and verification results](notes.md) for the implementation outcome.
