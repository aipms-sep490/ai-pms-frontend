# 05 — API & DTO INTEGRATION CONTRACT
**AI-PMS (Academic Information & Project Management System)**  
**Version:** 2.0-Production  
**Base URL:** `https://api.aipms.edu.vn/api/v1` (Dev: `http://localhost:5000/api/v1`)  
**Standard Headers:**
- `Authorization: Bearer <JWT_ACCESS_TOKEN>`
- `Content-Type: application/json`
- `Accept: application/json`
- `X-Correlation-Id: <UUID>`

---

## 1. Universal Response Envelopes

### 1.1 Standard Single Data Envelope
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully.",
  "errors": null,
  "errorCode": null,
  "timestamp": "2026-10-18T10:30:00Z"
}
```

### 1.2 Standard Paged Data Envelope
```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "pageNumber": 1,
    "pageSize": 20,
    "totalCount": 154,
    "totalPages": 8,
    "hasPreviousPage": false,
    "hasNextPage": true
  },
  "message": null,
  "errors": null,
  "errorCode": null,
  "timestamp": "2026-10-18T10:30:00Z"
}
```

### 1.3 Standard Error Envelope
```json
{
  "success": false,
  "data": null,
  "message": "Validation failed for one or more fields.",
  "errors": [
    "Evidence 'Software Architecture Document' is mandatory and must not be empty.",
    "File extension .exe is not permitted."
  ],
  "errorCode": "ERR_MANDATORY_EVIDENCE_MISSING",
  "timestamp": "2026-10-18T10:30:00Z"
}
```

---

## 2. Review Gates Endpoint Suite (P0 — New Required Endpoints)

### 2.1 Get Project Review Gates Timeline & KPIs
- **Method:** `GET`
- **Path:** `/projects/{projectId}/review-gates`
- **Roles:** `STUDENT`, `SUPERVISOR`, `REVIEWER`, `DEPARTMENT_HEAD`, `ADMIN`
- **Response Data (`ProjectReviewGatesSummaryDto`):**
```json
{
  "projectId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "projectCode": "PRJ-2026-SEP-042",
  "projectTitle": "AI-Powered Academic Progress Tracking System",
  "currentGateId": "7cb85f64-5717-4562-b3fc-2c963f66afa1",
  "overallStatus": "IN_PROGRESS",
  "kpis": {
    "clearanceRatePercent": 50.0,
    "evidenceVerificationScore": 8.2,
    "activeBlockerCount": 1,
    "nextDeadlineUtc": "2026-11-05T17:00:00Z",
    "daysRemaining": 18
  },
  "gates": [
    {
      "gateId": "7cb85f64-5717-4562-b3fc-2c963f66afa0",
      "gateSequence": 1,
      "gateName": "Gate 1: Topic & Architecture Verification",
      "status": "PASSED",
      "submissionDeadlineUtc": "2026-10-01T17:00:00Z",
      "evaluatedAtUtc": "2026-10-03T09:15:00Z",
      "averageScore": 8.5,
      "isOverridden": false,
      "evidenceCount": 3,
      "requiredEvidenceCount": 3
    },
    {
      "gateId": "7cb85f64-5717-4562-b3fc-2c963f66afa1",
      "gateSequence": 2,
      "gateName": "Gate 2: Midterm Prototype & Sprint Velocity",
      "status": "OPEN_FOR_SUBMISSION",
      "submissionDeadlineUtc": "2026-11-05T17:00:00Z",
      "evaluatedAtUtc": null,
      "averageScore": null,
      "isOverridden": false,
      "evidenceCount": 1,
      "requiredEvidenceCount": 4
    },
    {
      "gateId": "7cb85f64-5717-4562-b3fc-2c963f66afa2",
      "gateSequence": 3,
      "gateName": "Gate 3: Pre-Defense Verification",
      "status": "LOCKED",
      "submissionDeadlineUtc": "2026-12-01T17:00:00Z",
      "evaluatedAtUtc": null,
      "averageScore": null,
      "isOverridden": false,
      "evidenceCount": 0,
      "requiredEvidenceCount": 5
    }
  ]
}
```

---

### 2.2 Submit Gate Evidence Item
- **Method:** `POST`
- **Path:** `/projects/{projectId}/review-gates/{gateId}/evidence`
- **Roles:** `STUDENT` (Active project member)
- **Request Body (`SubmitEvidenceDto`):**
```json
{
  "evidenceType": "GIT_REPOSITORY",
  "title": "Backend GitHub Monorepo Tag v0.2-alpha",
  "description": "Commit tag containing sprint 3 deliverables and test reports.",
  "externalUrl": "https://github.com/aipms/backend/releases/tag/v0.2-alpha",
  "fileId": null,
  "metadataJson": "{\"commitSha\": \"9f81a7b\", \"branch\": \"main\"}"
}
```
- **Response Data (`EvidenceLedgerItemDto`):**
```json
{
  "evidenceId": "8da85f64-5717-4562-b3fc-2c963f66afa8",
  "gateId": "7cb85f64-5717-4562-b3fc-2c963f66afa1",
  "evidenceType": "GIT_REPOSITORY",
  "title": "Backend GitHub Monorepo Tag v0.2-alpha",
  "fileUrl": null,
  "externalUrl": "https://github.com/aipms/backend/releases/tag/v0.2-alpha",
  "uploadedBy": {
    "userId": "1ba85f64-5717-4562-b3fc-2c963f66afa4",
    "fullName": "Nguyen Van A",
    "studentCode": "SE160123"
  },
  "uploadedAtUtc": "2026-10-18T10:45:00Z",
  "status": "VERIFIED"
}
```

---

### 2.3 Submit Gate for Review
- **Method:** `POST`
- **Path:** `/projects/{projectId}/review-gates/{gateId}/submit-for-review`
- **Roles:** `STUDENT` (Team Leader)
- **Request Body:** `{ "notes": "All midterm artifacts uploaded and verified by team." }`
- **Response:** Transitions gate status from `OPEN_FOR_SUBMISSION` to `UNDER_REVIEW`. Dispatches notification to assigned reviewers.

---

### 2.4 Submit Reviewer Gate Evaluation
- **Method:** `POST`
- **Path:** `/review-gates/{gateId}/evaluations`
- **Roles:** `REVIEWER` (Must be assigned to this gate instance)
- **Request Body (`SubmitGateEvaluationDto`):**
```json
{
  "isDraft": false,
  "generalFeedback": "Good sprint progress and architectural structure. Test coverage requires improvement before Gate 3.",
  "scores": [
    {
      "criterionId": "crit-001",
      "criterionName": "Architecture & Code Quality",
      "weight": 0.3,
      "score": 8.0,
      "comment": "Clear clean architecture boundaries."
    },
    {
      "criterionId": "crit-002",
      "criterionName": "Milestone Velocity & Task Completion",
      "weight": 0.4,
      "score": 7.5,
      "comment": "Completed 85% of planned sprint user stories."
    },
    {
      "criterionId": "crit-003",
      "criterionName": "Documentation Completeness",
      "weight": 0.3,
      "score": 7.0,
      "comment": "Swagger docs are up-to-date."
    }
  ]
}
```
- **Response Data (`GateEvaluationResultDto`):**
```json
{
  "evaluationId": "4ca85f64-5717-4562-b3fc-2c963f66afa9",
  "gateId": "7cb85f64-5717-4562-b3fc-2c963f66afa1",
  "reviewerId": "2ba85f64-5717-4562-b3fc-2c963f66afa5",
  "reviewerName": "Dr. Tran Van B",
  "totalWeightedScore": 7.5,
  "verdict": "PASSED",
  "submittedAtUtc": "2026-10-18T11:00:00Z"
}
```

---

### 2.5 Department Gate Override
- **Method:** `POST`
- **Path:** `/review-gates/{gateId}/override`
- **Roles:** `DEPARTMENT_HEAD`
- **Request Body (`DepartmentGateOverrideDto`):**
```json
{
  "targetStatus": "OVERRIDDEN_PASSED",
  "justification": "Approved per Department Academic Council resolution #102/QD-CNTT regarding hardware lab delay exception.",
  "overrideReasonCode": "COUNCIL_EXEMPTION"
}
```
- **Response:** Transitions gate status to `OVERRIDDEN_PASSED`. Unlocks downstream gates immediately.

---

### 2.6 Department Gate Matrix (High-Density Cohort Grid)
- **Method:** `GET`
- **Path:** `/departments/{departmentId}/review-gates/matrix`
- **Query Params:**
  - `academicPeriodId` (UUID, optional, defaults to active semester)
  - `majorCode` (string, optional: `SE`, `IA`, `IS`, `AI`)
  - `gateSequence` (int, optional: 1, 2, 3, 4)
  - `status` (string, optional: `PASSED`, `AT_RISK`, `FAILED`, `UNDER_REVIEW`)
  - `search` (string, optional: team code or topic name)
  - `page` (int, default: 1)
  - `pageSize` (int, default: 50)
- **Roles:** `DEPARTMENT_HEAD`, `ADMIN`
- **Response Data:**
```json
{
  "departmentId": "11a85f64-5717-4562-b3fc-2c963f66afa0",
  "academicPeriod": "Fall 2026",
  "totalProjects": 45,
  "summary": {
    "gate1Passed": 45,
    "gate2Passed": 38,
    "gate2AtRisk": 5,
    "gate2Failed": 2,
    "gate3Pending": 45
  },
  "projects": [
    {
      "projectId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "projectCode": "PRJ-2026-SEP-042",
      "projectTitle": "AI-Powered Academic Progress Tracking System",
      "majorCode": "SE",
      "supervisor": {
        "id": "2ba85f64-5717-4562-b3fc-2c963f66afa5",
        "name": "Dr. Le Van C"
      },
      "gate1": { "status": "PASSED", "score": 8.5 },
      "gate2": { "status": "UNDER_REVIEW", "score": null },
      "gate3": { "status": "LOCKED", "score": null },
      "gate4": { "status": "LOCKED", "score": null }
    }
  ]
}
```

---

## 3. Composite Aggregator Endpoints (P1 — High UX Efficiency)

### 3.1 Student Next Actions Hub
- **Method:** `GET`
- **Path:** `/students/me/next-actions`
- **Roles:** `STUDENT`
- **Response Data:**
```json
{
  "activeProject": {
    "projectId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "projectCode": "PRJ-2026-SEP-042",
    "projectTitle": "AI-Powered Academic Progress Tracking System",
    "stage": "STAGE_4_REVIEW_GATES"
  },
  "urgentActions": [
    {
      "id": "act-001",
      "category": "REVIEW_GATE",
      "title": "Gate 2 Evidence Submission Required",
      "description": "Upload deployed Alpha Demo URL and Test Execution Report before deadline.",
      "deadlineUtc": "2026-11-05T17:00:00Z",
      "urgency": "HIGH",
      "actionUrl": "/workspace/student/review-gates/7cb85f64-5717-4562-b3fc-2c963f66afa1"
    },
    {
      "id": "act-002",
      "category": "MEETING",
      "title": "Upcoming Mentorship Meeting",
      "description": "Weekly progress sync with Dr. Le Van C",
      "deadlineUtc": "2026-10-20T08:00:00Z",
      "urgency": "MEDIUM",
      "actionUrl": "/workspace/student/meetings/99a85f64-5717-4562-b3fc-2c963f66afa7"
    }
  ]
}
```

### 3.2 Supervisor Triage Queue
- **Method:** `GET`
- **Path:** `/supervisors/me/triage-queue`
- **Roles:** `SUPERVISOR`
- **Response Data:** Returns prioritized list of proposals awaiting review, deliverables requiring approval, and weekly meeting minutes pending sign-off.

### 3.3 Department Urgent Action Queue
- **Method:** `GET`
- **Path:** `/departments/{departmentId}/urgent-actions`
- **Roles:** `DEPARTMENT_HEAD`
- **Response Data:** Returns count and items for: Unassigned Reviewers, Quota Overflows, Pending Gate Overrides, and Student Grade Appeals.
