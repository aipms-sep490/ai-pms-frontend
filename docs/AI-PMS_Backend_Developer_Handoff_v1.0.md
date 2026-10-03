# AI-PMS — Backend Developer Handoff v1.0

**Trạng thái tài liệu:** FROZEN HANDOFF BASELINE
**Ngày freeze:** 2026-10-03
**Mục đích:** giao cho Backend Developer toàn bộ contract còn thiếu sau khi Frontend đã hoàn tất Phase 0–8 theo chiến lược FE-first, BE read-only audit, final sync một lần.

---

## 1. Executive Summary

Frontend AI-PMS đã được đóng băng tại:

- **FE repository:** `aipms-sep490/ai-pms-frontend`
- **Freeze commit:** `474e742e9aa09f46f6e950f95453c07b546ea588`
- **Freeze branch:** `chore/final-fe-be-sync-v3`
- **Commit:** `feat(ai): integrate advisory AI into governed workspaces`

Frontend hiện **không cần thêm feature phase mới**. Công việc Backend lúc này là hoàn thiện các contract được đánh dấu `FINAL_SYNC_BLOCKER`, kiểm thử đầy đủ, sau đó mới mở Final FE–BE Synchronization.

Backend đã được audit read-only tại local state:

- **Audited branch:** `feat/pre-phase-4-execution-closure`
- **Audited SHA:** `c23eeef69fef242acfcbf3d76aea98efd4eb6298`
- Worktree Backend có dirty changes từ trước. Các thay đổi này **không được coi là contract đã giao cho FE** nếu chưa commit/test/publish chính thức.
- Trước khi code, Backend Developer phải fetch và xác định lại `origin/develop`, merge-base, divergence và tạo **clean handoff worktree** để tránh kéo nhầm experimental changes.

---

## 2. Nguồn yêu cầu chính thức

Backend Developer phải đọc các tài liệu FE freeze sau như specification đầu vào:

1. `docs/AI-PMS_Backend_Developer_Handoff_v1.0.md`
2. `docs/AI-PMS_Frontend_Full_Implementation_Audit_v1.0.md`

Các matrix FE liên quan:

- `docs/STUDENT_EXECUTION_MATRIX.md`
- `docs/SUPERVISOR_WORKSPACE_MATRIX.md`
- `docs/DEPARTMENT_ACADEMIC_GOVERNANCE_MATRIX.md`
- `docs/EVALUATOR_WORKSPACE_MATRIX.md`
- `docs/ADMIN_WORKSPACE_MATRIX.md`
- `docs/CALENDAR_ATTENTION_WORKSPACE_MATRIX.md`
- `docs/AI_ADVISORY_WORKSPACE_MATRIX.md`

Business baseline được sử dụng xuyên suốt:

- AI-PMS Hybrid Business Workflow
- Software Requirement Specification
- Software Design Document
- Interdisciplinary Governance Baseline v3.0

---

## 3. Non-negotiable business invariants

### 3.1 Global identity roles

Chỉ các identity role sau là global:

- `ADMIN`
- `DEPARTMENT_STAFF`
- `LECTURER`
- `STUDENT`

### 3.2 Resource/project scoped assignments

Các trách nhiệm sau **không được biến thành global RBAC role**:

- `TEAM_LEADER`
- `TEAM_MEMBER`
- `PRIMARY_SUPERVISOR`
- `DISCIPLINE_MENTOR`
- `EVALUATOR`
- `INDUSTRY_EXPERT`

Authority phải được xác định từ:

**Identity Role + Permission + Resource Scope + Project-scoped Assignment + Project/Artifact State + Business Rules**

### 3.3 Actor boundaries

- `ADMIN != DEPARTMENT_STAFF`
- `LECTURER != PRIMARY_SUPERVISOR`
- `LECTURER != DISCIPLINE_MENTOR`
- `LECTURER != EVALUATOR`
- `PRIMARY_SUPERVISOR != DISCIPLINE_MENTOR`
- `PRIMARY_SUPERVISOR != EVALUATOR`
- `DISCIPLINE_MENTOR != EVALUATOR`
- Lead Department != Participating Department
- Student Leader != Student Member

### 3.4 Backend authority

Frontend chỉ dùng visibility/disabled state cho UX. Backend vẫn là authority cuối cùng cho mọi critical mutation.

- `403`: không optimistic success, không silent retry.
- `409`: giữ draft/input khi phù hợp, fetch latest authoritative state, không auto replay.
- Unknown/loading/unavailable/unsupported **không bao giờ được hiểu là allowed**.
- Direct URL/resource ID không tạo quyền.
- Client không được tự gửi department/major scope rồi coi đó là authority.

### 3.5 Project lifecycle

Giữ canonical project lifecycle hiện có:

`DRAFT → SUBMITTED → UNDER_REVIEW → REVISION_REQUIRED / REJECTED / APPROVED → SUPERVISOR_PENDING → ACTIVE → FINAL_SUBMISSION → COMPLETED → ARCHIVED`

`ARCHIVED` là read-only.

### 3.6 AI boundary

AI chỉ:

- summarize
- analyze
- predict advisory risk
- explain
- rank deterministic eligible candidates
- suggest follow-up action

AI **không được**:

- approve/reject project
- transition Project State
- assign supervisor/mentor/evaluator
- change task owner
- complete privileged task/state
- write rubric score/final grade
- publish result
- bypass deterministic authorization

---

# 4. Handoff classification

## 4.1 FINAL_SYNC_BLOCKER

Backend phải hoàn thành toàn bộ các ID này trước Final FE–BE Synchronization:

| ID | Capability |
|---|---|
| `BE-AW-001` | Authoritative execution capability/read-action contract |
| `BE-AW-002` | Source-aware evidence capability/authority |
| `BE-AW-003` | Discipline Mentor resource scope |
| `BE-AW-005` | Department scoped governance/evaluation/final-result read model |
| `BE-AW-006` | Canonical Evaluator assignment/workspace detail projection |
| `BE-AW-007` | Evaluator-scoped final package and evidence read model |
| `BE-AW-009` | Admin identity / academic-profile scope update contract |
| `BE-AW-010` | Global platform-role classification and safe role management |
| `BE-AW-011` | Actor-scoped, date-range/cursor Calendar projection |

## 4.2 POST_SYNC_OPTIMIZATION

Không chặn Final Sync correctness:

| ID | Capability |
|---|---|
| `BE-AW-004` | Department governance aggregate optimization |
| `BE-AW-008` | Protected rubric hierarchy/version projection |
| `BE-AW-012` | Structured AI factor/evidence/navigation metadata |

## 4.3 OPTIONAL / FUTURE

| ID | Capability |
|---|---|
| `BE-AW-013` | AI Supervisor ranking after deterministic eligibility filtering |

---

# 5. BE-AW-001 — Authoritative Execution Capability Contract

## 5.1 Mục tiêu

FE hiện đã loại bỏ việc suy quyền từ `isLeader`, `isSupervisor`, URL hoặc local state. Tuy nhiên các execution mutation cần Backend trả về action/capability theo đúng command-side predicates.

Các proposed routes đã được FE audit sử dụng như target contract:

- `GET /api/v1/projects/{projectId}/execution-actions`
- `GET /api/v1/tasks/{taskId}/execution-actions`
- `GET /api/v1/milestones/{milestoneId}/execution-actions`

Nếu Backend chọn shape khác, phải cung cấp compatibility mapping rõ ràng để Final Sync không phải đoán.

## 5.2 Project-level capability concepts

Tối thiểu cần bao phủ các action thực tế mà FE sử dụng, ví dụ:

- `create_task`
- `create_milestone`
- `reorder_milestones`
- `create_progress_report`
- `schedule_meeting`

Tên cuối cùng phải bám frozen handoff nếu đã được chốt trong audit.

## 5.3 Task-level capability concepts

- `update_task`
- `delete_task`
- `assign_task`
- `change_task_status`
- `manage_task_dependencies`
- `manage_task_disciplines`
- evidence-related action chỉ được trả `allowed=true` khi source-aware authority thực sự được chứng minh

## 5.4 Milestone-level concepts

- update milestone
- delete milestone
- reorder/structural operation theo contract hiện có

## 5.5 Quy tắc triển khai

Read/action contract phải **reuse cùng authorization/domain predicates của mutation**.

Không được viết logic kiểu:

- `role == STUDENT => allowed`
- `role == LECTURER => structural manager`
- `isProjectLecturer => allow`

Primary Supervisor và Discipline Mentor phải khác nhau về structural authority.

## 5.6 Acceptance bắt buộc

- Leader hợp lệ nhận đúng actions.
- Member chỉ nhận action theo assignment/resource state.
- Primary Supervisor nhận đúng supervision/plan actions hiện hành.
- Mentor không tự nhận full structural authority.
- Foreign project actor bị deny.
- Invalid project state bị deny.
- Missing/unknown action không trở thành allowed.
- Mutation vẫn revalidate lại sau read capability.

---

# 6. BE-AW-002 — Source-aware Evidence Authority

## 6.1 Mục tiêu

Evidence không thể được bảo vệ bằng một boolean project-level `add_evidence=true` nếu quyền còn phụ thuộc `sourceType` + `sourceId` + project ownership + assignment/major scope.

## 6.2 Backend phải tự resolve

- current actor
- project
- source type
- source ID
- source belongs to project
- source-specific writer authority
- major scope nếu có
- project state
- task/source assignment nếu rule yêu cầu

Không tin client claim về project ownership.

## 6.3 Security cases

Bắt buộc test:

- source thuộc project khác
- task member không được assign
- mentor sai major
- assignment đã ended/replaced
- project không ở writable state
- ARCHIVED
- duplicate/idempotent evidence
- client cố fabricate `VERIFIED`

---

# 7. BE-AW-003 — Discipline Mentor Resource Scope

## 7.1 Authority source

Mentor access phải đến từ persisted assignment:

- assignment type = `DISCIPLINE_MENTOR`
- exact `projectId`
- exact `majorId`
- active/effective state
- not ended/replaced

`LECTURER` identity không đủ.

## 7.2 Mentor không được tự có

- Primary Supervisor structural authority
- project-wide mutation
- Project State transition
- grading
- evaluator authority
- cross-major access

Nếu một Lecturer đồng thời có Primary Supervisor/Evaluator assignment, từng capability vẫn phải resolve từ đúng assignment của nó.

## 7.3 Acceptance

- exact project + major active mentor: allowed theo scope
- wrong major: denied
- wrong project: denied
- ended/replaced assignment: denied
- generic Lecturer: denied
- Primary Supervisor nhưng không mentor: không tự nhận mentor scope

---

# 8. BE-AW-005 — Department Governance / Evaluation / Final-result Read Model

## 8.1 Mục tiêu

FE Department Workspace đã tồn tại nhưng một số governance aggregate/readiness không thể tính an toàn ở client.

Backend cần cung cấp authoritative read model cho những dữ liệu được frozen handoff yêu cầu, có thể bao gồm:

- review/governance state
- Lead vs Participating Department scope
- supervisor/evaluator governance
- final submission governance
- evaluation readiness
- publication readiness
- exact blockers/reasons
- result state/visibility

Không yêu cầu FE tự tính readiness.

## 8.2 Lead vs Participating

Lead Department có whole-project orchestration theo policy.

Participating Department chỉ được own-discipline/department scope.

Client-supplied `departmentId` không được dùng làm authority.

## 8.3 Admin boundary

`ADMIN` không trở thành Department academic actor.

## 8.4 Acceptance

- Lead Department projection đúng.
- Participating Department projection chỉ scope riêng.
- Wrong Department denied.
- Admin không nhận academic governance.
- Student/Supervisor không đọc privileged Department data ngoài scope.
- Readiness/blockers deterministic và reproducible.

---

# 9. BE-AW-006 — Canonical Evaluator Assignment Detail Projection

## 9.1 Authority

Persisted active `EvaluationAssignment` là bắt buộc.

`LECTURER` đơn thuần không phải Evaluator.

## 9.2 Scope cần hỗ trợ

- `COMMON`
- `MAJOR_SPECIFIC`
- `INDIVIDUAL`

DTO cần đủ metadata để FE không tự broadening scope, ví dụ theo contract thực tế:

- assignment
- project
- component
- major target
- student target
- scheme/rubric version
- assignment status
- evaluation status

## 9.3 IDOR cases

- foreign assignment
- revoked assignment
- wrong project
- wrong major
- wrong student
- assignment của evaluator khác

Không leak metadata không cần thiết trước authorization.

---

# 10. BE-AW-007 — Evaluator-scoped Final Package and Evidence

Evaluator không được đọc full project evidence chỉ vì có assignment.

Read model phải bind vào `EvaluationAssignment`.

## 10.1 Scope behavior

### COMMON

Chỉ common/project context mà evaluation policy cho phép.

### MAJOR_SPECIFIC

Chỉ major-scoped package/evidence phù hợp assignment.

### INDIVIDUAL

Chỉ student-specific/applicable evidence theo contract.

## 10.2 Immutable package

Final package là locked snapshot.

Evaluator read model không được cho phép mutate:

- submission snapshot
- deliverable versions đã khóa
- project artifact
- Project State

## 10.3 Acceptance

- COMMON evaluator thấy đúng common context.
- MAJOR_SPECIFIC evaluator không thấy major khác.
- INDIVIDUAL evaluator không thấy student khác.
- Supervisor/Mentor không có evaluator assignment không được dùng evaluator endpoint.

---

# 11. BE-AW-009 — Admin Identity / Academic-profile Scope Update

## 11.1 Mục tiêu

FE Admin hiện có account list/detail/create/lifecycle nhưng academic-profile mutation vẫn fail-closed.

Backend cần contract rõ ràng cho update administrative identity/profile với concurrency.

## 11.2 Quy tắc

- Chỉ allowed admin-managed fields.
- Student → Major theo domain rules.
- Staff/Lecturer → Department theo domain rules.
- Không tin client academic scope.
- Không silently rewrite historical project membership/supervisor/evaluation/evidence.
- Nếu scope change conflict với active obligation và handoff không định nghĩa migration tự động: reject với deterministic reason.
- stale write → `409`.

## 11.3 Acceptance

- valid admin update
- non-admin denied
- invalid major/department relation
- stale token 409
- duplicate identity conflict
- historical references preserved
- no hidden cascade

---

# 12. BE-AW-010 — Global Role Classification / Safe Role Management

## 12.1 Mục tiêu

Backend phải cho FE biết role nào là assignable global identity role và không cho resource assignments bị biến thành global roles.

## 12.2 Global role catalogue

Canonical global roles:

- `ADMIN`
- `DEPARTMENT_STAFF`
- `LECTURER`
- `STUDENT`

Không cho Admin global-role UI assign:

- `TEAM_LEADER`
- `TEAM_MEMBER`
- `PRIMARY_SUPERVISOR`
- `DISCIPLINE_MENTOR`
- `EVALUATOR`
- `INDUSTRY_EXPERT`

## 12.3 Contract cần có

Theo existing schema/convention, response phải đủ metadata để FE phân biệt:

- assignable global role
- reserved/system role
- non-assignable concept/resource assignment

## 12.4 Permission caveat

Role-permission mapping không bypass resource authorization.

Ví dụ có permission `project_approve` nhưng sai Department/project/state vẫn phải deny mutation.

---

# 13. BE-AW-011 — Actor-scoped Calendar Projection

## 13.1 Mục tiêu

FE Calendar hiện chỉ có bounded projection theo những API hiện có. Để Calendar đa-project chính xác, Backend cần actor-scoped date-range projection.

Không tạo persistent universal `Event` aggregate nếu không thực sự cần. Ưu tiên read model/projection.

## 13.2 Query semantics

Theo frozen handoff cần hỗ trợ tương đương:

- `from`
- `to`
- cursor / continuation
- bounded `pageSize`
- optional source filters nếu cần

Response phải giúp FE biết:

- items
- source type/id
- project identity nếu authorized
- date/time
- status
- canonical resource identity/deep-link metadata nếu được định nghĩa
- next cursor
- completeness / continuation

## 13.3 Actor scopes

- Student: permitted own/team project sources.
- Primary Supervisor: assigned projects.
- Discipline Mentor: assigned project + major scope.
- Department Staff: authorized department/project-period scope.
- Evaluator: active assignment scope.
- Admin: platform/admin calendar facts only nếu contract thực sự có; không academic project facts bằng `ADMIN` identity.

## 13.4 Date semantics bắt buộc

Không fabricate:

- Task: actual deadline only.
- Milestone: actual date / DateOnly.
- Meeting: actual `startAt` / `endAt`.
- Progress Report: không dùng `periodEnd` thành submission deadline nếu domain không định nghĩa vậy.
- Deliverable: actual non-null `dueAt`.
- Final Submission: authoritative deadline/window.
- Evaluation: không dùng `assignedAt` thành deadline.
- ProjectPeriod: actual configured business windows.

## 13.5 Acceptance

- actor scope không leak cross-project
- mentor đúng major
- evaluator đúng assignment
- bounded date range
- cursor/page continuation
- empty range
- invalid range
- DateOnly không timezone-shift sang ngày khác
- progress report/evaluation không fabricated deadline

---

# 14. Non-blocker items

## BE-AW-004 — Department aggregate optimization

Chỉ optimization nếu FE đã compose read-safe đúng semantics. Không được coi là blocker chỉ vì muốn giảm số call.

## BE-AW-008 — Protected rubric hierarchy/version projection

Có thể làm sau Final Sync nếu current evaluator leaf-criteria flow vẫn correctness-safe. Nếu team quyết định rubric hierarchy là release-mandatory thì phải reclassify chính thức, không tự đổi trong code.

## BE-AW-012 — Structured AI factor/evidence navigation

Cải thiện risk explanation/navigation. Không được fabricate FE link từ opaque reference.

## BE-AW-013 — AI Supervisor Ranking

Optional/Future.

Nếu làm sau này:

1. deterministic eligibility/capacity filter trước
2. AI chỉ rank subset hợp lệ
3. human chọn
4. canonical supervisor request API thực thi
5. AI không create assignment

---

# 15. Common API contract rules

## 15.1 Authorization

Không dùng shortcut:

- `ADMIN => allow all`
- `LECTURER => project access`
- `IsProjectLecturer => broad access`
- client department/major ID => authority

## 15.2 Status codes

Theo existing convention:

- `400` validation
- `401` unauthenticated
- `403` authenticated but unauthorized
- `404` absent/not visible theo anti-IDOR convention
- `409` concurrency/conflict

Giữ error contract nhất quán để FE final sync không phải đoán.

## 15.3 Concurrency

Dùng rowversion/concurrency token hiện có.

Capability read là observation hiện tại; mutation phải revalidate lại.

## 15.4 Database-First

AI-PMS theo Database-First.

Không tạo EF migrations làm source of truth.

Nếu blocker thật sự cần schema change:

- chứng minh lý do
- ghi `SCHEMA_CHANGE_REQUIRED`
- đưa additive schema proposal
- không mutate shared DB để "test nhanh"

---

# 16. Test matrix bắt buộc

Backend handoff không được coi là delivered chỉ vì build pass.

Cần unit/application + API/integration test cho authority.

## Security regression

Bắt buộc bao gồm:

- IDOR
- foreign project
- wrong Department
- wrong major
- wrong assignment
- ended/revoked assignment
- Mentor != Primary Supervisor
- Lecturer != Evaluator
- Admin != Department
- cross-project evidence
- ARCHIVED write denial
- stale 409
- resource assignment không thành global role

## Test database

Chỉ dùng isolated test infrastructure của repo.

Không dùng shared dev database để chạy handoff suite.

---

# 17. Performance constraints

Đặc biệt với read model mới:

- bounded query
- projection DTO
- range filtering
- pagination/cursor
- tránh N+1
- không `ToList()` toàn bộ project/actor history không giới hạn

Nếu cần index mới, báo schema consideration riêng.

---

# 18. Definition of Done — Backend Handoff

Backend chỉ được trả `READY_FOR_FINAL_SYNC` khi:

- `BE-AW-001` = DELIVERED
- `BE-AW-002` = DELIVERED
- `BE-AW-003` = DELIVERED
- `BE-AW-005` = DELIVERED
- `BE-AW-006` = DELIVERED
- `BE-AW-007` = DELIVERED
- `BE-AW-009` = DELIVERED
- `BE-AW-010` = DELIVERED
- `BE-AW-011` = DELIVERED

Và đồng thời:

- Release build pass
- focused tests pass
- integration/security tests pass
- OpenAPI/DTO documented
- dedicated handoff worktree clean
- Frontend untouched
- không blocker nào còn PARTIAL

Backend nên tạo:

`docs/final-fe-handoff-implementation.md`

Map:

`BE-AW ID → endpoint → DTO → authorization rule → tests → commit → status`

---

# 19. Backend Developer final report format

Khi hoàn thành, trả tối thiểu:

1. Backend base SHA
2. Backend final SHA
3. Handoff branch
4. Original dirty worktree preserved?
5. 9 blocker statuses
6. New endpoints
7. New DTOs
8. Reused authorization predicates
9. Security/IDOR tests
10. 409/concurrency tests
11. DB/schema changes, nếu có
12. OpenAPI status
13. focused unit tests
14. focused integration tests
15. full backend tests
16. Release build
17. known baseline failure evidence, nếu có
18. performance audit
19. commits
20. final verdict `READY_FOR_FINAL_SYNC` / `STOP_BEFORE_FINAL_SYNC`

---

## 20. Handoff verdict

**Current Backend Handoff Status:** `READY_FOR_BACKEND_IMPLEMENTATION`

**Current Frontend State:** `FROZEN`

**Final FE–BE Sync:** `NOT STARTED`

Không sửa Frontend cho tới khi Backend giao đủ 9 `FINAL_SYNC_BLOCKER`.
