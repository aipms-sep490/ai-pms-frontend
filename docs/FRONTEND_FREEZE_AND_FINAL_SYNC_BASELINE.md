# Frontend Freeze and Final Sync Baseline

**Prepared:** 2026-10-03
**Freeze commit SHA:** Recorded by the Phase 8 checkpoint commit and final
checkpoint report. It cannot be embedded verbatim in its own commit content
without changing that commit hash.
**Scope:** Frontend phases 0–8 only. Backend was inspected read-only and was
not modified during the actor-workspace phases.

## 1. Checkpoint chain and actor workspace state

| Phase | Freeze posture |
| --- | --- |
| 0–1 Foundation | `VERIFIED_FE` |
| 2 Student Execution | `VERIFIED_FE` for delivered capability reads; missing execution/evidence contracts are `FE_COMPLETE_BE_BLOCKED` |
| 3 Supervisor / Mentor | `VERIFIED_FE` for delivered supervisor reads and feedback; Mentor scope remains `BE_HANDOFF_REQUIRED`; role-valid browser proof is `BLOCKED_BY_CREDENTIAL` |
| 4 Department Governance | `PARTIAL_ACCEPTABLE` |
| 5 Evaluator | `PARTIAL_ACCEPTABLE` |
| 6 System Administration | `PARTIAL_ACCEPTABLE` |
| 7 Calendar / deterministic Attention | `PARTIAL_ACCEPTABLE` |
| 8 AI Advisory | `PARTIAL_ACCEPTABLE` |

The branch before this checkpoint is `feat/ai-advisory-workspace-v3` at Phase 7
checkpoint `b401858cd20b9808cc8d6e78141c78387a008bec`; the Phase 8 commit is the
final Frontend freeze baseline.

## 2. Canonical workspace and authority model

- Student execution: `/project/*` is scoped to the current team/project and
  consumes Backend actions. `TEAM_LEADER` and `TEAM_MEMBER` are resource
  assignments, not global roles.
- Supervisor: `/supervisor/projects/:projectId/*` proves an active, unended
  primary assignment before rendering. `LECTURER` alone is insufficient.
- Mentor: `/mentor/projects/:projectId/majors/:majorId/*` proves the exact
  `DISCIPLINE_MENTOR` project-major assignment and remains read-first.
- Department: `/department/*` requires persisted active academic scope.
  `ADMIN` does not substitute for `DEPARTMENT_STAFF`; participating scope does
  not imply whole-project approval authority.
- Evaluator: `/evaluator/assignments/:assignmentId` verifies a persisted active
  assignment. `COMMON`, `MAJOR_SPECIFIC`, and `INDIVIDUAL` scopes are immutable
  returned facts.
- Admin: `/admin/access/*` is platform identity/RBAC/organization/audit scope,
  not project review, supervision, evaluation, or result-publication scope.
- Calendar: `/calendar` is a read-only projection. Attention derives only
  deterministic returned facts and never grants a mutation.
- AI: `/project/ai`, the exact Supervisor project route, and the Department
  per-project risk route are advisory-only. AI cannot approve, assign, score,
  publish, update a task, or bypass a WorkflowAction.

## 3. Backend handoff baseline

The authoritative Backend backlog is
[`BE_HANDOFF_ACTOR_WORKSPACE_AUDIT.md`](./BE_HANDOFF_ACTOR_WORKSPACE_AUDIT.md).
Stable IDs are `BE-AW-001` through `BE-AW-013`; they must never be renumbered.

| Classification | IDs |
| --- | --- |
| `FINAL_SYNC_BLOCKER` | `001`, `002`, `003`, `005`, `006`, `007`, `009`, `010`, `011` |
| `POST_SYNC_OPTIMIZATION` | `004`, `008`, `012` |
| `OPTIONAL/FUTURE` | `013` |

Phase 8 details and failure policy are in
[`AI_ADVISORY_WORKSPACE_MATRIX.md`](./AI_ADVISORY_WORKSPACE_MATRIX.md). AI
factor-to-resource navigation is intentionally absent until `BE-AW-012`; an AI
supervisor ranking is intentionally absent until `BE-AW-013` and must only
consider a Backend-filtered eligible set.

## 4. Credential acceptance inventory

| Actor | Browser acceptance state |
| --- | --- |
| Student Leader | `BLOCKED_BY_CREDENTIAL` |
| Student Member | `BLOCKED_BY_CREDENTIAL` |
| Primary Supervisor | `BLOCKED_BY_CREDENTIAL` |
| Discipline Mentor | `BLOCKED_BY_CREDENTIAL` |
| Department Staff | `BLOCKED_BY_CREDENTIAL` |
| Evaluator | `BLOCKED_BY_CREDENTIAL` |
| Admin | `BLOCKED_BY_CREDENTIAL` |

No Admin or generic Lecturer account may substitute for a scoped actor during
final synchronization acceptance.

## 5. Required final-sync acceptance scenarios

1. Confirm every delivered API/action at the Backend commit against a real,
   persisted actor and resource scope, including `401`, `403`, `404`, and `409`.
2. Verify Student Leader versus Member, Primary Supervisor versus Mentor,
   Department Lead versus Participating scope, and Evaluator assignment scope.
3. Verify stale writes preserve user input, refresh authoritative state, and
   never replay automatically.
4. Verify Calendar range/date semantics and independent source failure without
   inventing a deadline or all-clear state.
5. Verify AI stays advisory with project-scoped evidence, explicit report
   summary request, rate-limit/error isolation, insufficient-data handling, and
   no mutation path.
6. Run role-valid browser flows at 375px, 768px, 1024px, and 1440px; check
   direct-route guards, document overflow, console/network errors, and
   canonical readback after each mutation.

## 6. Freeze exclusions

No Backend source, tests, documentation, configuration, database, schema,
migration, or seed changed in the Frontend actor-workspace phases. This freeze
does not begin Backend handoff implementation or the final FE-BE synchronization.
