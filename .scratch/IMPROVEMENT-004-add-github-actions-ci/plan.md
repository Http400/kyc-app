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

The original implementation authorization excluded commits and pushes. The user
subsequently authorized commit `cbb660d`, pushed it, and confirmed a green hosted
run. See [the closure record](notes.md#hosted-evidence-and-assessment-closure) for
the run URL, inspected audit artifacts and the accepted hosted failure-upload
verification limitation. The PR trigger was validated statically only.

Keep lifecycle status in tickets/STATUS.md. Workflow validation and local checks
alone do not establish hosted success. No new application behavior was introduced;
validation used the existing suites and workflow execution boundaries rather
than implementation-shaped unit tests. The closure request authorizes only
documentation changes, with no additional commit or push.
