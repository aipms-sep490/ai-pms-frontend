# HỢP ĐỒNG API & DTO BACKEND (BE API & DTO CONTRACT)

**Dự án:** AI-PMS (Academic Capstone Project Management System)  
**Tài liệu tham chiếu:** `01_ANTIGRAVITY_MASTER_PROMPT.md`, `02_FE_BUSINESS_REQUIREMENTS.md`.  
**Chuẩn công nghệ BE:** ASP.NET Core 9, C# 13, Entity Framework Core, SQL Server 2022.

---

## 1. DANH SÁCH 13 ENDPOINT REST API BẮT BUỘC

| TT | Phương thức | Đường dẫn API | Vai trò được phép (Policy) | Trạng thái |
|---|---|---|---|---|
| 1 | `GET` | `/api/v1/academic/review-gates/templates` | `DEPARTMENT_STAFF`, `ADMIN` | `PROPOSED` |
| 2 | `GET` | `/api/v1/academic/review-gates/templates/{id}` | `DEPARTMENT_STAFF`, `ADMIN` | `PROPOSED` |
| 3 | `POST` | `/api/v1/academic/review-gates/templates` | `DEPARTMENT_STAFF`, `ADMIN` | `PROPOSED` |
| 4 | `PUT` | `/api/v1/academic/review-gates/templates/{id}` | `DEPARTMENT_STAFF`, `ADMIN` | `PROPOSED` |
| 5 | `POST` | `/api/v1/academic/review-gates/templates/{id}/publish` | `DEPARTMENT_STAFF`, `ADMIN` | `PROPOSED` |
| 6 | `GET` | `/api/v1/academic/review-gates/monitoring-matrix` | `DEPARTMENT_STAFF`, `ADMIN` | `PROPOSED` |
| 7 | `GET` | `/api/v1/projects/{projectId}/review-timeline` | `STUDENT`, `LECTURER`, `STAFF` | `PROPOSED` |
| 8 | `POST` | `/api/v1/projects/{projectId}/review-gates/{gateCode}/revisions` | `STUDENT_LEADER` | `PROPOSED` |
| 9 | `GET` | `/api/v1/reviews/gate-assignments` | `LECTURER`, `DEPARTMENT_STAFF` | `PROPOSED` |
| 10 | `POST` | `/api/v1/reviews/evidence/verify` | `ASSIGNED_REVIEWER` | `PROPOSED` |
| 11 | `POST` | `/api/v1/reviews/gate-decision` | `ASSIGNED_REVIEWER` | `PROPOSED` |
| 12 | `PUT` | `/api/v1/reviews/hybrid-scopes/{scope}` | `PARTICIPATING_DEPARTMENT` | `PROPOSED` |
| 13 | `GET` | `/api/v1/projects/{projectId}/defense-readiness` | `STUDENT`, `LECTURER`, `STAFF` | `PROPOSED` |

---

## 2. CHI TIẾT CẤU TRÚC DTO & JSON SCHEMAS

### API 1 & 2: `GET /api/v1/academic/review-gates/templates`
**Response JSON (`200 OK`):**
```json
[
  {
    "id": "tmpl-it-2026",
    "code": "IT-SEP-2026",
    "name": "IT Capstone – Review 1–4",
    "mode": "SINGLE_MAJOR",
    "major": "Information Technology",
    "gatesCount": 4,
    "status": "PUBLISHED",
    "version": "1.0",
    "concurrencyToken": "it-token-v1",
    "gates": [
      {
        "id": "gate-r1",
        "code": "R1",
        "title": "Requirement & Analysis",
        "objective": "Xác nhận problem, yêu cầu nghiệp vụ và kế hoạch thực hiện đồ án",
        "required": true,
        "blockNextGate": true,
        "start": "2026-09-05",
        "end": "2026-09-25",
        "reviewerPolicy": "Assigned Supervisor / Reviewer",
        "reviewScope": "COMMON",
        "requirements": [
          {
            "id": "req-r1-1",
            "title": "Project Proposal (Bản đề cương chi tiết)",
            "type": "DOCUMENT",
            "scope": "COMMON",
            "verification": "HUMAN",
            "required": true
          }
        ]
      }
    ]
  }
]
```

---

### API 6: `GET /api/v1/academic/review-gates/monitoring-matrix`
**Query Parameters:** `filterMode`: `'ALL' | 'SINGLE_MAJOR' | 'INTERDISCIPLINARY'`  
**Response JSON (`200 OK`):**
```json
[
  {
    "projectId": "PRJ-IT-01",
    "projectName": "Campus Support Platform",
    "mode": "SINGLE_MAJOR",
    "major": "Information Technology",
    "dept": "Software Engineering",
    "taskProgress": 90,
    "gateStatuses": {
      "R1": "PASSED",
      "R2": "IN_REVIEW",
      "R3": "PLANNED",
      "R4": "LOCKED"
    },
    "blockingReasons": {
      "R2": ["1 minh chứng chưa được thẩm định"]
    }
  }
]
```

---

### API 7: `GET /api/v1/projects/{projectId}/review-timeline`
**Response JSON (`200 OK`):**
```json
{
  "projectId": "PRJ-IT-01",
  "projectCode": "PRJ-9",
  "projectName": "Campus Support Platform",
  "projectMode": "SINGLE_MAJOR",
  "major": "Information Technology",
  "effectivePolicyVersion": "1.0",
  "currentGateCode": "R2",
  "gates": [
    {
      "gateInstanceId": "inst-r2",
      "code": "R2",
      "title": "System Design & Prototype",
      "objective": "Thẩm định kiến trúc hệ thống, ERD và giao diện người dùng",
      "status": "IN_REVIEW",
      "reviewEligibility": "READY",
      "isRequired": true,
      "windowStart": "2026-10-01",
      "windowEnd": "2026-10-25",
      "blockingReasons": [
        { "code": "REQ_REVISION", "message": "Hội đồng yêu cầu chỉnh sửa SDD" }
      ],
      "requirements": [
        {
          "id": "req-r2-2",
          "code": "R2-SDD",
          "title": "Software Design Document (SDD)",
          "type": "DOCUMENT",
          "scope": "IT",
          "isMandatory": true,
          "verificationStatus": "REJECTED",
          "latestArtifact": {
            "version": 2,
            "filename": "SDD_v2.pdf",
            "submittedAt": "2026-10-14T10:00:00Z",
            "submittedBy": "Trưởng nhóm"
          },
          "reviewerFeedback": "Cần bổ sung component boundaries và sequence diagrams"
        }
      ]
    }
  ],
  "capabilities": {
    "canSubmitPackage": false,
    "canSubmitRevision": true,
    "blockingReasons": []
  }
}
```

---

### API 8: `POST /api/v1/projects/{projectId}/review-gates/{gateCode}/revisions`
**Request Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`  
**Request JSON Body:**
```json
{
  "projectId": "PRJ-IT-01",
  "gateCode": "R2",
  "requirementId": "req-r2-2",
  "artifactName": "SDD_v3_Final.pdf",
  "notes": "Đã bổ sung component boundaries và sequence diagrams theo nhận xét",
  "expectedVersion": 2
}
```
**Xử lý Lỗi & Mã HTTP:**
- `403 Forbidden`: Nếu `userId` gửi request không phải Trưởng nhóm (`isLeader === false`).
- `409 Conflict`: Nếu tài liệu hiện tại trên database có `version > expectedVersion`.
- `422 Unprocessable Entity`: Nếu `artifactName` hoặc `notes` rỗng.

---

### API 10: `POST /api/v1/reviews/evidence/verify`
**Request JSON Body:**
```json
{
  "projectId": "PRJ-IT-01",
  "gateCode": "R2",
  "requirementId": "req-r2-2",
  "verificationStatus": "ACCEPTED",
  "feedback": "Tài liệu đạt chuẩn kiến trúc"
}
```

---

### API 11: `POST /api/v1/reviews/gate-decision`
**Request JSON Body:**
```json
{
  "projectId": "PRJ-IT-01",
  "gateCode": "R2",
  "decision": "PASSED",
  "notes": "Đã thông qua toàn bộ tiêu chí thẩm định giai đoạn thiết kế kiến trúc",
  "expectedVersion": 1
}
```
**Xử lý Lỗi & Mã HTTP:**
- `422 Unprocessable Entity`: Nếu còn bất kỳ tiêu chí bắt buộc nào chưa đạt `ACCEPTED`.
- `409 Conflict`: Nếu cổng này đã được quyết định bởi thẩm định viên khác.
