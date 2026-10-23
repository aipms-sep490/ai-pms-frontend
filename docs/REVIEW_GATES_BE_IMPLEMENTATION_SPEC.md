# TÀI LIỆU YÊU CẦU & THIẾT KẾ KỸ THUẬT TRIỂN KHAI BACKEND
## TÍNH NĂNG: CROSS-ROLE REVIEW GATES & GOVERNANCE PIPELINE (V1 + V2)

> **Dự án**: AI-PMS (AI Project Management System)  
> **Target Service**: ASP.NET Core 9 / EF Core / SQL Server (`AIPMS.sln`)  
> **Frontend Target**: Đã hoàn tất 100% trên nhánh `feat/uiux-master-redesign` (chạy qua Mock Adapter, 26/26 tests passed)  
> **Bản sao tài liệu**: Đồng bộ tại `ai-pms-backend/docs/review-gates-backend-implementation-handoff.md`  
> **Mục tiêu Backend**: Xây dựng CSDL, Entity, CQRS MediatR, API Controllers và Outbox Events để thay thế Mock Adapter của Frontend.

---

### MỤC LỤC
1. [Kiến trúc Solution & Phân chia Project](#1-kiến-trúc-solution--phân-chia-project)
2. [Thiết kế Cơ sở dữ liệu & Kịch bản Migration SQL](#2-thiết-kế-cơ-sở-dữ-liệu--kịch-bản-migration-sql)
3. [Quy tắc Nghiệp vụ Bắt buộc (Business Invariants)](#3-quy-tắc-nghiệp-vụ-bắt-buộc-business-invariants)
4. [Chi tiết API Endpoints & Request/Response Contracts](#4-chi-tiết-api-endpoints--requestresponse-contracts)
5. [Tích hợp Hệ thống Thông báo (Notification Center Events)](#5-tích-hợp-hệ-thống-thông-báo-notification-center-events)
6. [Kế hoạch Triển khai & Tiêu chuẩn Nghiệm thu (Acceptance Checklist)](#6-kế-hoạch-triển-khai--tiêu-chuẩn-nghiệm-thu-acceptance-checklist)

---

### 1. KIẾN TRÚC SOLUTION & PHÂN CHIA PROJECT

Hệ thống tuân thủ Clean Architecture chuẩn của solution:

```
src/
├── AIPMS.Domain/
│   └── ReviewGates/
│       ├── Entities/
│       │   ├── ReviewGateTemplate.cs
│       │   ├── ReviewGateDefinition.cs
│       │   ├── ReviewGateRequirement.cs
│       │   ├── ProjectGateInstance.cs
│       │   ├── ProjectGateEvidenceArtifact.cs
│       │   ├── ProjectGateDecision.cs
│       │   └── ProjectGateAdvisoryGuidance.cs
│       └── Enums/
│           ├── GateMode.cs               // SINGLE_MAJOR, INTERDISCIPLINARY
│           ├── GateStatus.cs             // PLANNED, IN_REVIEW, PASSED, REVISION_REQUIRED
│           ├── ReviewEligibility.cs      // READY, BLOCKED
│           ├── VerificationStatus.cs     // PENDING, SUBMITTED, ACCEPTED, REJECTED
│           └── RequirementType.cs        // DOCUMENT, EVIDENCE, LINK, PREVIOUS_GATE
├── AIPMS.Application/
│   └── Features/ReviewGates/
│       ├── Commands/                     // CreateTemplate, UpdateTemplate, PublishTemplate, SubmitRevision, VerifyEvidence, SubmitGateDecision, RecordSupervisorGuidance
│       ├── Queries/                      // GetTemplates, GetTemplateById, GetMonitoringMatrix, GetStudentTimeline, GetAssignedReviews, GetDefenseReadiness
│       ├── DTOs/                         // Mapping tương thích 100% với review-gates.types.ts của FE
│       └── Validators/                   // FluentValidation cho từng Request DTO
├── AIPMS.Infrastructure/
│   └── Persistence/
│       ├── Configurations/               // EF Core IEntityTypeConfiguration cho 7 bảng mới
│       ├── Generated/AipmsDbContext.cs   // Khai báo DbSet<> và đăng ký Fluent API
│       └── Repositories/                 // ReviewGateRepository, ProjectGateRepository
└── AIPMS.Api/
    └── Controllers/
        ├── AcademicReviewGatesController.cs   // Route: api/v1/academic/review-gates (Department Staff & Admin)
        ├── ProjectReviewGatesController.cs    // Route: api/v1/projects/{projectId}/review-gates (Sinh viên & GVHD)
        └── ReviewerAssignmentsController.cs   // Route: api/v1/reviewers/gate-assignments (Hội đồng Thẩm định)
```

---

### 2. THIẾT KẾ CƠ SỞ DỮ LIỆU & KỊCH BẢN MIGRATION SQL

Tạo file script: `db/changes/20261017_add_review_gates_cross_role.sql`

```sql
-- =====================================================================================
-- 20261017_add_review_gates_cross_role.sql
-- Review Gates Engine: Single-major & Interdisciplinary Evaluation Pipeline
-- =====================================================================================

-- 1. Bảng Mẫu chính sách tiến trình đợt thẩm định (Review Gate Templates)
CREATE TABLE dbo.ReviewGateTemplates (
    Id NVARCHAR(64) NOT NULL PRIMARY KEY,
    Code NVARCHAR(50) NOT NULL UNIQUE,
    Name NVARCHAR(255) NOT NULL,
    Mode NVARCHAR(50) NOT NULL, -- 'SINGLE_MAJOR' | 'INTERDISCIPLINARY'
    Major NVARCHAR(100) NOT NULL,
    Status NVARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- 'DRAFT' | 'PROPOSED' | 'PUBLISHED'
    Version NVARCHAR(20) NOT NULL DEFAULT '1.0',
    ConcurrencyToken NVARCHAR(128) NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

-- 2. Bảng Định nghĩa từng Gate trong Template (R1..R4 / G1..G4)
CREATE TABLE dbo.ReviewGateDefinitions (
    Id NVARCHAR(64) NOT NULL PRIMARY KEY,
    TemplateId NVARCHAR(64) NOT NULL FOREIGN KEY REFERENCES dbo.ReviewGateTemplates(Id) ON DELETE CASCADE,
    Code NVARCHAR(20) NOT NULL, -- 'R1', 'R2', 'R3', 'R4'
    Title NVARCHAR(255) NOT NULL,
    Objective NVARCHAR(MAX) NULL,
    IsRequired BIT NOT NULL DEFAULT 1,
    BlockNextGate BIT NOT NULL DEFAULT 1,
    BlocksDefense BIT NOT NULL DEFAULT 0,
    WindowStart DATETIME2 NULL,
    WindowEnd DATETIME2 NULL,
    ReviewerPolicy NVARCHAR(100) NOT NULL,
    ReviewScope NVARCHAR(50) NOT NULL DEFAULT 'COMMON', -- 'COMMON' | 'IT' | 'Marketing' | 'Design'
    OrderIndex INT NOT NULL DEFAULT 0
);

-- 3. Bảng Tiêu chí/Minh chứng cần nộp trong Gate (Requirements)
CREATE TABLE dbo.ReviewGateRequirements (
    Id NVARCHAR(64) NOT NULL PRIMARY KEY,
    GateDefinitionId NVARCHAR(64) NOT NULL FOREIGN KEY REFERENCES dbo.ReviewGateDefinitions(Id) ON DELETE CASCADE,
    Code NVARCHAR(50) NULL,
    Title NVARCHAR(255) NOT NULL,
    Type NVARCHAR(50) NOT NULL, -- 'DOCUMENT' | 'EVIDENCE' | 'LINK' | 'PREVIOUS_GATE'
    Scope NVARCHAR(50) NOT NULL DEFAULT 'COMMON',
    VerificationType NVARCHAR(50) NOT NULL DEFAULT 'HUMAN', -- 'HUMAN' | 'SYSTEM' | 'SYSTEM + HUMAN'
    IsMandatory BIT NOT NULL DEFAULT 1
);

-- 4. Bảng Đợt thẩm định cụ thể gắn với Đồ án (Project Gate Instances)
CREATE TABLE dbo.ProjectGateInstances (
    Id NVARCHAR(64) NOT NULL PRIMARY KEY,
    ProjectId NVARCHAR(64) NOT NULL FOREIGN KEY REFERENCES dbo.Projects(Id),
    GateDefinitionId NVARCHAR(64) NOT NULL FOREIGN KEY REFERENCES dbo.ReviewGateDefinitions(Id),
    Code NVARCHAR(20) NOT NULL,
    Status NVARCHAR(50) NOT NULL DEFAULT 'PLANNED', -- 'PLANNED' | 'IN_REVIEW' | 'PASSED' | 'REVISION_REQUIRED'
    ReviewEligibility NVARCHAR(50) NOT NULL DEFAULT 'BLOCKED', -- 'READY' | 'BLOCKED'
    BlockingReasonsJson NVARCHAR(MAX) NULL, -- Lưu JSON danh sách lý do bị chặn
    ConcurrencyToken NVARCHAR(128) NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

-- 5. Bảng Minh chứng sinh viên đã nộp theo phiên bản (Evidence Artifacts)
CREATE TABLE dbo.ProjectGateEvidenceArtifacts (
    Id NVARCHAR(64) NOT NULL PRIMARY KEY,
    GateInstanceId NVARCHAR(64) NOT NULL FOREIGN KEY REFERENCES dbo.ProjectGateInstances(Id) ON DELETE CASCADE,
    RequirementId NVARCHAR(64) NOT NULL FOREIGN KEY REFERENCES dbo.ReviewGateRequirements(Id),
    Version INT NOT NULL DEFAULT 1,
    Filename NVARCHAR(500) NOT NULL,
    FileUrl NVARCHAR(1000) NULL,
    SubmittedByUserId NVARCHAR(64) NOT NULL,
    SubmittedByName NVARCHAR(255) NOT NULL,
    SubmittedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    SubmissionNotes NVARCHAR(MAX) NULL,
    VerificationStatus NVARCHAR(50) NOT NULL DEFAULT 'SUBMITTED', -- 'SUBMITTED' | 'ACCEPTED' | 'REJECTED'
    ReviewerFeedback NVARCHAR(MAX) NULL,
    VerifiedByUserId NVARCHAR(64) NULL,
    VerifiedAt DATETIME2 NULL
);

-- 6. Bảng Quyết định Thẩm định chính thức của Hội đồng (Gate Decisions)
CREATE TABLE dbo.ProjectGateDecisions (
    Id NVARCHAR(64) NOT NULL PRIMARY KEY,
    GateInstanceId NVARCHAR(64) NOT NULL FOREIGN KEY REFERENCES dbo.ProjectGateInstances(Id),
    Decision NVARCHAR(50) NOT NULL, -- 'PASSED' | 'REVISION_REQUIRED'
    ReviewerNotes NVARCHAR(MAX) NOT NULL,
    DecidedByUserId NVARCHAR(64) NOT NULL,
    DecidedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    Scope NVARCHAR(50) NOT NULL DEFAULT 'COMMON'
);

-- 7. Bảng Ý kiến tư vấn của Giảng viên hướng dẫn (Supervisor Advisory Guidance)
CREATE TABLE dbo.ProjectGateAdvisoryGuidances (
    Id NVARCHAR(64) NOT NULL PRIMARY KEY,
    GateInstanceId NVARCHAR(64) NOT NULL FOREIGN KEY REFERENCES dbo.ProjectGateInstances(Id),
    SupervisorUserId NVARCHAR(64) NOT NULL,
    GuidanceNotes NVARCHAR(MAX) NOT NULL,
    RecordedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

-- Chỉ mục tối ưu hóa truy vấn
CREATE INDEX IX_ReviewGateDefinitions_TemplateId ON dbo.ReviewGateDefinitions(TemplateId);
CREATE INDEX IX_ReviewGateRequirements_GateDefId ON dbo.ReviewGateRequirements(GateDefinitionId);
CREATE INDEX IX_ProjectGateInstances_ProjectId ON dbo.ProjectGateInstances(ProjectId);
CREATE INDEX IX_ProjectGateEvidence_GateInstId ON dbo.ProjectGateEvidenceArtifacts(GateInstanceId);
CREATE INDEX IX_ProjectGateDecisions_GateInstId ON dbo.ProjectGateDecisions(GateInstanceId);
```

---

### 3. QUY TẮC NGHIỆP VỤ BẮT BUỘC (BUSINESS INVARIANTS)

Backend Developer **bắt buộc cài đặt chặt chẽ** các Business Invariants sau ở `AIPMS.Application`:

| Mã quy tắc | Tên quy tắc | Hành vi & Ràng buộc Backend | Mã HTTP trả về khi vi phạm |
| :--- | :--- | :--- | :---: |
| **BRX-GATE-01** | **Tính bất biến của Template đã công bố (Policy Immutability)** | Khi `ReviewGateTemplate.Status == "PUBLISHED"`, cấm thêm, xóa hoặc sửa cấu trúc đợt thẩm định (`Gates` hoặc `Requirements`). Muốn sửa bắt buộc tạo bản nháp mới hoặc clone sang version mới. | **`403 Forbidden`** |
| **BRX-GATE-02** | **Thẩm quyền nộp bài của Sinh viên (Leader Authority)** | API nộp bài/bản sửa (`SubmitRevision`): BE kiểm tra `UserId` từ JWT Token. Chỉ **Trưởng nhóm (Student Leader)** của đồ án mới được phép nộp. Thành viên thường (`Member`) bị chặn hoàn toàn. | **`403 Forbidden`** |
| **BRX-GATE-03** | **Thẩm định Hai pha & Cấm Auto-PASS (Two-phase Evaluation)** | Khi Reviewer bấm duyệt đạt minh chứng (`verifyEvidence` -> `ACCEPTED`), hành động này **tuyệt đối không được tự động chuyển Gate thành PASSED**. Gate chỉ chuyển trạng thái khi Reviewer gọi riêng API ra quyết định chính thức (`submitGateDecision`). | Không tự động đổi trạng thái Gate |
| **BRX-GATE-04** | **Điều kiện tiên quyết để PASS Gate (Mandatory Evidence Precondition)** | Khi Reviewer gửi quyết định `decision == "PASSED"`, BE quét toàn bộ các requirements của Gate có cờ `IsMandatory == true`. Nếu còn bất kỳ requirement nào chưa đạt trạng thái `ACCEPTED`, BE chặn ngay lập tức. | **`422 Unprocessable Entity`** |
| **BRX-GATE-05** | **Khóa lạc quan chống ghi đè đồng thời (Optimistic Concurrency)** | Tất cả request sửa template, duyệt minh chứng và ra quyết định Gate đều phải gửi kèm `concurrencyToken` (hoặc `RowVersion`). Nếu token không khớp với DB, BE từ chối thực hiện. | **`409 Conflict`** |
| **BRX-GATE-06** | **Tự động mở khóa Gate tiếp theo (Next-Gate Progression)** | Khi Gate hiện tại (ví dụ R2) nhận quyết định `PASSED`, BE tự động cập nhật Gate tiếp theo (R3) từ `reviewEligibility = 'BLOCKED'` sang `reviewEligibility = 'READY'`, đồng thời xóa sạch các `blockingReasons`. | Tự động xử lý trong Transaction |
| **BRX-GATE-07** | **Độc lập chuyên môn trong Đồ án Liên ngành (Scoped Hybrid Review)** | Đối với đồ án đa ngành (`INTERDISCIPLINARY`), Reviewer ngành nào (IT/Marketing/Design) chỉ được quyền quyết định phạm vi ngành đó (`Scope`). Gate chung (`G2`, `G3`) chỉ PASS khi **100% các ngành thành viên đều đã PASS**. | Tránh ghi đè chéo ngành |
| **BRX-GATE-08** | **Biên giới quyền hạn của GVHD (Supervisor Advisory Boundary)** | Giảng viên hướng dẫn chỉ được ghi nhận ý kiến tư vấn định hướng (`Advisory Guidance`), **không được cấp quyền ký duyệt quyết định PASS** hoặc cho điểm thay Hội đồng thẩm định. | Bảo toàn phân định thẩm quyền |
| **BRX-GATE-09** | **Điều kiện Bảo vệ Cuối kỳ (Defense Readiness Calculation)** | `DefenseReadiness` là read-only model do BE tính toán. `isReady` chỉ bằng `true` khi: 1) Toàn bộ Review Gates (R1–R4) đạt `PASSED`; 2) Đủ checklist hồ sơ cuối kỳ; 3) Chính sách học vụ đã đóng băng. | Không để FE tính toán |

---

### 4. CHI TIẾT API ENDPOINTS & REQUEST/RESPONSE CONTRACTS

#### Nhóm 1: Quản trị Chính sách Bộ môn (Department Staff & Academic Admin)
*Cấu hình Authorize:* `[Authorize(Policy = AuthorizationPolicies.DepartmentOrAdmin)]`

```http
### 1.1 Lấy danh sách mẫu chính sách
GET /api/v1/academic/review-gates/templates
Response: 200 OK -> List<ReviewGateTemplateDto>

### 1.2 Lấy chi tiết một mẫu chính sách
GET /api/v1/academic/review-gates/templates/{id}
Response: 200 OK -> ReviewGateTemplateDto

### 1.3 Tạo mới hoặc lưu bản nháp mẫu chính sách
POST /api/v1/academic/review-gates/templates
Body: SaveReviewGateTemplateRequest
Response: 201 Created -> ReviewGateTemplateDto

### 1.4 Cập nhật mẫu chính sách (Kiểm tra Immutability & Concurrency)
PUT /api/v1/academic/review-gates/templates/{id}
Body: SaveReviewGateTemplateRequest (kèm concurrencyToken)
Response: 
  200 OK -> ReviewGateTemplateDto
  403 Forbidden -> "403: Không thể sửa đổi cấu trúc đợt thẩm định của mẫu chính sách đã công bố (PUBLISHED)."
  409 Conflict -> "409: Dữ liệu mẫu tiến trình đã được cập nhật bởi quản trị viên khác. Hãy tải lại trang."

### 1.5 Công bố mẫu chính sách (Publish)
POST /api/v1/academic/review-gates/templates/{id}/publish
Response: 200 OK -> ReviewGateTemplateDto (Status chuyển PUBLISHED, version tự động tăng)

### 1.6 Xem Ma trận Tiến trình Đồ án toàn trường / theo bộ môn
GET /api/v1/academic/review-gates/monitoring-matrix?filterMode={ALL|SINGLE_MAJOR|INTERDISCIPLINARY}
Response: 200 OK -> List<ProjectReviewMatrixRowDto>

### 1.7 Cập nhật kết quả thẩm định phân ngành liên ngành
POST /api/v1/academic/review-gates/projects/{projectId}/scopes/{scope}/decision
Body: { "decision": "PASSED" | "REVISION_REQUIRED" | "IN_REVIEW" }
Response: 200 OK -> ProjectReviewMatrixRowDto

### 1.8 Kiểm tra Điều kiện Sẵn sàng Bảo vệ Đồ án (Defense Readiness)
GET /api/v1/academic/review-gates/projects/{projectId}/defense-readiness
Response: 200 OK -> DefenseReadinessSummaryDto
```

#### Nhóm 2: Sinh viên (Student Review Timeline & Versioned Submission)
*Cấu hình Authorize:* `[Authorize(Roles = "STUDENT")]`

```http
### 2.1 Xem Dòng thời gian & Hồ sơ Thẩm định của Nhóm mình
GET /api/v1/projects/{projectId}/review-gates/timeline
Response: 200 OK -> StudentReviewTimelineDto

### 2.2 Nộp Minh chứng / Bản chỉnh sửa (Chỉ Trưởng nhóm)
POST /api/v1/projects/{projectId}/review-gates/revisions
Body:
{
  "gateCode": "R2",
  "requirementId": "req-r2-2",
  "artifactName": "SDD_v2.0_BoundaryClarified.pdf",
  "notes": "Đã bổ sung Architecture Boundary và component interop theo yêu cầu phản hồi từ reviewer.",
  "expectedVersion": 1
}
Response:
  200 OK -> StudentReviewTimelineDto (Requirement chuyển SUBMITTED, version tăng lên v2)
  403 Forbidden -> "403: Không đủ thẩm quyền. Chỉ trưởng nhóm (Student Leader) mới có quyền nộp hồ sơ review hoặc bản sửa."
  422 Unprocessable Entity -> "422: Minh chứng nộp và lý do chỉnh sửa không được để trống."
```

#### Nhóm 3: Giảng viên Thẩm định (Assigned Reviewer Workspace)
*Cấu hình Authorize:* `[Authorize(Roles = "LECTURER,DEPARTMENT_STAFF")]`

```http
### 3.1 Lấy Hàng đợi Đồ án được Phân công Thẩm định
GET /api/v1/reviewers/gate-assignments
Response: 200 OK -> List<AssignedReviewItemDto>

### 3.2 Xác minh từng Minh chứng (Chấp thuận / Từ chối)
POST /api/v1/reviewers/gate-assignments/{assignmentId}/requirements/{requirementId}/verify
Body:
{
  "decision": "ACCEPTED" | "REJECTED",
  "feedback": "Hồ sơ thiết kế kiến trúc đã sửa chuẩn xác.",
  "concurrencyToken": "token-rev-01"
}
Response:
  200 OK -> AssignedReviewItemDto
  409 Conflict -> "409: Dữ liệu đã thay đổi bởi phiên làm việc khác. Vui lòng tải lại."

### 3.3 Ra Quyết định Đợt Thẩm định (Chính thức)
POST /api/v1/reviewers/gate-assignments/{assignmentId}/decision
Body:
{
  "decision": "PASSED" | "REVISION_REQUIRED",
  "notes": "Hội đồng thống nhất thông qua Review Gate R2. Đồ án đủ điều kiện bước vào giai đoạn cài đặt.",
  "concurrencyToken": "token-rev-01"
}
Response:
  200 OK -> AssignedReviewItemDto
  409 Conflict -> "409: Dữ liệu đã thay đổi bởi phiên làm việc khác. Vui lòng tải lại."
  422 Unprocessable Entity -> "422: Không thể xác nhận Gate PASS vì còn {N} minh chứng bắt buộc chưa được ACCEPTED ({tên danh sách minh chứng})."
```

#### Nhóm 4: Giảng viên Hướng dẫn (Primary Supervisor Follow-up)
*Cấu hình Authorize:* `[Authorize(Roles = "LECTURER")]`

```http
### 4.1 Ghi nhận ý kiến tư vấn định hướng của GVHD
POST /api/v1/projects/{projectId}/review-gates/{gateCode}/supervisor-guidance
Body:
{
  "guidanceNotes": "Nhóm cần tập trung bổ sung diagram theo đúng góp ý của thầy phản biện trước ngày 18/10."
}
Response: 200 OK
```

---

### 5. TÍCH HỢP HỆ THỐNG THÔNG BÁO (NOTIFICATION CENTER EVENTS)

Khi lưu trữ thành công các thao tác, Backend ghi nhận Event thông qua **Outbox Pattern** và phát hành các thông báo với đúng mã `notificationType` sau:

| Notification Type | Tiêu đề thông báo mẫu | Đối tượng nhận | Link điều hướng trên FE (Deep Link) |
| :--- | :--- | :--- | :--- |
| `REVIEW_POLICY_PUBLISHED` | Chính sách Review Gate đã công bố | Giảng viên, Sinh viên, Chủ nhiệm BM | `/department/projects/progress-matrix` |
| `GATE_REVIEW_ASSIGNED` | Bạn được phân công thẩm định đồ án | Giảng viên Thẩm định (Reviewer) | `/review/gate-assignments` |
| `GATE_REVISION_SUBMITTED` | Nhóm đồ án đã nộp bản sửa minh chứng | Giảng viên Thẩm định (Reviewer) | `/review/gate-assignments` |
| `GATE_REVISION_REQUIRED` | Yêu cầu chỉnh sửa hồ sơ Review Gate | Toàn bộ thành viên nhóm sinh viên | `/project/timeline` |
| `EVIDENCE_VERIFIED` | Minh chứng đồ án đã được xác minh | Toàn bộ thành viên nhóm sinh viên | `/project/timeline` |
| `GATE_DECISION_RECORDED` | Quyết định thẩm định chính thức đợt Gate | Sinh viên nhóm đồ án, GVHD | `/project/timeline` |
| `DISCIPLINE_REVIEW_PENDING` | Cần thẩm định phân ngành liên ngành | Bộ môn thành viên chuyên ngành | `/department/projects/progress-matrix` |
| `DEFENSE_READINESS_CHANGED` | Cập nhật điều kiện sẵn sàng bảo vệ | Toàn trường, Trưởng bộ môn, GVHD | `/department/projects/progress-matrix` |

---

### 6. KẾ HOẠCH TRIỂN KHAI & TIÊU CHUẨN NGHIỆM THU (ACCEPTANCE CHECKLIST)

Backend Developer tiến hành triển khai theo các bước tuần tự:
- [ ] **Bước 1**: Chạy migration SQL `db/changes/20261017_add_review_gates_cross_role.sql`.
- [ ] **Bước 2**: Khai báo Entity C# trong `AIPMS.Domain` và cấu hình DbContext trong `AIPMS.Infrastructure`.
- [ ] **Bước 3**: Viết các MediatR Handler và FluentValidation trong `AIPMS.Application`, đảm bảo kiểm tra đầy đủ các mã lỗi `403`, `409`, `422`.
- [ ] **Bước 4**: Tạo các Controllers trong `AIPMS.Api` theo đúng đường dẫn URL và DTO ở Mục 4.
- [ ] **Bước 5**: Viết Unit/Integration Test trên xUnit xác nhận kịch bản:
  1. Thử sửa template đã publish -> Ném lỗi `403`.
  2. Member thử submit revision -> Ném lỗi `403`.
  3. Leader submit revision hợp lệ -> Trả về `200`, version tăng từ 1 lên 2.
  4. Reviewer verify minh chứng -> Minh chứng ACCEPTED nhưng Gate **không** tự PASS.
  5. Reviewer thử PASS khi còn minh chứng bắt buộc chưa duyệt -> Ném lỗi `422`.
  6. Gửi token cũ -> Ném lỗi `409`.
  7. Reviewer gửi PASS hợp lệ -> Gate PASS, Gate tiếp theo tự động chuyển `READY`.
- [ ] **Bước 6**: Ghép nối với Frontend: Tắt Mock Adapter trên FE và kiểm tra API End-to-End thực tế.
