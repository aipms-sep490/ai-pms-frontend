# 02 — ACADEMIC BUSINESS POLICY CONFLICT AUDIT
**AI-PMS (Academic Information & Project Management System)**  
**Auditor:** Senior Business Analyst & Frontend Architect  
**Reconciliation Reference:** `PLAN-QUAN-LY-TIEN-TRINH-REVIEW-2026-10-16.md`, Governance Baseline v3, Implementation Baseline v4, Business Academic Evaluation v5  

---

## 1. Executive Summary of Policy Audit
This audit scrutinizes whether the current Frontend codebase (`feat/uiux-master-redesign`) contains client-side assumptions, hardcoded academic policies, or unapproved business rules that could distort or preempt real backend decision-making.

All unapproved or backend-dependent policies are formally classified as **`POLICY_PENDING`**.

---

## 2. In-Depth Audit of the 10 Critical Policy Questions

### Question 1: FE có đang hard-code bốn Review Gates không?
- **Source Inspection:**
  - `ReviewGateBuilder.tsx`: **Dynamic.** Explicitly allows adding 1 to 8 gates (`handleAddGate()`, line 43) with dynamic prefixes (`R` for single major, `G` for interdisciplinary).
  - `StudentReviewTimeline.tsx`: **Dynamic.** Renders `timeline.gates.map(...)` based on the DTO array.
  - `review-gates-mock-adapter.ts`: **Partial Hardcoding.** Mock seed data defaults to 4 gates (`R1..R4` and `G1..G4`), and line 1032 hardcodes `['R1', 'R2', 'R3', 'R4'].indexOf(...)`.
  - `ProjectProgressMatrix.tsx`: **Static Headers.** Table headers currently display 4 fixed columns (`R1 / G1`, `R2 / G2`, `R3 / G3`, `R4 / G4`).
- **Audit Verdict:** `PARTIALLY_FLEXIBLE`. The UI builder and student timeline support dynamic gate counts, but matrix table headers assume a standard 4-gate sequence.
- **Classification:** **`POLICY_PENDING`** (Pending final Academic Council approval on whether any major requires 3 or 5 gates).

---

### Question 2: FE có đang mặc định Gate N phải PASS trước khi mở Gate N+1 không?
- **Source Inspection:**
  - `StudentReviewTimeline.tsx`: Renders whatever `gate.reviewEligibility` ('READY' | 'BLOCKED') and `gate.blockingReasons` are returned in `StudentGateInstance`. FE does **not** evaluate gating logic locally.
  - `review-gates-mock-adapter.ts#L1011-L1018`: When a reviewer submits `PASSED` for Gate $N$, the mock adapter internally unlocks Gate $N+1$ (`reviewEligibility = 'READY'`).
- **Audit Verdict:** `BACKEND_DEPENDENT`. FE correctly displays the server-supplied eligibility state. In production, Gate progression is strictly governed by the Backend domain state machine.
- **Classification:** **`POLICY_PENDING`** (Decision P01: Hard Gate vs. Advisory Gate must be enforced by BE API; FE must not bypass server blockers).

---

### Question 3: FE có đang tự khóa hồ sơ khi quá deadline không?
- **Source Inspection:**
  - `StudentReviewTimeline.tsx#L275`: Displays deadline strings as informational context (`Thời gian nộp: windowStart đến windowEnd`).
  - There is **no client-side `new Date() > windowEnd` check** disabling the submission button. The button's interactivity depends solely on `isLeader` and server DTO capabilities (`canSubmitRevision`).
  - `review-gates-mock-adapter.ts#L908-L945`: Does not check current system time against `windowEnd`.
- **Audit Verdict:** `COMPLIANT`. FE does not self-lock purely by client-side clock comparison. Deadline expiration rejection must return HTTP 403/422 from BE.
- **Classification:** Approved design.

---

### Question 4: FE có đang tính Gate PASS/FAIL bằng score threshold không?
- **Source Inspection:**
  - `AssignedReviewQueue.tsx#L48-L83`: Reviewers make a **qualitative human decision** (`PASSED` | `REVISION_REQUIRED`). There is no numeric score field in the review queue.
  - `review-gates-mock-adapter.ts#L994-L1001`: Rejects `PASSED` with HTTP 422 if any mandatory evidence item is not marked `ACCEPTED`. It does not calculate numeric thresholds ($\ge 6.5$).
  - *Contrast with Handoff Spec:* `04_BUSINESS_RULE_CATALOG.md` proposed numeric rubric scoring ($\ge 6.5$ for Pass, $5.0–6.4$ for Revision), but actual FE source code is based entirely on qualitative evidence verification.
- **Audit Verdict:** `POLICY_PENDING`. The proposed numeric score threshold ($\ge 6.5$) is an unapproved policy proposal. Current FE code correctly operates on evidence verification status.
- **Classification:** **`POLICY_PENDING`**.

---

### Question 5: FE có đang giả định remediation 72 giờ không?
- **Source Inspection:**
  - Full codebase grep for `72` in `src/features/review-gates/` returned **0 matches** (matches in other files were CSS widths or element heights).
  - FE does **NOT** contain any 72-hour countdown timers, client-side remediation timers, or 72h validation checks.
- **Audit Verdict:** `COMPLIANT`. 72-hour remediation was proposed in `PLAN-QUAN-LY-TIEN-TRINH-REVIEW-2026-10-16.md` (Decision P06), but the FE code does not enforce or assume this client-side.
- **Classification:** **`POLICY_PENDING`** (Awaiting BE timer/cron implementation; FE will merely display whatever `remediationDeadlineUtc` the BE provides).

---

### Question 6: FE có đang tự chuyển FAILED sau deadline không?
- **Source Inspection:**
  - Grep for `FAILED` in `src/features/review-gates/` returned **0 occurrences**.
  - In `types/review-gates.types.ts#L64`: `export type GateStatus = 'PLANNED' | 'IN_REVIEW' | 'PASSED' | 'REVISION_REQUIRED' | 'LOCKED'`.
  - The status `FAILED` does not even exist in the frontend Review Gate type definitions.
- **Audit Verdict:** `COMPLIANT`. FE never auto-fails projects. Any disqualification or failing state must originate exclusively from the university academic board and backend batch jobs.
- **Classification:** Approved design.

---

### Question 7: FE có đang cho Department Head Override theo quyền chưa được phê duyệt không?
- **Source Inspection:**
  - `ProjectProgressMatrix.tsx#L231-L289`: The inspecting drawer provides a "Ghi nhận kết luận thẩm định (Reviewer Scoped Decision)" select box allowing Department Staff or Admin to switch any project's gate status to `PASSED`, `REVISION_REQUIRED`, or `IN_REVIEW`.
  - The UI does not prompt for formal justification text ($\ge 50$ chars as proposed in P07), does not record an audit log, and does not check for `DEPARTMENT_HEAD` specific claims.
- **Audit Verdict:** `UNAPPROVED_SIMULATION`. In mock mode, this is a developer convenience sandbox. In production, arbitrary status changing by staff without formal override justification and audit trail is prohibited.
- **Classification:** **`POLICY_PENDING` / `BACKEND_DEPENDENCY`**. The UI must be updated to disable direct status switching and only expose formal override when authorized by BE capabilities.

---

### Question 8: FE có đang gộp Review Gate decision với Evaluation score không?
- **Source Inspection:**
  - `StudentReviewTimeline.tsx#L101-L125` explicitly distinguishes:
    1. *Academic Execution Progress* (Review Gates clearance).
    2. *Task Progress* (Sprint / Kanban completion percentage: "Hoàn thành task kỹ thuật không đồng nghĩa với đạt cổng").
  - `evaluations.api.ts`: Dedicated to Defense Council scoring rubrics (presentation, innovation, Q&A).
  - `review-gates-api.ts`: Dedicated to milestone evidence verification.
- **Audit Verdict:** `COMPLIANT`. The two domains are cleanly separated in source code. Review gate decisions are not conflated with final defense rubric scores.
- **Classification:** Approved design.

---

### Question 9: FE có đang coi Progress 100% là đủ điều kiện bảo vệ không?
- **Source Inspection:**
  - `StudentReviewTimeline.tsx#L124-L125`: Text explicitly states: "Hoàn thành task kỹ thuật không đồng nghĩa với đạt cổng."
  - `DefenseReadinessChecker.tsx#L86-L191`: Defense readiness evaluates an itemized checklist: All mandatory Review Gates `PASSED`, Final submission package verified, Supervisor sign-off granted, and per-student credit/tuition prerequisites cleared.
  - High Kanban task progress (e.g., 90% or 100%) does **not** trigger defense eligibility.
- **Audit Verdict:** `COMPLIANT`. Task velocity and academic defense eligibility are strictly decoupled.
- **Classification:** Approved design.

---

### Question 10: FE có đang tự tính quyền và blockers thay cho BE không?
- **Source Inspection:**
  - **Blockers:** FE renders `gate.blockingReasons` directly from the DTO array. It does not generate artificial blockers on the client.
  - **Actions & Permissions:** `StudentReviewTimeline.tsx#L354-L381` checks `isLeader ? ... : ...` on the client rather than binding directly to `timeline.capabilities.canSubmitRevision` or `canSubmitPackage`.
  - In `StudentReviewTimelinePage.tsx#L115`, there is a manual toggle `onToggleRole` for testing Leader vs Member permissions.
- **Audit Verdict:** `NEEDS_HARDENING`. In production, client-side role toggling must be removed, and button interactivity must bind directly to `timeline.capabilities` returned by the Backend API.
- **Classification:** **`BACKEND_DEPENDENCY`** (Requires BE to return authoritative capability flags).

---

## 3. Summary of Policy Decisions & Classifications

| Policy ID | Policy Description | Current FE Handling | Audit Classification |
| :--- | :--- | :--- | :--- |
| **P01** | Hard Gate vs. Advisory Gating | Renders DTO `reviewEligibility` | **`POLICY_PENDING`** (BE enforces) |
| **P02** | 4-Gate Standard Schedule | Dynamic in builder, static in matrix | **`POLICY_PENDING`** (Council sign-off) |
| **P03** | Evidence Typology & Storage | Metadata & versioning in DTO | Approved |
| **P04** | Reviewer Isolation Invariant | UI allows scoped verification | **`POLICY_PENDING`** (BE validation) |
| **P05** | Numeric Threshold ($\ge 6.5$) | FE uses qualitative Accept/Reject | **`POLICY_PENDING`** (Unapproved) |
| **P06** | 72-Hour Remediation Window | Not implemented in FE | **`POLICY_PENDING`** (BE cron) |
| **P07** | Department Head Override | Drawer allows raw status change | **`POLICY_PENDING`** (Must add justification) |
| **P08** | Interdisciplinary Multi-Scope | `InterdisciplinaryGatePanel.tsx` | Approved architecture |
| **P09** | SignalR WebSocket Push | Standard SignalR client in place | Approved architecture |
| **P10** | Concurrency via `RowVersion` | 409 handled with error toast | Approved architecture |
| **P11** | 72h Appeal Window | Dedicated appeal API in place | Approved architecture |
| **P12** | Post-Defense Immutability | Defense checklist advisory in place | Approved architecture |
