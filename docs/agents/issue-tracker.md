# Issue tracker: Local Markdown

Task definitions live in `tickets/`. Plans and working notes live in
`.scratch/<ticket-ID>/`. Paths in this document are relative to the repo root.
Follow the original-ticket protection rule in `AGENTS.md`.

## Tickets and plans

- Read an existing task from `tickets/<ID>-<slug>.md`.
- Create additional tasks as `tickets/IMPROVEMENT-NNN-<slug>.md`, using the
  next available improvement number, padded to at least three digits.
- Give new tasks a scope and acceptance criteria; reference original tickets
  when relevant. These improvement files are editable.
- Keep each task's plan in `.scratch/<ID>/plan.md` and detailed progress notes,
  comments, and verification results in `.scratch/<ID>/notes.md`.
  Create these files when needed and link back to the task definition.
- When a skill says to publish a spec or ticket, create an improvement ticket.
  When it says to fetch a ticket, read the corresponding file in `tickets/`.

## Progress overview

`tickets/STATUS.md` is the authoritative progress overview for every ticket.
Add a row when creating a task and update it when work starts, becomes blocked,
finishes, or is declined. Keep lifecycle statuses here rather than duplicating
them in task definitions or plans.

| Status | Meaning |
| --- | --- |
| `todo` | Planned; work has not started in this tracking workflow. |
| `in-progress` | Being worked on. |
| `blocked` | Cannot continue; explain why in Summary. |
| `done` | Implemented and verified against the ticket's acceptance criteria. |
| `wontfix` | Deliberately declined; explain why in Summary. |

The usual flow is `todo` → `in-progress` → `done`. Use `blocked` when work
cannot continue and return to `in-progress` when it resumes.

Keep Summary brief: describe the result, next step, or blocker. Record detailed
verification evidence in the ticket's notes. Leave Commit(s) blank until work
is committed, then record short implementation hashes or the merge commit.
Completion does not itself require a commit; never invent a hash.

Triage is optional and separate from lifecycle tracking. When a triage skill
runs, follow `docs/agents/triage-labels.md`.

## Wayfinding operations

When using `/wayfinder`, keep its map in `.scratch/<effort>/map.md` with Notes,
Decisions-so-far, and Fog sections. Link child improvement tickets from the map
in execution order. Record each child's type (`research`, `prototype`,
`grilling`, or `task`) and blocking ticket IDs in its editable task definition.

- Frontier: choose the first `todo` child whose blockers are all `done`.
- Claim: set its central status to `in-progress` before starting work.
- Resolve: record the answer and verification in its notes, set the central
  status to `done`, and add a summary and link to the map's Decisions-so-far.
- If a blocker is declined, reassess the dependency explicitly before starting.
