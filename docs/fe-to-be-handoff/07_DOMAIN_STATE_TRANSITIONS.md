# 07 — DOMAIN STATE TRANSITIONS & FINITE STATE MACHINES
**AI-PMS (Academic Information & Project Management System)**  
**Pattern:** Strict Domain State Machine with Invariant Enforcement  

---

## 1. Review Gate Instance State Machine (`ProjectGateInstance`)

The Review Gate state machine is the core mechanism controlling student progression. Illegal state transitions are rejected with HTTP 409 Conflict.

```mermaid
stateDiagram-v2
    [*] --> LOCKED: Gate Seeded on Project Activation
    LOCKED --> OPEN_FOR_SUBMISSION: Gate (N-1) Passed AND Term Window Open
    OPEN_FOR_SUBMISSION --> UNDER_REVIEW: Team Leader Submits All Mandatory Evidence
    OPEN_FOR_SUBMISSION --> FAILED: Hard Deadline Expired (No Submission)
    UNDER_REVIEW --> PASSED: All Reviewers Score >= 6.5
    UNDER_REVIEW --> REVISION_REQUIRED: Score in [5.0, 6.4]
    UNDER_REVIEW --> FAILED: Score < 5.0 OR Plagiarism Detected
    REVISION_REQUIRED --> UNDER_REVIEW: Resubmitted within 72h Remediation Window
    REVISION_REQUIRED --> FAILED: Remediation Window Expired
    FAILED --> OVERRIDDEN_PASSED: Department Head Formal Override
    REVISION_REQUIRED --> OVERRIDDEN_PASSED: Department Head Formal Override
    PASSED --> [*]
    OVERRIDDEN_PASSED --> [*]
    FAILED --> [*]: Project Terminated / Extended
```

### Transition Rule Matrix

| From State | To State | Trigger / Event | Authorized Role | Validation Invariant |
| :--- | :--- | :--- | :--- | :--- |
| `LOCKED` | `OPEN_FOR_SUBMISSION`| `GateWindowOpenedEvent` or Gate $N-1$ marked `PASSED` | System / Admin | Gate $N-1$ must be `PASSED` or `OVERRIDDEN_PASSED`. |
| `OPEN_FOR_SUBMISSION` | `UNDER_REVIEW` | `SubmitGateForReviewCommand` | `STUDENT_LEADER` | All mandatory evidence ledger items uploaded; `UtcNow <= DeadlineUtc`. |
| `OPEN_FOR_SUBMISSION` | `FAILED` | `GateDeadlineExpiredCronJob` | System | Deadline passed without submission; no active extension. |
| `UNDER_REVIEW` | `PASSED` | `GateEvaluationCompletedEvent` | System (auto-evaluated) | $\text{Avg} \ge 6.5$ AND $\min(\text{score}) \ge 4.0$. |
| `UNDER_REVIEW` | `REVISION_REQUIRED` | `GateEvaluationCompletedEvent` | System (auto-evaluated) | $\text{Avg} \in [5.0, 6.4]$; triggers 72h remediation timer. |
| `UNDER_REVIEW` | `FAILED` | `GateEvaluationCompletedEvent` | System (auto-evaluated) | $\text{Avg} < 5.0$ or reviewer marks critical failure. |
| `REVISION_REQUIRED` | `UNDER_REVIEW` | `ResubmitGateEvidenceCommand` | `STUDENT_LEADER` | Within 72h window; new revisions provided. |
| `REVISION_REQUIRED` | `FAILED` | `RemediationTimeoutCronJob` | System | 72 hours passed without resubmission. |
| `FAILED` | `OVERRIDDEN_PASSED` | `OverrideGateDecisionCommand` | `DEPARTMENT_HEAD` | Formal justification text provided ($\ge 50$ chars). |
| `REVISION_REQUIRED` | `OVERRIDDEN_PASSED` | `OverrideGateDecisionCommand` | `DEPARTMENT_HEAD` | Formal justification text provided ($\ge 50$ chars). |

---

## 2. Project Lifecycle State Machine (`Project`)

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Student Leader Initializes Topic
    DRAFT --> PROPOSED: Leader Submits Topic Proposal
    PROPOSED --> REVISION_REQUESTED: Supervisor Requests Changes
    REVISION_REQUESTED --> PROPOSED: Leader Resubmits
    PROPOSED --> SUPERVISOR_ENDORSED: Supervisor Approves
    SUPERVISOR_ENDORSED --> REJECTED: Department Head Rejects
    SUPERVISOR_ENDORSED --> ACTIVE: Department Head Approves
    ACTIVE --> AT_RISK: Review Gate 2 or 3 Delayed / Failing
    AT_RISK --> ACTIVE: Gate Remediated
    ACTIVE --> READY_FOR_DEFENSE: Gate 3 Cleared & Final Submission Verified
    AT_RISK --> FAILED: Gate 3 Failed (No Override)
    READY_FOR_DEFENSE --> DEFENDED: Council Defense Session Concluded
    DEFENDED --> COMPLETED: Final Scores & Minor Revisions Approved
    DEFENDED --> APPEALS_PENDING: Student Files Formal Grade Appeal
    APPEALS_PENDING --> COMPLETED: Appeal Resolved (Score Updated or Upheld)
    FAILED --> [*]
    COMPLETED --> [*]
```

---

## 3. Evidence Ledger Item State Machine (`GateEvidenceLedger`)

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Student Uploads Artifact
    DRAFT --> SUBMITTED: Gate Submitted for Review
    SUBMITTED --> VERIFIED: Reviewer Accepts Artifact
    SUBMITTED --> REJECTED: Reviewer Flags (Corrupt, Invalid, Plagiarism)
    REJECTED --> DRAFT: Student Re-uploads during Remediation
    VERIFIED --> [*]
```

---

## 4. Student Grade & Gate Appeal State Machine (`Appeals`)

```mermaid
stateDiagram-v2
    [*] --> SUBMITTED: Student Leader Submits Appeal (< 72h from publish)
    SUBMITTED --> UNDER_INVESTIGATION: Department Head Assigns Review Committee
    UNDER_INVESTIGATION --> HEARING_SCHEDULED: Committee Convenes
    HEARING_SCHEDULED --> ACCEPTED_GRADE_UPDATED: Council Score Overridden / Recalculated
    HEARING_SCHEDULED --> REJECTED: Council Decision Upheld
    ACCEPTED_GRADE_UPDATED --> CLOSED: Registry Notified
    REJECTED --> CLOSED: Student Notified
    CLOSED --> [*]
```

---

## 5. Concurrency & State Rollback Semantics
1. **Optimistic Concurrency Control:** Every state transition checks `RowVersion` concurrency tokens. If a reviewer submits an evaluation while another reviewer or the department head updates the gate, SQL Server throws `DbUpdateConcurrencyException`. The API responds with HTTP 409 Conflict, requiring the client to refresh.
2. **Transaction Boundaries:** State transitions (e.g., updating `ProjectGateInstance.Status = PASSED`, unlocking `Gate N+1`, and recording `AuditLog`) MUST execute in an atomic database transaction. If any downstream event dispatcher fails, the database transaction rolls back completely.
