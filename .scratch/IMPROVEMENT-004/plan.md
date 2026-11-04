# IMPROVEMENT-004 implementation plan

Ticket: [Add GitHub Actions CI](../../tickets/IMPROVEMENT-004-add-github-actions-ci.md).

- Add one workflow for pull requests to main and pushes to main, with independent
  quality/build and browser jobs on Ubuntu, using Node 26 and npm ci.
- Reuse existing scripts, build the design system before consumers, and install
  Temurin JDK 25 and Chromium for the browser job.
- Capture browser logs and existing Playwright failure traces. Preserve test exit
  codes and upload available diagnostics on failure.
- Collect full/production audits without failing on findings. Fail explicitly on
  collection errors and publish reports plus a summary referencing the accepted
  IMPROVEMENT-001 exceptions.
- Document commands, validate with actionlint and shell checks, exercise failure
  handling, and run the existing verification suite locally.
- Apply the code-review skill to uncommitted changes against baseline
  `62eb4b671a727dd5a6c46ddf65497faa198c5dc6`, including new untracked files.

No commits or pushes are authorized. Keep lifecycle status in tickets/STATUS.md;
completion requires a successful GitHub-hosted run. Workflow validation and local
checks do not establish hosted success. No new application behavior is introduced,
so validation uses the existing suites and workflow execution boundaries rather
than adding implementation-shaped unit tests.
