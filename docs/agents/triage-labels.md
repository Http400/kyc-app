# Triage labels

These default labels are for optional triage by engineering skills. Everyday
progress uses the lifecycle statuses defined in `issue-tracker.md`.

| Canonical role | Local label | Meaning |
| --- | --- | --- |
| `needs-triage` | `needs-triage` | Needs an initial assessment. |
| `needs-info` | `needs-info` | Waiting for information needed to proceed. |
| `ready-for-agent` | `ready-for-agent` | Fully specified and ready for an agent. |
| `ready-for-human` | `ready-for-human` | Requires human implementation. |
| `wontfix` | `wontfix` | Deliberately declined. |

When triage runs, record its label in a `Triage:` line in
`.scratch/<ID>/triage.md`, with the reasoning below it. Create this file only
when needed. Apply or remove labels there; leave original ticket files intact.

Readiness labels do not change the central progress status. When missing
information prevents work, set the central status to `blocked` and explain
what is needed. When a task is declined, set it to `wontfix` with the reason.
