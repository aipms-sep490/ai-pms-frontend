# AI-PMS — Frontend Full Implementation Audit v1.0

**Audit state:** FRONTEND FROZEN
**Freeze date:** 2026-10-03
**Scope:** toàn bộ FE modernization từ Workspace Foundation đến AI Advisory, Phase 0–8.
**Final FE freeze commit:** `474e742e9aa09f46f6e950f95453c07b546ea588`
**Freeze branch:** `chore/final-fe-be-sync-v3`

---

# 1. Executive verdict

Frontend AI-PMS đã hoàn thành toàn bộ phase FE được xác định trước Backend handoff.

**Overall verdict:** `READY_FOR_BACKEND_HANDOFF`

Frontend chưa được xem là fully integrated/release-ready tại thời điểm freeze vì:

1. còn 9 Backend contracts được đánh dấu `FINAL_SYNC_BLOCKER`;
2. authenticated browser acceptance theo từng actor vẫn `BLOCKED_BY_CREDENTIAL`;
3. Final FE–BE Synchronization chưa bắt đầu.

Tuy vậy FE đã được triển khai theo nguyên tắc:

- Backend-authoritative.
- Fail-closed khi thiếu contract.
- Không mock privileged mutation.
- Không suy quyền từ URL/local state.
- Không biến scoped assignment thành global role.
- AI advisory only.
- 403/409 UX không optimistic và không auto-replay.

---

# 2. Frozen checkpoint chain

| Stage / Phase | Commit | Nội dung |
|---|---|---|
| Stage A | `e9ced4f30f6326deeaed845ae68ce2a64f802914` | `feat(workspace): close pre-department actor workspace foundation` |
| Phase 4 | `b96565714816e1fa084f7da8a59a850bdb25d5ef` | `feat(department): establish academic governance workspace` |
| Phase 5 | `63b1559898738add95ef641b210e091830428689` | `feat(evaluation): establish assignment-scoped evaluator workspace` |
| Phase 6 | `625e6eaa0a24eab0b6b9ad3b9de9f038abfb1983` | `feat(admin): establish platform administration workspace` |
| Phase 7 | `b401858cd20b9808cc8d6e78141c78387a008bec` | `feat(calendar): add unified calendar and deterministic attention` |
| Phase 8 / FE Freeze | `474e742e9aa09f46f6e950f95453c07b546ea588` | `feat(ai): integrate advisory AI into governed workspaces` |

Current clean staging branch:

`chore/final-fe-be-sync-v3`

---

# 3. Global architecture / authority model

## 3.1 Product shell

FE được tổ chức theo mô hình:

**One Product Shell + Role-aware Workspaces**

UI authority luôn phải phụ thuộc vào:

**Identity Role + Resource Scope + Project-scoped Assignment + Project/Team/Artifact State + Backend Workflow/Capability**

Navigation visibility chỉ là UX, không phải security boundary.

## 3.2 Global identity roles

- `ADMIN`
- `DEPARTMENT_STAFF`
- `LECTURER`
- `STUDENT`

## 3.3 Scoped assignments

- `TEAM_LEADER`
- `TEAM_MEMBER`
- `PRIMARY_SUPERVISOR`
- `DISCIPLINE_MENTOR`
- `EVALUATOR`
- `INDUSTRY_EXPERT`

Không phase nào được phép biến các scoped assignment trên thành global RBAC role.

## 3.4 Non-negotiable actor separations

Đã được audit xuyên Phase 0–8:

- Admin != Department
- Lecturer != Supervisor
- Lecturer != Mentor
- Lecturer != Evaluator
- Supervisor != Mentor
- Supervisor != Evaluator
- Mentor != Evaluator
- Student Leader != Student Member
- Lead Department != Participating Department

---

# 4. Phase 0–1 — Workspace Foundation

## Status

`VERIFIED_FE`

## Đã làm

- Tạo workspace route registry/context.
- Role/state/permission foundation.
- Shared Workspace access/gate states.
- Sidebar/Header dùng workspace registry/context.
- Admin tách khỏi Department.
- Lecturer không tự trở thành Primary Supervisor.
- Evaluator chỉ từ persisted assignment.
- Direct route guards được giữ.
- Không URL-derived authority.
- Không localStorage/sessionStorage làm project authority.
- Không mock persistence cho missing Backend contract.

## Core provider/contracts

- `AcademicWorkflowProvider`
- `StudentJourneyProvider`
- backend context/action feeds hiện có

## Kết quả

FE foundation tạo được một authority model dùng chung cho các phase sau và tránh logic quyền rải rác trong từng page.

---

# 5. Phase 2 — Student Execution Workspace

## Status

`VERIFIED_FE` cho read-safe/current delivered flows
`FE_COMPLETE_BE_BLOCKED` cho các privileged mutation cần authoritative capability contract

## Đã audit/triển khai

Student execution bao gồm các domain:

- Tasks
- Milestones
- Progress Reports
- Meetings
- Deliverables
- Files/Evidence
- Contributions
- Final Submission

## Authority hardening

Task Detail đã chuyển structural mutation sang task-scoped capability contract thay vì dựa vào `isLeader` / `canManageStructure`.

Các nhóm action FE chờ Backend authoritative read model:

- update task
- delete task
- assign task
- status
- dependencies
- task disciplines
- milestone update/delete/reorder
- selected project-level create actions

## 409 behavior

Task Discipline và các form concurrency-sensitive:

- giữ draft/input
- reload authoritative data/token
- không auto replay

## Evidence Ledger

Đã triển khai read-only safe UI:

- pagination
- source filter
- major filter
- status filter
- loading
- empty
- error
- 403
- source metadata/deep-link khi an toàn

Evidence mutation bị fail-closed nếu không có source-aware capability.

---

# 6. Phase 3 — Supervisor / Discipline Mentor

## Overall

Supervisor foundation/progress/cockpit: `VERIFIED_FE` ở source level
Authenticated browser: `BLOCKED_BY_CREDENTIAL`
Mentor write authority: `FE_COMPLETE_BE_BLOCKED` nơi contract chưa có

## Supervisor Workspace

Đã có operational cockpit hiển thị:

- project/team/status
- current milestone
- deliverable count
- submitted reports
- overdue/blocked tasks
- upcoming meeting
- final/handover checklist
- deep links tới Progress, Tasks/Milestones, Meetings, Deliverables, Files/Evidence, Contributions, Final Submission

Evaluation chỉ xuất hiện khi actor có persisted evaluator assignment cho project.

## Supervisor mutation boundary

Meeting notes/feedback/decisions/action items chỉ giữ các operation Backend đã authorize.

Không mở thêm structural mutation bằng FE role inference.

## Discipline Mentor

Đã thêm Mentor foundation + direct-route guard dựa trên persisted assignment:

- `DISCIPLINE_MENTOR`
- exact project
- exact major
- active/not ended

Mentor không có:

- structural plan authority
- project state transition
- grading
- evaluator authority
- result publication

---

# 7. Phase 4 — Department Academic Governance

## Checkpoint

`b96565714816e1fa084f7da8a59a850bdb25d5ef`

## Status

`PARTIAL_ACCEPTABLE`

- Department foundation: `VERIFIED_FE`
- Missing governance/read contracts: `BE_HANDOFF_REQUIRED`
- Authenticated Department browser: `BLOCKED_BY_CREDENTIAL`

## Canonical route

`/department/workspace`

## Authority

Route yêu cầu:

- `DEPARTMENT_STAFF`
- active Department academic scope từ Backend workflow context

Admin bị tách khỏi Department.

## Đã reuse

- review queue
- Department portfolio
- supervisor directory
- academic-period context

## Lead vs Participating Department

Review vẫn dùng backend workflow actions, không status-only gating.

Lead/Participating dùng action khác nhau, ví dụ:

- Lead: `approve_project`
- Participating: `approve_department` / `reject_department`

Participating Department không có whole-project academic authority.

## Attention

Attention chỉ presentation từ Backend counts, không tạo quyền.

## Fail-closed

Các phần chưa có safe read model:

- evaluation aggregate
- detailed policy aggregate
- final/result aggregate
- supervisor workload/history

được ghi BE handoff.

---

# 8. Phase 5 — Evaluator Workspace

## Checkpoint

`63b1559898738add95ef641b210e091830428689`

## Status

`PARTIAL_ACCEPTABLE`

## Routes

- `/evaluator/workspace`
- `/evaluator/assignments/:assignmentId`

## Authority model

Không có global Evaluator role.

Authority:

`LECTURER identity + persisted active EvaluationAssignment + scope/target/state`

## Supported scopes

### COMMON

- không major selector
- không student selector

### MAJOR_SPECIFIC

- major từ assignment
- không đổi target major trong UI

### INDIVIDUAL

- student từ assignment
- không đổi target student trong UI

## Direct route guard

Page verify active assignment trước khi render.

Foreign/revoked/absent assignment fail-closed.

## Draft / scoring

- chỉ server-returned leaf criteria editable
- concurrency token
- 403/409 handling
- local draft preserve khi conflict
- không client-calculate authoritative readiness

## Finalize

Finalize gọi Backend revalidation.

Finalized evaluation read-only.

Không reopen/edit CTA.

## Fail-closed

- evaluator-scoped package/evidence chưa an toàn
- protected rubric hierarchy chưa được reconstruct ở client
- ProjectResult/StudentResult không tự tính

---

# 9. Phase 6 — System Administration Workspace

## Checkpoint

`625e6eaa0a24eab0b6b9ad3b9de9f038abfb1983`

## Status

`PARTIAL_ACCEPTABLE`

## Canonical route

`/admin/access`

Không tạo `/admin/workspace`.

## Đã triển khai

### Accounts

- server-side list
- search
- status filter
- pagination
- detail
- create

### Import

Chỉ hỗ trợ actual Backend atomic JSON batch contract:

- 1–500 records
- không ngầm hỗ trợ CSV/XLSX
- không fake partial import semantics

### Lifecycle

- activate
- deactivate
- block
- unblock
- confirmation
- authoritative reload
- no hard delete

### RBAC

- role read
- permission read
- role-permission mapping
- confirmation trước mutation
- post-write reload

### Audit/security

Metadata-only, độc lập với account/RBAC failure.

### Academic structure

Reuse shared:

Organization → Department → Major

Mutation vẫn phụ thuộc Backend workflow/action.

## Global-role protection

Admin UI chỉ expose global identity roles:

- ADMIN
- DEPARTMENT_STAFF
- LECTURER
- STUDENT

Không expose scoped assignments như global role.

## Boundary

Admin không nhận:

- Department review
- evaluator governance
- supervisor academic governance
- result publication
- project execution authority

Semester/ProjectPeriod academic governance không được mở rộng sang Admin trong Phase 6.

---

# 10. Phase 7 — Unified Calendar + Deterministic Attention

## Checkpoint

`b401858cd20b9808cc8d6e78141c78387a008bec`

## Status

`PARTIAL_ACCEPTABLE`

## Route

`/calendar`

## Architecture

Calendar là non-persisted read projection.

Không tạo universal `Event` aggregate/domain.

Không có mutation authority.

## Date semantics

FE freeze xác nhận:

- Task: returned dashboard deadline only
- Milestone: preserve `DateOnly`
- Meeting: `startAt` / `endAt`
- Progress Report: `periodEnd` không bị coi là submission deadline
- Deliverable: non-null `dueAt`
- Final Submission: returned checklist `deadline`
- Evaluation: `assignedAt` không phải deadline

## Actor projection

### Student

Current project/dashboard scoped task/milestone, meeting, deliverable, final-submission facts.

### Supervisor

Backend dashboard facts như pending feedback / overdue / blocked.

### Mentor

Fail-closed nếu thiếu correct scope projection.

### Department

Pending-feedback/current portfolio facts only.

### Evaluator

Active assignment là Attention; không fabricated deadline.

### Admin

Platform/account attention only (`INACTIVE`, `SUSPENDED`, etc.).

## Attention boundary

Attention:

- deterministic
- read-only
- không capability
- không permission branch
- không AI risk

Source states:

- ready
- empty
- partial
- unavailable
- unsupported
- error

Pagination bounded, không hidden unbounded fan-out.

---

# 11. Phase 8 — AI Advisory Integration

## Freeze checkpoint

`474e742e9aa09f46f6e950f95453c07b546ea588`

## Status

`PARTIAL_ACCEPTABLE`

## AI architecture

AI nằm trên deterministic business data.

AI không phải command/control plane.

## Progress Analysis

`ProjectProgressAnalysisPanel.tsx`

- dùng Backend DTO
- xử lý `INSUFFICIENT_DATA`
- unknown enum fail-safe
- không tự tính risk
- không mutation

## Report Summary

`ReportAiSummary.tsx`

- chỉ gọi khi user yêu cầu
- report gốc luôn giữ nguyên
- không ghi đè supervisor feedback
- failure local

## Evidence References

`EvidenceReferences.tsx`

- hiển thị metadata/reference Backend trả về
- không suy API reference thành FE deep-link
- unknown reference không guessed route

## AI Assistant

Chỉ gửi:

- `projectId`
- `query`

Không:

- client RAG
- entire FE store
- local authority
- command execution

## Actor AI scopes

### Student

Own project only.

Suggestion không cấp Leader authority cho Member.

### Primary Supervisor

Exact primary-assignment project scope.

`LECTURER` không đủ.

### Discipline Mentor

Fail-closed / out-of-scope nếu chưa có major-safe AI contract.

### Department

Per-project advisory read only.

Không approve/reject/publish bằng AI.

### Evaluator

Không broad project AI access; không grading authority.

### Admin

Không academic project AI access chỉ vì ADMIN identity.

## Failure isolation

403/429/timeout/provider failure:

- không làm hỏng report
- không làm hỏng project workspace
- không làm hỏng Calendar
- không làm hỏng deterministic Attention

---

# 12. Cross-cutting technical invariants verified

## 12.1 403

Privileged mutation:

- no optimistic success
- refresh authoritative state/action where needed
- no silent retry

## 12.2 409

- preserve input/draft where reasonable
- fetch latest
- explain conflict
- no auto replay

## 12.3 Unknown / loading / unavailable

Không được map thành `allowed`.

## 12.4 Storage

FE chỉ lưu auth/session data theo existing mechanism.

Project/action/assignment authority không lấy từ localStorage/sessionStorage.

Session/profile được Backend validation lại.

## 12.5 Direct-route security

Các workspace chính đều có independent guards:

- Student
- Supervisor
- Mentor
- Department
- Evaluator
- Admin
- Calendar
- AI

Không pathname-derived authority.

---

# 13. Current canonical cross-workspace routes

Các route đã được audit/ghi nhận trong freeze:

- `/department/workspace`
- `/evaluator/workspace`
- `/evaluator/assignments/:assignmentId`
- `/admin/access`
- `/admin/access/rbac`
- `/admin/access/users/:id`
- `/calendar`
- `/project/ai`
- Supervisor workspace/project routes giữ route guard riêng trong existing router
- Mentor direct-route guard đã tồn tại theo assignment scope
- Student execution tiếp tục dùng canonical project/workspace routes hiện có

---

# 14. Final FE quality baseline

Tại Phase 8 freeze:

## Focused Phase 8

- 6 files
- 38/38 passed

## Full Vitest

- 128 files
- 560/560 tests passed
- 0 failed
- exit code 0

## Other gates

- `pnpm typecheck`: passed
- `pnpm lint`: passed
- `pnpm build`: passed
- `git diff --check`: passed

Build còn existing >500 kB Vite chunk warning, được phân loại non-blocking và không phải Phase 8 regression.

---

# 15. Browser acceptance status

Unauthenticated smoke tại freeze:

- `/calendar`
- `/project/ai`
- `/admin/access`
- `/department/workspace`
- `/evaluator/workspace`
- `/supervisor/workspace`

đều redirect `/login` đúng.

Không redirect loop.

Không captured console error.

375px guard surface:

`scrollWidth == clientWidth == 375`

## Authenticated role-valid acceptance

Hiện vẫn:

`BLOCKED_BY_CREDENTIAL`

cho:

- Student Leader
- Student Member
- Primary Supervisor
- Discipline Mentor
- Department Staff
- Evaluator
- Admin

Không dùng role khác thay thế để giả lập acceptance.

---

# 16. Backend handoff summary

Tổng cộng 13 stable IDs.

## FINAL_SYNC_BLOCKER

- `BE-AW-001` — execution capability
- `BE-AW-002` — source-aware evidence authority
- `BE-AW-003` — mentor resource scope
- `BE-AW-005` — Department governance/evaluation/final-result read model
- `BE-AW-006` — evaluator assignment detail projection
- `BE-AW-007` — evaluator-scoped final package/evidence
- `BE-AW-009` — Admin identity/academic-profile update
- `BE-AW-010` — global-role classification
- `BE-AW-011` — actor/date-range Calendar projection

## POST_SYNC_OPTIMIZATION

- `BE-AW-004`
- `BE-AW-008`
- `BE-AW-012`

## OPTIONAL/FUTURE

- `BE-AW-013` — AI Supervisor ranking

---

# 17. FE status by capability

| Area | Status |
|---|---|
| Workspace/RBAC foundation | `VERIFIED_FE` |
| Student read-safe execution | `VERIFIED_FE` |
| Student privileged execution missing capability | `FE_COMPLETE_BE_BLOCKED` |
| Evidence Ledger read | `VERIFIED_FE` |
| Evidence source-aware mutation | `FE_COMPLETE_BE_BLOCKED` |
| Supervisor workspace | `VERIFIED_FE` source-level |
| Mentor read-safe foundation | `VERIFIED_FE` |
| Mentor missing scoped contract | `FE_COMPLETE_BE_BLOCKED` |
| Department workspace | `PARTIAL_ACCEPTABLE` |
| Evaluator workspace | `PARTIAL_ACCEPTABLE` |
| Admin workspace | `PARTIAL_ACCEPTABLE` |
| Calendar/Attention | `PARTIAL_ACCEPTABLE` |
| AI Advisory | `PARTIAL_ACCEPTABLE` |
| Authenticated browser E2E | `BLOCKED_BY_CREDENTIAL` |
| Backend handoff | `READY_FOR_BACKEND_IMPLEMENTATION` |
| Final FE–BE Sync | `NOT_STARTED` |

---

# 18. What Backend Final Sync must NOT regress

Sau khi Backend giao contract, Final Sync FE phải giữ nguyên:

- fail-closed semantics
- route guards
- role/assignment separation
- 403 behavior
- 409 draft preservation
- no client grading
- no client project-state transitions
- no Admin academic authority
- no Mentor → Primary escalation
- no Lecturer → Evaluator escalation
- no fake Calendar deadline
- deterministic Attention độc lập AI
- AI advisory only

Final Sync chỉ nên:

- wire delivered contracts
- replace unsupported/fail-closed states
- update DTO/types/hooks
- enable CTA theo Backend action
- run role-valid authenticated E2E

Không redesign workspace trong Final Sync.

---

# 19. Required Final Sync E2E scenarios

Sau Backend handoff cần kiểm tra bằng credential đúng actor:

## Student Leader

- execution read
- allowed mutation
- denied mutation
- evidence source authority
- 403
- 409
- calendar
- AI own project

## Student Member

- assigned task behavior
- leader-only denial
- evidence rules
- direct URL

## Primary Supervisor

- assigned project access
- structural vs review authority
- Mentor separation
- calendar multi-project projection
- AI exact project scope

## Discipline Mentor

- exact project+major access
- wrong-major denial
- no primary structural authority
- no grading without evaluator assignment

## Department Staff

- Lead vs Participating
- review actions
- governance projection
- evaluation/final readiness
- publication boundary

## Evaluator

- COMMON
- MAJOR_SPECIFIC
- INDIVIDUAL
- assignment detail
- evaluator-scoped package/evidence
- finalize
- foreign assignment denial

## Admin

- account lifecycle
- role classification
- academic-profile update
- no Department academic authority

## Cross-cutting

- Calendar date-range/cursor
- Archived read-only
- IDOR
- stale 409
- AI failure isolation

---

# 20. Source/baseline references used in this audit

Business and architecture were aligned to the project source materials, especially:

- `AI-PMS_Interdisciplinary_Governance_Baseline_v3.0.docx`
- `AI-PMS - Report 3 - Software Requirement Specification(5).docx`
- `AI-PMS - Report 4 - Software Design Document (3).docx`
- Hybrid Business Workflow documents
- FE phase matrices/audits created during Phase 0–8
- Frozen Backend handoff audit
- Freeze checkpoint reports from each phase

Important baseline principles preserved:

- System Administrator manages platform identity/RBAC/organization/audit and does not become academic reviewer/grader.
- Resource access requires role + permission + project/resource state + assignment/scope.
- Evaluator authority is assignment-scoped.
- Mentor authority is major/project-scoped.
- AI is decision support only.
- Deterministic rules + human decision remain authoritative.

---

# 21. Final frontend verdict

**Frontend codebase state:** `FROZEN`

**Freeze SHA:** `474e742e9aa09f46f6e950f95453c07b546ea588`

**Current staging branch:** `chore/final-fe-be-sync-v3`

**Backend handoff:** `READY`

**Final Sync:** `NOT STARTED`

**Release-ready:** `NO` — phải hoàn thành Backend blockers + Final Sync + authenticated actor E2E trước.
