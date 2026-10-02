# Backend handoff — Actor Workspace audit

**Prepared:** 2026-10-02
**Frontend boundary:** no client role, URL, `isLeader`, or assignment flag grants a
mutation. Missing action is denied in the UI and the mutation endpoint remains
the final authority.

## Handoff A — Delivered execution-action contract is required

**ID:** `BE-AW-001`
**Priority:** `BLOCKING_CONTRACT`
**Status:** `BE_HANDOFF_REQUIRED`

| Field | Required backend delivery |
| --- | --- |
| Affected actor | Student Leader, Student Member, and Primary Supervisor where the existing command permits the operation. Discipline Mentor must not inherit Primary authority. |
| Affected FE route/component | `project/tasks`, `project/milestones`, `project/reports`, `project/meetings`, `project/tasks/:taskId`, and their supervisor-scoped equivalents. |
| Existing Backend behavior | Task, milestone, report, and meeting mutations already enforce project/resource state and persisted scope. An execution-actions implementation exists only as uncommitted backend working-tree material, so it is not a delivered contract. |
| Missing contract | Commit, test, publish, and deploy `GET /api/v1/projects/{projectId}/execution-actions`, `GET /api/v1/tasks/{taskId}/execution-actions`, and `GET /api/v1/milestones/{milestoneId}/execution-actions`. |
| Proposed DTO | `{ asOfUtc, projectId, resourceId?, status, concurrencyToken?, actions: [{ code, allowed, reasons }] }`. Unknown action must be absent or `{ allowed: false }`. |
| Authoritative scope/state rules | Reuse command/repository predicates exactly. Project codes: `create_task`, `create_milestone`, `reorder_milestones`, `create_progress_report`, `schedule_meeting`. Task codes: `update_task`, `delete_task`, `assign_task`, `change_task_status`, `manage_task_dependencies`, `manage_task_disciplines`. Milestone codes: `update_milestone`, `delete_milestone`. No aggregate `manage` code. Project/resource inactive, foreign scope, ended assignment, and non-primary supervisor rules must deny deterministically. |
| Concurrency requirements | An action read changes no data, reserves no capacity, and never promises a later mutation. Every write retains its current token/`409` behavior. |
| Expected errors | `401` unauthenticated; `403` out of project or actor scope; `404` missing project/resource; `409` only at the mutation when state/token/race changes. Action reasons should be stable machine codes such as the command's actual state/scope failure, not role prose. |
| FE before delivery | Calls are attempted only through the dedicated action endpoints. Any error, missing code, or `allowed:false` hides the relevant CTA. Existing mutation endpoints are not called speculatively. |
| FE after delivery | UI renders only the exact returned codes, refreshes action state after writes, and still displays mutation `403`/`409` as final authority. |
| Acceptance scenarios | Leader permitted only where task/milestone guard permits; Member can transition only an assigned task when command permits but cannot manage plan; Primary Supervisor gets only existing scoped operations; Discipline Mentor cannot perform Primary structural operations; foreign project and archived state deny; a stale token returns `409` only from the write. |

## Handoff B — source-aware evidence write capability

**ID:** `BE-AW-002`
**Priority:** `BLOCKING_CONTRACT`
**Status:** `BE_HANDOFF_REQUIRED`

| Field | Required backend delivery |
| --- | --- |
| Affected actor | Any writer with a persisted scope for a concrete `TASK`, `DELIVERABLE`, `MEETING`, `PROGRESS_REPORT`, or `FILE` source. |
| Affected FE route/component | `ProjectEvidenceLedger`, task detail evidence panel, student project evidence route, supervisor project evidence route. |
| Existing Backend behavior | `GET /api/v1/projects/{projectId}/evidence` supports page, `sourceType`, `majorId`, and `verificationStatus`. `POST /api/v1/projects/{projectId}/evidence` validates project/source/major/scope server-side and is final authority. |
| Missing contract | A source-level action read, for example `GET /api/v1/projects/{projectId}/evidence-sources/{sourceType}/{sourceId}/actions`, returning `add_evidence` for that specific source. A task action may include `add_evidence` only if it uses exactly the same source and discipline scope guard as the POST. No project-level `add_evidence`. |
| Proposed DTO | `{ projectId, sourceType, sourceId, sourceStatus, actions: [{ code: "add_evidence", allowed, reasons }] }`. It should be valid only for a source that belongs to the requested project. |
| Authoritative scope/state rules | Source existence, source-project relationship, source state, project state, actor membership/assignment, and major scope must reuse the evidence service predicates. Mentor access must be limited to the assigned major/task discipline and must not be inferred from lecturer role. |
| Concurrency requirements | Identical submission remains backend-idempotent (`200` existing/created evidence). A different-notes duplicate remains conflict; the UI must preserve the draft and refresh the ledger. |
| Expected errors | `403` scope denied; `404` missing/foreign source without source disclosure; `409` conflicting duplicate or source/project state change; `400` invalid source/major pair. |
| FE before delivery | Ledger is fully read-only; all create/delete affordances are hidden. A source from another project is never offered as selectable evidence. |
| FE after delivery | The create form appears only after a current source action says `add_evidence: allowed`. On `200`, refresh list; on `409`, preserve draft and show conflict; on `403`/`404`, keep form data but do not retry automatically. |
| Acceptance scenarios | Task source allowed only for its actual writer; a delivery/meeting/report/file source cannot inherit task permission; cross-project source denied; same payload idempotent; changed notes conflict; `PENDING` is shown exactly as returned and never upgraded by FE. |

## Handoff C — Mentor workspace resource scope

**ID:** `BE-AW-003`
**Priority:** `BLOCKING_CONTRACT`
**Status:** `BE_HANDOFF_REQUIRED`

| Field | Required backend delivery |
| --- | --- |
| Affected actor | Lecturer with an active `DISCIPLINE_MENTOR` assignment and a non-null assigned `majorId`. |
| Affected FE route/component | Proposed `mentor/workspace` and `mentor/projects/:projectId/majors/:majorId` route guard and workspace. |
| Existing Backend behavior | Own supervisor assignments return `assignmentType`, `majorId`, and `endedAt`; assignment records distinguish `PRIMARY` and `DISCIPLINE_MENTOR`. Read authorization for each project resource is not exposed as one mentor-scoped workspace contract. |
| Missing contract | A read-only mentor context/capability endpoint, e.g. `GET /api/v1/mentor/projects/{projectId}/majors/{majorId}/workspace-context`, or equivalent source-scoped actions on the existing resource endpoints. |
| Proposed DTO | `{ projectId, majorId, assignment: { id, assignmentType, active }, readableResources: [{ code, allowed, reasons }] }`, including only task discipline, scoped evidence, progress, meetings, and follow-up resources whose existing guards permit reading. |
| Authoritative scope/state rules | Current authenticated lecturer must own an unended `DISCIPLINE_MENTOR` assignment for the exact project and major. `PRIMARY`, evaluator, ended/revoked, or foreign assignment must not satisfy this contract. Do not grant structural plan, project transition, supervisor replacement, evaluation, grading, or result publication. |
| Concurrency requirements | Assignment revocation must make the next context/resource read deny. URLs never confer access. |
| Expected errors | `401` unauthenticated; `403` actor/assignment/major mismatch; `404` missing project/major; `409` only for a resource mutation that already uses concurrency. |
| FE before delivery | The frontend may use the existing own-assignment response only to guard a read-only mentor entry by exact type/project/major. Each resource is then read from its current endpoint and fails independently; no write control appears. |
| FE after delivery | Guard fetches the persisted context for every direct route entry and refreshes it after navigation/resume; each resource failure remains isolated and the context removes unsupported resource links earlier. |
| Acceptance scenarios | Active mentor sees only assigned project/major; ended mentor is redirected; mentor is not accepted as Primary; evaluator assignment alone is denied; foreign project direct URL is denied; structural/evaluation controls never appear without a separate action. |

## Handoff D — Department governance workspace aggregate

**ID:** `BE-AW-004`
**Priority:** `OPTIMIZATION`
**Status:** `BE_HANDOFF_REQUIRED`

| Field | Required backend delivery |
| --- | --- |
| Feature | Department governance landing aggregate for review, active-project attention, supervisor assignment issues, final submission and evaluation readiness. |
| Affected actor | `DEPARTMENT_STAFF` with an active persisted department scope; never `ADMIN` by role substitution. |
| Affected FE route/component | `/department/workspace`, `DepartmentWorkspacePage`. |
| Current Backend | FE composes `GET /projects/review-queue`, `GET /dashboards/department`, supervisor directory and workflow-period reads. Each source is useful and independently scoped, but none is a single authoritative governance queue. |
| Why FE cannot infer it | Cross-resource ordering and readiness would otherwise be a client-created business state; current counts may be paged or represent different snapshots. |
| Missing contract | Optional `GET /departments/me/governance-workspace` DTO with `asOfUtc`, scoped summary, actionable records and each item's resource link/state. |
| Proposed API/DTO | `{ departmentId, asOfUtc, reviewQueue, attention: [{ projectId, source, status, receivedAt?, reasons }], supervisorIssues, finalSubmissionReadiness, evaluationReadiness }`. Counts must be facts returned by services, not client-derived readiness. |
| Authoritative scope/state rules | Resolve authenticated staff's current department scope server-side. Include only project/period resources the current actor can read. Do not expose a whole-project decision to a participating department unless existing workflow action permits it. |
| Concurrency | Read is advisory; every linked mutation still obtains the current project action/snapshot/token and handles `409`. |
| Expected status/error codes | `401` unauthenticated; `403` inactive/out-of-scope staff; `503` aggregation dependency unavailable; `200` may contain independent per-widget warnings. |
| FE behavior before delivery | Current safe composition remains. Portfolio filtering produces presentation-only attention and never enables a mutation. |
| FE behavior after delivery | Use aggregate for ordering/counts while retaining project review actions as authority. |
| Acceptance tests | Lead and participating staff see only their scope; outside staff sees `403`; unavailable aggregate does not blank read sections; an aggregate count never enables approve/publish. |

## Handoff E — Department policy, evaluation, final-result and supervisor governance reads

**ID:** `BE-AW-005`
**Priority:** `BLOCKING_CONTRACT`
**Status:** `BE_HANDOFF_REQUIRED`

| Field | Required backend delivery |
| --- | --- |
| Feature | Department-scoped, read-only governance details for policy versions/effective rules, supervisor assignment history/capacity, evaluation scope/eligibility, final-submission readiness and result visibility. |
| Affected actor | `DEPARTMENT_STAFF` within persisted department/project/period scope; Lead and participating scope must be represented separately. |
| Affected FE route/component | `/department/workspace` policy, Supervisors, Evaluation / Audit regions. |
| Current Backend | Workflow context exposes project periods only; supervisor directory exposes availability/expertise only; scheme/assignment/result APIs are project-scoped. There is no scoped read model that joins policy version, assignment history, `COMMON`/`MAJOR_SPECIFIC`/`INDIVIDUAL` evaluation state, final readiness, result visibility and archive state. |
| Why FE cannot infer it | Joining unrelated project-scoped data cannot prove Department participation, current policy applicability, evaluator eligibility, result visibility or a publish-ready state. |
| Missing contract | Read-only department governance resources, either a scoped project detail endpoint or separate period/supervisor/evaluation/final endpoints. They must not be inferred from an Admin management API. |
| Proposed API/DTO | `GET /departments/me/projects/{projectId}/governance-read-model` with `{ projectScope: { leadDepartmentId, participatingDepartmentIds, actorRelation }, policy, supervisors, evaluation, finalSubmission, result, archive }`. Nullable sections and `warnings` are required for partial delivery. |
| Authoritative scope/state rules | Backend resolves exact Department role/scope, project participation, archive state and current period. A participating department may read its own scope but cannot receive `approve_project` from this DTO. Archived resources are read-only. |
| Concurrency | The read model does not mint a command token. Existing review/result/evaluator writes retain their own snapshot/concurrency tokens and return `409` on staleness. |
| Expected status/error codes | `401` unauthenticated; `403` role/scope mismatch; `404` missing or undisclosable project; `409` only from underlying mutation; `200` partial sections may be null with a stable warning code. |
| FE behavior before delivery | Show only current period facts and directory facts; label evaluation/final/result aggregate as unavailable and render no publish/assignment/policy CTA. |
| FE behavior after delivery | Render delivered read facts, preserve per-section unavailable/forbidden states, and expose a mutation only when a separate existing Backend action permits it. |
| Acceptance tests | Lead vs participating read scope; Admin does not substitute for Department; foreign project `403/404`; archived project has no mutation; missing evaluation/final section does not hide review queue; stale write remains `409`. |

## Handoff F — evaluator assignment workspace context

**ID:** `BE-AW-006`
**Priority:** `BLOCKING_CONTRACT`
**Status:** `BE_HANDOFF_REQUIRED`

| Field | Required backend delivery |
| --- | --- |
| Feature | Canonical evaluator assignment detail and workspace projection. |
| Affected actor | A lecturer with an active persisted `EvaluationAssignment`; supervisor, mentor and ordinary lecturer identities remain separate. |
| Affected FE route/component | `/evaluator/workspace`, `/evaluator/assignments/:assignmentId`, `EvaluatorAssignmentRoute`. |
| Existing Backend | `GET /evaluation-assignments/my` lists active assignments only; draft lookup is indirect through `GET /projects/{projectId}/evaluations`. The draft commands independently enforce assignment, project, period and rubric rules. |
| Missing contract | `GET /evaluation-assignments/{assignmentId}/workspace` (or equivalent) returning only the caller's assignment, its current `ACTIVE`/`REVOKED`/completed state, project/component display facts, rubric version, target names, evaluation-window facts and optionally current draft summary. |
| Why FE cannot infer it | A client cannot distinguish a foreign ID, a deleted ID and a revoked/ended assignment from an active-only list. Project-scoped evaluation list also cannot provide deadline, component name or a definitive assignment lifecycle state. |
| Proposed API/DTO | `{ assignment, project, component, scope: { code, major?, student? }, evaluationWindow, draft?: { id, status, updatedAt }, allowedReads, warnings }`. `scope.code` must be `COMMON`, `MAJOR_SPECIFIC` or `INDIVIDUAL`; target names may be null without removing IDs. |
| Assignment/scope rules | Resolve current evaluator identity and exact active assignment server-side. A `MAJOR_SPECIFIC` projection returns only its persisted major; an `INDIVIDUAL` projection returns only its persisted student. Supervisor/mentor identity must not substitute. |
| Project/evaluation state rules | Include immutable reason codes for revoked, completed, archived, closed-window or locked-package conditions. The read must not mint write authority; save/finalize retain command guards. |
| Concurrency | Include current draft token only when a current draft is returned. Assignment revocation/close must make the next read deny or return the terminal state; writes retain `409` on stale token. |
| Expected errors | `401` unauthenticated; `403` undisclosable foreign assignment; `404` missing assignment; `409` only for later command races; `200` terminal assignment state is allowed when it is safe to disclose. |
| FE behavior before Backend delivery | Page scans the paged active-assignment list and fails closed when ID is absent. It does not distinguish not-found from revoked or expose target names/deadline not returned. |
| FE behavior after Backend delivery | Direct route renders explicit ready, denied, not-found, revoked and completed states from the projection and refreshes it after each mutation/navigation. |
| Acceptance scenarios | Lecturer without assignment, primary supervisor only, mentor only and foreign evaluator ID deny; an active evaluator sees exactly one assigned major/student; revoked assignment loses write after refresh; closed window is explained without client eligibility calculation. |

## Handoff G — evaluator-scoped final package and evidence

**ID:** `BE-AW-007`
**Priority:** `BLOCKING_CONTRACT`
**Status:** `BE_HANDOFF_REQUIRED`

| Field | Required backend delivery |
| --- | --- |
| Feature | Read-only final submission/evidence projection scoped to one evaluator assignment. |
| Affected actor | Active evaluator for the exact assignment scope. |
| Affected FE route/component | `/evaluator/assignments/:assignmentId`, final package and evidence regions. |
| Existing Backend | `GET /projects/{projectId}/final-submission` authorizes an active evaluator as a project reader. It returns a whole project package and contains no `COMMON`/major/student applicability for evidence/files. |
| Missing contract | `GET /evaluation-assignments/{assignmentId}/evidence-package` returning assignment-scoped package metadata, readable deliverable versions/files/evidence, scope metadata, and per-section warnings. |
| Why FE cannot infer it | Hiding unrelated rows after receiving a full package does not prevent disclosure and no client predicate can prove which file/evidence belongs to a major or individual target. |
| Proposed API/DTO | `{ assignmentId, scope, package?: { id, status, submittedAt, items }, evidence: [{ id, source, majorId?, studentId?, files }], warnings }`; omitted sections must have deterministic reason codes. |
| Assignment/scope rules | `COMMON` may contain only contract-defined common/project evidence. `MAJOR_SPECIFIC` may contain the assigned major only. `INDIVIDUAL` may contain the assigned student/applicable evidence only. The server must recheck active assignment, department, project state and supervisor-type constraint. |
| Project/evaluation state rules | Locked final package may be read only while server scope permits. Revoked/ended assignment removes future read. No evaluator mutation, readiness decision or final-submission submit capability is included. |
| Concurrency | Package snapshots are immutable; response includes snapshot/version identifiers. A later write to another resource never grants access; download endpoint rechecks current assignment scope. |
| Expected errors | `401` unauthenticated; `403` foreign/revoked/scope mismatch; `404` no safe package/evidence disclosure; `409` stale snapshot only if a future explicit snapshot token is requested. |
| FE behavior before Backend delivery | No package files/evidence are shown in the new evaluator workspace; no client-side filter is offered as security. |
| FE behavior after Backend delivery | Render only returned items, retain independent unavailable/forbidden states and use returned download links/tokens; no mutation CTA. |
| Acceptance scenarios | COMMON cannot browse major/private evidence; major evaluator cannot switch major; individual evaluator cannot see another student; revoked evaluator loses package read; final files and evidence downloads deny after revocation. |

## Handoff H — evaluator-authorized rubric hierarchy projection

**ID:** `BE-AW-008`
**Priority:** `OPTIMIZATION`
**Status:** `BE_HANDOFF_REQUIRED`

| Field | Required backend delivery |
| --- | --- |
| Feature | Read-only rubric hierarchy/version metadata for an already authorized evaluator assignment. |
| Affected actor | Active evaluator for an assignment draft or finalized evaluation. |
| Affected FE route/component | `/evaluator/assignments/:assignmentId`, rubric context. |
| Existing Backend | `EvaluationDraftDto` returns protected rubric version and leaf score criteria. Save validates that only leaf criteria are scored. |
| Missing contract | Assignment/draft-scoped hierarchy with parent groups, effective weights, descriptions and leaf flags. |
| Why FE cannot infer it | Parent-child hierarchy and display weights must come from the protected rubric version; recreating it from leaf rows changes meaning and could display stale mutable rubric metadata. |
| Proposed API/DTO | Include `rubric: { id, rootId, version, criteria: [{ id, parentId?, name, description?, effectiveWeightPercent, maxScore?, isLeaf, required }] }` in `BE-AW-006` or `GET /evaluations/{id}/rubric`. |
| Assignment/scope rules | Only the assignment's frozen/published rubric version is returned. Parent rows are aggregate/read-only; only `isLeaf:true` criteria can be saved through existing draft command. |
| Project/evaluation state rules | Finalized evaluation uses the finalization snapshot; draft uses protected version. This read does not permit rubric administration or version changes. |
| Concurrency | Draft token remains on draft command; hierarchy version/snapshot ID detects an obsolete display. |
| Expected errors | `401` unauthenticated; `403` assignment mismatch; `404` undisclosable evaluation; `409` corrupt/obsolete protected version. |
| FE behavior before Backend delivery | Show only returned leaf criteria and an explicit explanation; never create parent score inputs. |
| FE behavior after Backend delivery | Render hierarchy read-only with accessible grouping, while retaining leaf-only score controls. |
| Acceptance scenarios | Nested rubric displays parents without inputs; leaf score saves; foreign evaluator cannot read hierarchy; finalized hierarchy matches evaluation snapshot even if live rubric changes. |

## Handoff I — administrative account update and academic-profile scope

**ID:** `BE-AW-009`
**Priority:** `BLOCKING_CONTRACT`
**Status:** `BE_HANDOFF_REQUIRED`

| Field | Required backend delivery |
| --- | --- |
| Feature | Administrative update of an existing account identity and academic-profile links. |
| Affected actor | Persisted `ADMIN` authorized by account-security policy; Department Staff must not substitute. |
| Affected FE route/component | `/admin/access/users/:userId`, `AdminUserDetailPage`. |
| Existing Backend | `GET /users/{id}`, create/import, lifecycle and global role endpoints are delivered. `PUT /users/me/profile` is self-service only; academic-profile verification is academic-management scoped. |
| Missing contract | `PUT /api/v1/users/{userId}` and a separately explicit academic-profile scope command/read with policy-protected fields. |
| Why FE cannot infer safely | A visible department/major ID cannot establish valid role shape, parent organization, account status, or downstream academic integrity. |
| Proposed API/DTO | `{ concurrencyToken, fullName, phone?, title?, studentCode?, employeeCode?, academicProfile?: { organizationId?, departmentId?, majorId? } }` with returned account/profile state and validation issues. |
| Authority/resource scope | Resolve Admin policy server-side; validate role-to-profile shape and active hierarchy parentage. This never grants project, supervisor, evaluator or Department-review scope. |
| State rules | Inactive parent/invalid role link/duplicate code deny; existing project data is not silently rewritten. |
| Concurrency | Required optimistic token; stale update returns `409` and FE retains input then reloads authoritative state. |
| Expected errors | `400` validation; `401`; `403`; `404` undisclosable user; `409` duplicate/stale/integrity conflict. |
| FE behavior before delivery | Identity and profile fields remain read-only; no local patch is fabricated. |
| FE behavior after delivery | Show an explicit edit form, preserve recoverable input, confirm scope impact, and refresh after accepted write. |
| Acceptance tests | Non-Admin/Department deny; invalid role/profile combination deny; inactive parent deny; stale token preserves form; valid update emits audit metadata. |

## Handoff J — constrained platform role and permission catalogue policy

**ID:** `BE-AW-010`
**Priority:** `BLOCKING_CONTRACT`
**Status:** `BE_HANDOFF_REQUIRED`

| Field | Required backend delivery |
| --- | --- |
| Feature | Safe platform-catalogue creation/deletion and global-role assignment. |
| Affected actor | Persisted `ADMIN` only. |
| Affected FE route/component | `/admin/access/rbac`, account detail role controls. |
| Existing Backend | Generic role/permission create, update, delete and mapping commands are account-security protected; role codes are otherwise arbitrary. |
| Missing contract | Catalogue classification/allow-list for identity roles, platform custom roles, system records, and forbidden resource-scoped concepts. |
| Why FE cannot infer safely | String filtering cannot prove a new role is not a project assignment such as `EVALUATOR`, `TEAM_LEADER`, or `PRIMARY_SUPERVISOR`. |
| Proposed API/DTO | Add `{ category: IDENTITY|PLATFORM|RESOURCE_SCOPED, assignableGlobally, mutable, reasons }` to role DTOs and reject resource-scoped codes on global role commands. |
| Authority/resource scope | Backend validates role semantics and protects system roles; permission mapping remains metadata and never bypasses project/department/assignment scope. |
| State rules | Protected role deletion/change denies; last active Admin rules remain unchanged. |
| Concurrency | Add role catalogue/version token if mappings are edited concurrently; otherwise server returns deterministic conflict. |
| Expected errors | `400` invalid category; `401`; `403`; `404`; `409` duplicate/protected/stale. |
| FE behavior before delivery | Role/permission mutation and user-role assignment are fail-closed; existing mapping read/write is retained because it targets a selected returned role. |
| FE behavior after delivery | Offer only backend-classified global roles and policy-permitted catalogue actions. |
| Acceptance tests | Admin may assign `ADMIN`/`LECTURER`; attempts for evaluator/team/supervisor resource concepts deny; permission grant never authorizes an out-of-scope project mutation. |

## Handoff K — bounded actor-scoped Calendar and Attention projection

**ID:** `BE-AW-011`
**Priority:** `BLOCKING_CONTRACT`
**Status:** `BE_HANDOFF_REQUIRED`

| Field | Required backend delivery |
| --- | --- |
| Feature | Unified calendar and deterministic attention facts across resources. |
| Affected actors | Assigned Supervisor, active Discipline Mentor, Department Staff, active Evaluator and Admin. Student current-project composition may consume this later. |
| FE consumer | Shared `/calendar`, `CalendarAttentionPage`, source-status and deep-link regions. |
| Existing Backend behavior | Project-scoped task/milestone/meeting/deliverable/final reads are independently protected. Student dashboard has dated deadline arrays. Supervisor/Department dashboards have scoped counts and paged projects, but no dated resource rows. My evaluator assignments are active-only and paged but have no evaluation window/deadline. |
| Missing contract | Read-only actor-scoped projection such as `GET /api/v1/workspaces/calendar-attention?from=YYYY-MM-DD&to=YYYY-MM-DD&sources=...&cursor=...`. It is not a command/action endpoint and does not persist a universal Event aggregate. |
| Why FE cannot infer safely | Fan-out cannot prove every readable project, has divergent paging/snapshots, and cannot reinterpret report periods, assignment timestamps or dashboard counts as deadlines. Client-side hiding after fetch is not an authorization boundary. |
| Proposed API/DTO | `{ asOfUtc, range:{from,to}, items:[{sourceType,sourceId,projectId?,projectName?,title,startAt?,endAt?,dueAt?,dateKind:DATE_ONLY|DATE_TIME,status,scopeLabel?,deepLinkHint?,metadata?}], attention:[{code,sourceType,sourceId,projectId?,title,description,dueAt?,status}], nextCursor?, sourceWarnings:[{source,code,message?}] }`. No risk score, severity decision or action grant. |
| Authoritative scope/state rules | Resolve identity, assignment, Department/major scope, project visibility and resource lifecycle server-side for every row. Supervisor is not blanket Lecturer; Mentor needs exact active project-major assignment; Evaluator needs active assignment; Admin does not substitute for Department/project scope. Historical records may be returned but ordinary Attention requires an explicit returned fact. |
| Date/time requirements | Report deadline must be explicitly persisted; `periodEnd` is not one. Evaluation window/deadline must be explicit. `DATE_ONLY` is never timezone-converted and DateTime declares UTC/offset. Undated resources are omitted rather than filled with placeholders. |
| Pagination/range | Require cursor/stable page token, bounded requested range and deterministic ordering/snapshot (`asOfUtc`). Return `nextCursor`; do not require FE to enumerate project pages. Source warnings distinguish empty complete data from partial/unavailable data. |
| Concurrency requirements | Read-only; mints no command token. A linked mutation re-evaluates current policy/token independently and may return `409`. Projection never authorizes mutation. |
| Expected errors | `401` unauthenticated; `403` actor/scope denied; `400` bad range/source; `404` only where safe to disclose; `429/503` aggregation unavailable. Prefer `200` with per-source warning codes for independent degradation. |
| FE behavior before delivery | Render only independently authorized bounded sources, mark multi-project calendar sources unavailable/partial, create no invented deadline or all-clear claim, and keep all controls read-only. |
| FE behavior after delivery | Use returned projection/source warnings for range navigation and pagination. Deep links remain navigation only; existing route/mutation guards remain final authority. |
| Acceptance scenarios | Student current project DateOnly milestone and UTC meeting; Supervisor only assigned projects; Mentor exact active project-major; Department only persisted scope; revoked evaluator absent; Admin not given Department/project events; report period without deadline omitted; evaluation window included; next cursor is partial not all clear; linked stale write still returns `409`. |
