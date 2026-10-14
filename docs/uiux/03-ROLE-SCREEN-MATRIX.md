# AI-PMS role and workflow screen map — Target inventory, verify against code

**Not a claim of current implementation.** Reconcile this target map with React route definitions, SRS screen authorization matrix and backend permissions before touching UI. One user may hold several assignments and roles: determine effective context for each project.

| Actor / context | First useful screen | Main decision/action | UX must show | Hard guard |
|---|---|---|---|---|
| Platform Admin | System overview | Manage accounts, roles, orgs, audit | Account status, scope, activity | No inherent right to academic grade |
| Lead Department staff | Academic operations dashboard | Set period, review project, publish if authorized | period config, reviews pending, decisions | Required department approvals, policy version |
| Participating Department | Major-specific review queue | Review discipline scope | which major is being reviewed, input/output | Cannot alone approve entire interdisciplinary project |
| Student before team | Onboarding and topic explorer | Find/create team | current period, available mode, prerequisites | verified major, period policy |
| Student Leader with forming team | Team workspace | Invite, manage, register | membership, quotas, per-major eligibility | valid invitation/member and policy window |
| Student Member | Assigned work | Accept invite, update task, upload evidence | personal tasks, deadlines, feedback | not leader-only registration/grade controls |
| Student Leader in DRAFT/REVISION_REQUIRED | Project registration | Save/submit/resubmit | revision feedback, readiness checklist, history | snapshot freshness, period window |
| Student awaiting approval | Project status | View decisions | lead & participating reviews, owner, events | no premature active workspace |
| Approved team | Supervisor request | Request supervisor | candidate eligibility/capacity, advisory AI reason | accept does not bypass capacity/state |
| Primary Supervisor | My supervision | Accept project, review progress | assigned projects, risk signals, evidence | assignment / active status |
| Discipline Mentor (when configured) | Assigned discipline workspace | Scope-specific feedback/gate review | major, artifacts, review responsibility | not automatically grade authorized |
| Active team | Project workspace | Task/meeting/progress/deliverable | milestone timeline, blockers, cross-major link | ACTIVE and resource scope |
| Assigned Faculty Evaluator | My evaluations | Score/finalize assigned criteria | stage, scope, evidence, frozen rubric, missing items | explicitly assigned major/student/criterion |
| Industry expert (if enabled) | Assigned advisory feedback | Record structured observation | advisory role, practical criteria | no default official grade weight |
| Leader at final submission | Final checklist | Verify package/submit | missing items, frozen files/versions | policy window and checklist |
| Authorized result publisher | Results readiness | Publish after completeness | approval, evaluator coverage, score lineage | authorized human, deterministic calculation |
| Student after COMPLETED | Project results | View permitted results | project vs individual breakdown when authorized | publication status and privacy |
| Archived project | Archive read-only | Browse approved history | read-only badge, versions and audit | no normal mutations |

## Shared navigation and state principles

- App shell can offer role/workspace switch when authenticated user has multiple assignments; changing scope triggers refetch and reauthorization.
- Student navigation adapts across `no team -> FORMING -> eligible -> DRAFT/SUBMITTED/REVIEW -> supervisor pending -> ACTIVE -> FINAL_SUBMISSION -> COMPLETED/ARCHIVED` rather than showing 20 dead menu items.
- Use role-relevant dashboards, NOT a universal dashboard covered with unrelated cards.
- `INTERDISCIPLINARY` is presented as integrated output plus filterable discipline responsibilities and evidence, not separate project ownership.
- `Review Gate`, `Meeting`, `Checkpoint`, `Evaluation Assignment` are separate states/entities; do not convert each to ProjectState enum.

## Prioritized UX rollout

P0: global shell, auth/capability/error, shared form+buttons+status, student team eligibility, project registration/review, evaluator score safety.
P1: supervisor assignment, task/milestone, progress report, evidence/deliverable, final submission, result publishing.
P2: analytics dashboard enhancements, role-specific AI panels, advanced personalization and optional theme density.

Sequence by actual code dependencies and changed components, not by page count. Each phase needs screenshot and regression proof.
