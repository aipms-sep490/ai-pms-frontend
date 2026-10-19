# 04 — EXHAUSTIVE BUSINESS RULE CATALOG
**AI-PMS (Academic Information & Project Management System)**  
**Specification Version:** 2.0-Formal  
**Target Architecture:** ASP.NET Core Clean Architecture Validation Pipeline (FluentValidation + Domain Invariants)  

---

## 1. Catalog Index by Domain
- **BR-AUTH & PERM:** Authentication, Role Authorization, Workspace Access (001–005)
- **BR-TEAM & PROJ:** Team Formation, Quotas, Proposal Approvals (010–018)
- **BR-GATE:** Review Gates, Evidence Submissions, Status Transitions (020–035)
- **BR-MEET:** Meeting Attendance, Scheduling, LiveKit Video Governance (040–046)
- **BR-TASK & SPRINT:** Agile Backlog, Story Points, Sprint Lockout (050–056)
- **BR-EVAL & RUBRIC:** Evaluation Rubrics, Score Aggregation, Defense Readiness (060–072)
- **BR-APPEAL:** Dispute Window, Grade Overrides, Academic Committee (080–088)

---

## 2. Business Rules Specification

### Domain 1: Team Formation & Proposal Rules (BR-TEAM)

#### `BR-TEAM-010`: Student Capstone Team Size Constraints
- **Domain:** Team Formation / Inception
- **Trigger:** `POST /api/v1/teams`, `POST /api/v1/teams/{id}/invitations`
- **Enforcing Role:** `STUDENT`
- **Rule Logic:** A project team must contain a minimum of 3 and a maximum of 5 distinct active students registered in the current academic semester.
- **Backend Error Code:** `ERR_TEAM_SIZE_OUT_OF_BOUNDS` (HTTP 400)
- **User Message (VI):** "Số lượng thành viên nhóm đồ án phải từ 3 đến 5 sinh viên hợp lệ trong học kỳ hiện tại."
- **User Message (EN):** "Team size must be between 3 and 5 registered students."

#### `BR-TEAM-012`: Single Active Team Membership Invariant
- **Domain:** Team Formation / Student Integrity
- **Trigger:** `POST /api/v1/teams/{id}/invitations/accept`
- **Enforcing Role:** `STUDENT`
- **Rule Logic:** A student cannot be an active member of more than one capstone project in the same academic semester.
- **Backend Error Code:** `ERR_STUDENT_ALREADY_IN_ACTIVE_TEAM` (HTTP 409)
- **User Message (VI):** "Sinh viên đã thuộc về một nhóm đồ án khác trong cùng học kỳ."

#### `BR-PROJ-015`: Supervisor Quota Limit
- **Domain:** Proposal Approval / Resource Allocation
- **Trigger:** `POST /api/v1/projects/proposals/{id}/approve`
- **Enforcing Role:** `SUPERVISOR`, `DEPARTMENT_HEAD`
- **Rule Logic:** A supervisor cannot supervise more than 5 active capstone projects within the same academic semester without explicit written exemption from the Department Head.
- **Backend Error Code:** `ERR_SUPERVISOR_QUOTA_EXCEEDED` (HTTP 422)
- **User Message (VI):** "Giảng viên hướng dẫn đã đạt hạn mức tối đa (5 đề tài) trong học kỳ này."

---

### Domain 2: Review Gates & Verification Rules (BR-GATE)

#### `BR-GATE-020`: Chronological Gate Sequentiality Invariant
- **Domain:** Review Gates / Lifecycle Transition
- **Trigger:** `POST /api/v1/projects/{id}/review-gates/{gateId}/evidence`
- **Enforcing Role:** `STUDENT`
- **Rule Logic:** Gate $N$ ($N \in \{2, 3, 4\}$) cannot accept evidence submissions or be opened for review unless Gate $N-1$ has achieved status `PASSED` or has received an explicit `OVERRIDDEN_PASSED` by the Department Head.
- **Backend Error Code:** `ERR_PREVIOUS_GATE_NOT_CLEARED` (HTTP 422)
- **User Message (VI):** "Nhóm không thể nộp minh chứng cho Gate hiện tại vì Gate trước đó chưa được thông qua."

#### `BR-GATE-022`: Hard Deadline Lockdown for Evidence Submissions
- **Domain:** Review Gates / Submission Window
- **Trigger:** `POST /api/v1/projects/{id}/review-gates/{gateId}/evidence`, `PUT /.../evidence/{evidenceId}`
- **Enforcing Role:** `STUDENT`
- **Rule Logic:** No evidence can be created or updated if `DateTime.UtcNow > GateInstance.SubmissionDeadlineUtc`, unless the Department Head has granted an individual project extension (`ExtensionDeadlineUtc`).
- **Backend Error Code:** `ERR_GATE_SUBMISSION_DEADLINE_EXPIRED` (HTTP 403)
- **User Message (VI):** "Thời hạn nộp minh chứng cho Gate này đã kết thúc. Vui lòng liên hệ Trưởng bộ môn nếu có lý do chính đáng."

#### `BR-GATE-025`: Mandatory Evidence Completeness Check
- **Domain:** Review Gates / Evidence Ledger
- **Trigger:** `POST /api/v1/projects/{id}/review-gates/{gateId}/submit-for-review`
- **Enforcing Role:** `STUDENT` (Team Leader only)
- **Rule Logic:** All required evidence artifacts defined in the gate template (e.g., Git repository URL, Architecture document, Test report) must be uploaded and pass checksum verification before status can transition to `UNDER_REVIEW`.
- **Backend Error Code:** `ERR_MANDATORY_EVIDENCE_MISSING` (HTTP 422)
- **User Message (VI):** "Còn thiếu minh chứng bắt buộc. Nhóm phải tải lên đầy đủ các tài liệu theo danh mục yêu cầu."

#### `BR-GATE-028`: Conflict-of-Interest Reviewer Isolation
- **Domain:** Reviewer Allocation / Academic Integrity
- **Trigger:** `POST /api/v1/review-gates/assignments`
- **Enforcing Role:** `DEPARTMENT_HEAD`
- **Rule Logic:** A faculty member who is assigned as the `Supervisor` or `Co-Supervisor` of Project $P$ cannot be assigned as an `Independent Reviewer` for Project $P$ on any Gate or Defense Council.
- **Backend Error Code:** `ERR_REVIEWER_CONFLICT_OF_INTEREST` (HTTP 400)
- **User Message (VI):** "Giảng viên hướng dẫn không được phép phân công làm giám khảo độc lập cho chính đề tài mình phụ trách."

#### `BR-GATE-030`: Multi-Reviewer Consensus & Score Threshold
- **Domain:** Review Gates / Automatic Evaluation
- **Trigger:** `POST /api/v1/review-gates/{gateId}/evaluations`
- **Enforcing Role:** `REVIEWER`
- **Rule Logic:**
  1. A Gate requires independent evaluations from all assigned reviewers (minimum 1, standard 2).
  2. Gate passes if and only if: $\text{Average Score} \ge 6.5$ (out of 10.0) AND no individual criterion score $< 4.0$.
  3. If $\text{Average Score} \in [5.0, 6.4]$, status transitions to `REVISION_REQUIRED` with a 72-hour remediation window.
  4. If $\text{Average Score} < 5.0$, status transitions to `FAILED`.
- **Backend Error Code:** Handled in domain state machine; error code on illegal transition `ERR_INVALID_GATE_STATE_TRANSITION` (HTTP 409).

#### `BR-GATE-035`: Department Head Sole Override Authority
- **Domain:** Review Gates / Exceptional Governance
- **Trigger:** `POST /api/v1/review-gates/{gateId}/override`
- **Enforcing Role:** `DEPARTMENT_HEAD` only
- **Rule Logic:** Only users with role `DEPARTMENT_HEAD` may override a `FAILED` or `REVISION_REQUIRED` gate to `PASSED`. The override request MUST include an immutable reason text ($\ge 50$ characters) and is permanently logged in `GateAuditLogs`.
- **Backend Error Code:** `ERR_INSUFFICIENT_OVERRIDE_JUSTIFICATION` (HTTP 400), `ERR_FORBIDDEN_OVERRIDE_ROLE` (HTTP 403).

---

### Domain 3: Mentorship Meetings & LiveKit Video (BR-MEET)

#### `BR-MEET-040`: Mandatory Weekly Sync Attendance
- **Domain:** Supervision / Progress Verification
- **Trigger:** Evaluated automatically at Gate 2 and Gate 3 clearance.
- **Rule Logic:** A project must log at least 1 verified meeting per 2 calendar weeks with the supervisor. The meeting must have lasted $\ge 30$ minutes with $\ge 80\%$ of team members marked present.
- **Backend Error Code:** `ERR_INSUFFICIENT_MENTOR_MEETINGS` (HTTP 422)
- **User Message (VI):** "Nhóm chưa đạt đủ số buổi họp định kỳ với GVHD (tối thiểu 1 buổi / 2 tuần)."

#### `BR-MEET-044`: LiveKit Token Expiration & Role Scoping
- **Domain:** Security / Audio-Video Streaming
- **Trigger:** `POST /api/v1/livekit/token`
- **Enforcing Role:** Authenticated users belonging to the specific meeting room.
- **Rule Logic:** LiveKit JWT token expires strictly after 120 minutes. Students receive `publish` + `subscribe` permissions; external auditors receive `subscribe` only; supervisors receive `admin` (kick/mute) capabilities.
- **Backend Error Code:** `ERR_UNAUTHORIZED_MEETING_ROOM_ACCESS` (HTTP 403)

---

### Domain 4: Defense Council & Rubric Scoring (BR-EVAL)

#### `BR-EVAL-062`: Draft vs. Finalize Rubric Locking
- **Domain:** Defense Evaluation / Scoring Integrity
- **Trigger:** `POST /api/v1/evaluations/finalize`
- **Enforcing Role:** `COUNCIL_MEMBER`, `REVIEWER`
- **Rule Logic:** Once an evaluation is submitted with `isFinal: true`, all criterion scores become strictly immutable. Re-opening a finalized evaluation requires Department Head intervention.
- **Backend Error Code:** `ERR_EVALUATION_ALREADY_FINALIZED` (HTTP 409)
- **User Message (VI):** "Phiếu đánh giá đã được chốt và không thể sửa đổi."

#### `BR-EVAL-070`: Gate 3 Clearance Prerequisite for Defense Council
- **Domain:** Defense Council / Eligibility
- **Trigger:** `POST /api/v1/councils/{id}/projects`
- **Enforcing Role:** `DEPARTMENT_HEAD`, `ACADEMIC_ADMIN`
- **Rule Logic:** A project cannot be scheduled into a Defense Council session unless its Gate 3 (Pre-Defense Gate) status is `PASSED` or `OVERRIDDEN_PASSED`.
- **Backend Error Code:** `ERR_PROJECT_NOT_ELIGIBLE_FOR_DEFENSE` (HTTP 422)
- **User Message (VI):** "Đề tài chưa hoàn thành Gate 3 (Pre-defense) nên không đủ điều kiện đưa vào hội đồng bảo vệ."

---

### Domain 5: Appeals & Dispute Resolution (BR-APPEAL)

#### `BR-APPEAL-080`: 72-Hour Appeal Filing Window
- **Domain:** Academic Dispute / Appeals
- **Trigger:** `POST /api/v1/appeals`
- **Enforcing Role:** `STUDENT` (Team Leader or individual member)
- **Rule Logic:** An appeal against an evaluation score or gate rejection must be submitted within exactly 72 hours (3 calendar days) from the official publication timestamp (`ScorePublishedAtUtc`).
- **Backend Error Code:** `ERR_APPEAL_WINDOW_EXPIRED` (HTTP 422)
- **User Message (VI):** "Thời hạn nộp đơn phúc khảo (72 giờ kể từ khi công bố kết quả) đã kết thúc."
