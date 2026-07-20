# 未來規劃 board column

Status: Approved by Owner on 2026-07-20 (`go`).

## User story

As the Owner, I want a 未來規劃 column before To Do so longer-horizon work is kept on the same board without being mistaken for current commitments.

## Behavior

- Add a persisted task status named `future`.
- Show columns in this order: `未來規劃`, `To Do`, `In Progress`, `Done`.
- 未來規劃 supports the same create, edit, delete, ordering, and cross-column drag/drop behavior as the existing columns.
- The task modal on the work Board includes 未來規劃 as a status choice.
- The personal `/todo` flow does not offer 未來規劃; personal-task behavior remains unchanged.
- Board statistics show a 未來規劃 count. Completion percentage keeps using all work tasks, including 未來規劃, as the denominator.
- A 未來規劃 task with a past due date still counts as overdue.

## Acceptance criteria

1. A work task can be created directly in 未來規劃 and survives reload.
2. A task can be dragged 未來規劃 ↔ To Do and its status/order survive reload.
3. Existing `todo`, `in_progress`, and `done` tasks render and behave unchanged.
4. Backend rejects unknown statuses but accepts `future` for create and update.
5. The personal To-Do modal exposes only To Do, In Progress, and Done.
6. Board remains usable at 1440×900 and 390×844 with no horizontal page overflow; columns may scroll horizontally inside the board.
7. Relevant backend and frontend tests/build pass, and the verified interaction flow has zero console errors.

## Edge cases

- An empty 未來規劃 column shows the existing add-task affordance.
- Moving the only card out of 未來規劃 leaves a valid empty column.
- Failed drag/update rolls the card back, as existing columns do.
- Existing database rows require no data migration because status is stored as text.

## Not doing

- No separate roadmap entity, milestones, quarters, target dates, or automatic promotion into To Do.
- No card layout redesign or new long-form fields.
- No production deploy or container rebuild as part of implementation without separate approval.

## Lo-fi UI

```text
+----------------+  +-------------+  +-------------+  +-------------+
| 未來規劃     2 |  | To Do     4 |  | In Progress |  | Done        |
|----------------|  |-------------|  |-------------|  |-------------|
| longer project |  | current ask |  | active work |  | completed   |
| someday item   |  | ...         |  | ...         |  | ...         |
+----------------+  +-------------+  +-------------+  +-------------+
```

## Riskiest path

The status type is shared by frontend and backend, while the modal is shared by Board and personal To-Do. The implementation must add `future` end-to-end without accidentally exposing it to personal tasks or breaking drag/drop persistence.
