# 06 — CROSS-ROLE TEST MATRIX & UX VERIFICATION
**AI-PMS (Academic Information & Project Management System)**  
**Target Roles:** Student Leader, Student Member, Supervisor, Reviewer, Department Staff, Discipline Mentor  
**Viewports:** 375px (Mobile), 768px (Tablet), 1024px (Laptop), 1440px (Desktop Wide)  

---

## 1. Role Verification Matrix

| Role | Target Workspace / Route | Expected UI Capabilities | Forbidden Actions & Explanations | Verified Test Suite |
| :--- | :--- | :--- | :--- | :--- |
| **Student Leader** (`ST-01`) | `/project/review-gates` | - View Gate Timeline & KPIs<br>- Open Submission Modal<br>- Upload artifacts & write revision notes<br>- Submit package for review | - Cannot approve own gate<br>- Cannot modify published templates | `StudentReviewTimelinePage.test.tsx`<br>`CrossRoleScenario.test.tsx` (Step 3) |
| **Student Member** (`ST-02`) | `/project/review-gates` | - View Gate Timeline & KPIs<br>- View requirement feedback & history<br>- Inspect uploaded documents | - **Disabled Submission Button:** Displays `"Chỉ Trưởng nhóm (Student Leader) mới có quyền nộp hồ sơ"` with `aria-disabled="true"` | `CrossRoleScenario.test.tsx` (Step 2) |
| **Supervisor** (`SP-01`) | `/supervisor/projects/:id/review-gates` | - View student timeline<br>- Read reviewer feedback<br>- Submit mentor advisory guidance via `SupervisorGateFollowupPanel.tsx` | - Cannot act as independent gate reviewer for own project (Conflict of Interest) | `StudentReviewTimelinePage.tsx#L98-L109` |
| **Reviewer** (`RV-01`) | `/review/gate-assignments` | - View assigned review queue<br>- Inspect artifact versions & notes<br>- Verify evidence (`ACCEPTED` / `REJECTED`)<br>- Record gate decision (`PASSED` / `REVISION_REQUIRED`) | - Cannot submit `PASSED` if any mandatory item is unaccepted (HTTP 422)<br>- Stale token triggers 409 conflict prompt | `AssignedGateReviewPage.test.tsx`<br>`CrossRoleScenario.test.tsx` (Step 4 & 5) |
| **Department Staff** (`DP-01`) | `/academic/review-gates` | - Monitor cohort matrix<br>- Build & publish gate templates<br>- Check defense readiness checklist<br>- Inspect multi-department progress | - Cannot modify published template structure (403 Immutability)<br>- Cannot publish empty template (422) | `ReviewGateGovernancePage.test.tsx`<br>`CrossRoleScenario.test.tsx` (Step 1) |
| **Discipline Mentor** (`HY-01`)| `/academic/review-gates` | - Filter matrix by `INTERDISCIPLINARY`<br>- Open `InterdisciplinaryGatePanel`<br>- Record scope decision (`IT`, `Marketing`, `Design`) | - Cannot override other disciplines' scopes<br>- Integration gate unlocks only when all scopes pass | `CrossRoleScenario.test.tsx` (Step 6) |

---

## 2. Accessibility (a11y) & Viewport Verification

| Viewport Breakpoint | Screen / Layout | Key Responsive Behaviors | Keyboard & Focus Standards |
| :--- | :--- | :--- | :--- |
| **Mobile (375px)** | Student Review Timeline | KPI cards stack into 1 column. Timeline gates scroll horizontally with touch-friendly tap targets ($\ge 44\text{px}$). | Modals capture focus trap; Escape key closes drawer. |
| **Tablet (768px)** | Assigned Review Queue | 2-column split (Queue on left, Details on right). Table wraps with horizontal scroll indicator. | All form inputs and buttons navigable via Tab / Shift+Tab with clear blue focus ring. |
| **Laptop (1024px)** | Department Matrix | High-density grid with fixed left column (Project Code). Filters and search bar aligned top right. | Dropdowns and action buttons operate via Enter / Space; arrow keys navigate list items. |
| **Wide Desktop (1440px)**| Review Gate Builder | 3-column layout (Template Meta, Gate Stepper, Requirement Checklist). | Drag-and-drop or sort reordering accessible via keyboard up/down controls. |

---

## 3. End-to-End Test Demonstration Scenarios

### Scenario A — Single-Major IT Capstone Lifecycle
1. **Initial State:** Project `IT-01` in Gate R2 with status `REVISION_REQUIRED`. Requirement `R2-SDD` rejected with reviewer notes: *"Architecture diagram missing component boundary."*
2. **Student Member Check:** Log in as regular member. Verify that the "Nộp bản sửa" button is disabled with visible label: *"Chỉ Trưởng nhóm"*.
3. **Student Leader Action:** Switch to Student Leader. Click "Nộp bản sửa", enter artifact name `SDD_v2.0_BoundaryClarified.pdf`, enter notes, and submit. Status transitions to `IN_REVIEW`.
4. **Reviewer Queue:** Log in as Reviewer. Open `/review/gate-assignments`. Verify that `req-r2-2` displays version 2 with leader notes.
5. **Evidence Acceptance:** Reviewer clicks "Chấp thuận" (ACCEPTED) for `req-r2-2`.
6. **Gate Verdict:** Reviewer enters notes and clicks "ĐẠT (PASSED)".
7. **Downstream Unlocking:** Refresh student timeline. Verify that Gate R2 is `PASSED`, and Gate R3 transitions from `LOCKED` to `READY`!

### Scenario B — Interdisciplinary IT + Marketing + Design Lifecycle
1. **Initial State:** Project `HYB-01` in Gate G2 (`Integrated Concept Gate`).
2. **Scope Triage:** Open `InterdisciplinaryGatePanel`. Scopes: `COMMON` (Passed), `IT` (Passed), `Marketing` (Passed), `Design` (Revision Required). Overall Gate G2 is `IN_REVIEW`.
3. **Discipline Action:** Design reviewer inspects revised Figma interactive prototype and marks `Design` scope as `PASSED`.
4. **Consensus Trigger:** System verifies that all 4 participating scopes are now `PASSED`. Gate G2 automatically transitions to `PASSED`, unlocking Gate G3!
