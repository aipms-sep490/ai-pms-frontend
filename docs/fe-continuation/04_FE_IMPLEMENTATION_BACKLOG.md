# 04 — FRONTEND IMPLEMENTATION & REFINEMENT BACKLOG
**AI-PMS (Academic Information & Project Management System)**  
**Branch:** `feat/uiux-master-redesign`  
**Scope:** Frontend Code Only · Pure UI/UX, Adapters, Error States & Accessibility (Zero BE/DB Modifications)  

---

## 1. Backlog Overview & Prioritization

This backlog catalogs the concrete frontend tasks required to make the codebase genuinely ready for backend integration without altering approved academic rules.

```
[P0] Adapter Dual-Mode & Env Toggle (Cutover Readiness)
[P0] Binding UI Interactivity to Server Capabilities (Security & Integrity)
[P1] Accessible Explanations on Disabled States (WCAG 2.1 AA)
[P1] Optimistic Concurrency Conflict UI (HTTP 409 Handling)
[P2] State Handling (Empty, Loading, Insufficient Data, Server Down)
[P2] Safe Guarding of Department Matrix Inspection Sandbox
```

---

## 2. Detailed Task Specifications

### Task FE-01: Environment Toggle & Dual-Mode Adapter Configuration
- **File to Edit:**
  - `.env.example`
  - `.env.local`
  - `src/features/review-gates/api/review-gates-api.ts`
- **Rationale:** Currently, `review-gates-api.ts` directly invokes `reviewGatesMockAdapter` with no conditional toggle. Adding `VITE_USE_MOCK_REVIEW_GATES` allows seamless switching between mock mode and real backend endpoints without modifying UI components.
- **Acceptance Criteria:**
  - Setting `VITE_USE_MOCK_REVIEW_GATES=false` routes calls to real HTTP client endpoints (`/api/v1/projects/...`).
  - Setting `VITE_USE_MOCK_REVIEW_GATES=true` (or unset in local test) safely routes to `reviewGatesMockAdapter`.
  - All 26 existing Vitest tests continue to pass.

---

### Task FE-02: Bind Action Interactivity to Server Capabilities
- **File to Edit:** `src/features/review-gates/components/StudentReviewTimeline.tsx`
- **Rationale:** Currently, lines 354–381 check a local client variable `isLeader` rather than binding to `timeline.capabilities.canSubmitRevision`. In production, the backend is the authoritative decision-maker on whether submissions are permitted.
- **Acceptance Criteria:**
  - Button state: Enabled only if `timeline.capabilities.canSubmitRevision === true` (and `isLeader === true`).
  - If disabled, display clear explanatory text stating the exact blocker returned by the server in `timeline.capabilities.blockingReasons`.

---

### Task FE-03: Accessible Explanations on Disabled Buttons (A11y)
- **Files to Edit:**
  - `src/features/review-gates/components/StudentReviewTimeline.tsx`
  - `src/features/review-gates/components/AssignedReviewQueue.tsx`
- **Rationale:** Disabled buttons currently rely on small sub-text or hover tooltips that screen readers and keyboard-only users cannot access.
- **Acceptance Criteria:**
  - Disabled buttons include `aria-disabled="true"`.
  - Linked to a persistent explanation via `aria-describedby="reason-id"`.
  - Reason text is clearly visible on the screen for all users.

---

### Task FE-04: Concurrency Conflict Resolution UI (HTTP 409 Handling)
- **Files to Edit:**
  - `src/features/review-gates/pages/AssignedGateReviewPage.tsx`
  - `src/features/review-gates/pages/ReviewGateGovernancePage.tsx`
- **Rationale:** When another user (e.g. co-reviewer or department admin) modifies a gate, the server returns 409 Conflict. The UI currently displays a raw toast or error banner.
- **Acceptance Criteria:**
  - When 409 Conflict occurs, render a dedicated banner: "Dữ liệu đợt thẩm định đã được cập nhật bởi một người dùng khác. Vui lòng tải lại dữ liệu mới nhất."
  - Provide a single-click "Tải lại dữ liệu" button that refreshes the queue without wiping the user's unsubmitted notes draft.

---

### Task FE-05: Guard Department Matrix Inspection Sandbox
- **File to Edit:** `src/features/review-gates/components/ProjectProgressMatrix.tsx`
- **Rationale:** Lines 231–289 contain an unverified "Cập nhật quyết định Reviewer" action allowing arbitrary status manipulation in mock mode.
- **Acceptance Criteria:**
  - When in real API mode (`VITE_USE_MOCK_REVIEW_GATES=false`), hide or disable the mock status switcher.
  - In mock mode, display an amber developer notice: "Chế độ mô phỏng kiểm thử: Quyết định chính thức trong môi trường sản xuất chỉ được thực hiện bởi Giám khảo được phân công."

---

### Task FE-06: Comprehensive State Displays (Empty, Loading, Error, Blocked)
- **Files to Edit:**
  - `src/features/review-gates/components/AssignedReviewQueue.tsx`
  - `src/features/review-gates/components/StudentReviewTimeline.tsx`
- **Rationale:** Ensure that every operational screen provides elegant visual feedback for all 10 standard states (Loading, Empty, Not Configured, Insufficient Data, Waiting for Review, Changes Requested, Completed, Blocked, Conflict, Server Unavailable).
- **Acceptance Criteria:**
  - Zero unhandled crash screens or blank viewports.
  - Clear Vietnamese recovery prompts and retry buttons.
