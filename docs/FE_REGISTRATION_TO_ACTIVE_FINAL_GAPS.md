# Registration-to-ACTIVE Frontend — Final F9 Gaps

This record closes the frontend integration boundary through the `ACTIVE` handoff. It does not
claim that post-ACTIVE delivery workflows exist.

## BLOCKED_BY_BE_CONTRACT

- **Registration Source provenance:** no Team/Project source aggregate, persisted Topic relation,
  lock/status, concurrency token, or source API exists. The frontend does not use `topicId`, URL
  values, React state, or localStorage as an authority.
- **Student Proposal governance:** no Proposal aggregate, persistence, approval actor, lifecycle,
  or governing source contract is available.
- **MaxTeams/quota:** no verified contract was introduced for a project/topic team-capacity value;
  the frontend does not display or calculate it.

## BLOCKED_BY_ENVIRONMENT

- Docker/Testcontainers SQL integration verification remains unavailable on this machine. This
  does not change the frontend API-mode behavior or unit-test result.

## RUNTIME_VERIFICATION_PENDING

- Live multi-user journey: student request, supervisor accept, student reload, and scoped
  Supervisor workspace should be exercised against a running Backend with distinct accounts.
- Browser responsive/manual verification of the new handoff shell remains required in the target
  deployment environment.

## DEFERRED_POST_ACTIVE

- Milestones, tasks, workload/progress, supervisor feedback, deliverables, final submission,
  evaluation, and grading are intentionally outside F9. The ACTIVE shell does not fabricate any
  of these capabilities.

## Completed frontend boundary

- Backend-derived Student Journey resolves one next action at a time.
- Dashboard sends `ACTIVE` only to the guarded Project workspace.
- Student and Supervisor handoff pages re-read current Backend-backed context/scope before
  rendering a Project summary.
