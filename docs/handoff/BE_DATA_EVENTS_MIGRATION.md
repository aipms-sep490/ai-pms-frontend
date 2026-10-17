# CƠ SỞ DỮ LIỆU, SỰ KIỆN MIỀN & MIGRATION (BE DATA, EVENTS & MIGRATION)

**Dự án:** AI-PMS (Academic Capstone Project Management System)  
**Tài liệu tham chiếu:** `01_ANTIGRAVITY_MASTER_PROMPT.md`, `04_BE_BR_HANDOFF_SEED.md`.  
**Chuẩn hệ quản trị:** Microsoft SQL Server 2022 / Azure SQL Database / Entity Framework Core 9.

---

## 1. NGUYÊN TẮC THIẾT KẾ CƠ SỞ DỮ LIỆU
1. **Chỉ thêm mới (Additive Changes Only):** Không sửa đổi, xóa hoặc đổi tên bất kỳ cột/bảng hiện hữu nào của AI-PMS để tránh ảnh hưởng đến các module khác.
2. **Khóa Lạc quan (Optimistic Concurrency):** Mọi bảng có trạng thái nghiệp vụ bắt buộc phải có cột `RowVersion ROWVERSION` để chống ghi đè đồng thời.
3. **Ảnh chụp Bất biến (Immutable Snapshots):** Bảng `ProjectProcessSnapshots` lưu trữ JSON nén hoặc bản sao cấu trúc cổng tại thời điểm project được ACTIVE.
4. **Mô hình Hộp thư đi (Transactional Outbox Pattern):** Sự kiện thông báo được ghi vào bảng `OutboxNotifications` trong cùng giao dịch `DbContext.SaveChangesAsync()` của quyết định thẩm định.

---

## 2. KỊCH BẢN MIGRATION SQL CHUẨN HÓA (`20261017_Add_ReviewGates_CrossRole.sql`)

```sql
-- 1. BẢNG MẪU CHÍNH SÁCH CỔNG HỌC VỤ (TEMPLATES)
CREATE TABLE dbo.ReviewGateTemplates (
    Id NVARCHAR(50) NOT NULL PRIMARY KEY,
    Code NVARCHAR(50) NOT NULL UNIQUE,
    Name NVARCHAR(255) NOT NULL,
    ProjectPeriodId INT NULL,
    Mode NVARCHAR(50) NOT NULL, -- 'SINGLE_MAJOR' | 'INTERDISCIPLINARY'
    Major NVARCHAR(100) NOT NULL,
    LeadDepartmentId INT NULL,
    Status NVARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- 'DRAFT' | 'PUBLISHED' | 'RETIRED'
    Version NVARCHAR(20) NOT NULL DEFAULT '1.0',
    SourceDecisionRef NVARCHAR(255) NULL,
    CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CreatedBy INT NOT NULL,
    UpdatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    RowVersion ROWVERSION NOT NULL
);

-- 2. BẢNG CÁC CỔNG TRONG MẪU (GATES)
CREATE TABLE dbo.ReviewGates (
    Id NVARCHAR(50) NOT NULL PRIMARY KEY,
    TemplateId NVARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.ReviewGateTemplates(Id) ON DELETE CASCADE,
    Code NVARCHAR(20) NOT NULL, -- 'R1', 'R2', 'R3', 'R4'
    Title NVARCHAR(255) NOT NULL,
    Objective NVARCHAR(MAX) NOT NULL,
    SortOrder INT NOT NULL DEFAULT 1,
    Weight DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    IsRequired BIT NOT NULL DEFAULT 1,
    BlockNextGate BIT NOT NULL DEFAULT 1,
    BlocksDefense BIT NOT NULL DEFAULT 0,
    StartWindowOffsetDays INT NOT NULL DEFAULT 0,
    EndWindowOffsetDays INT NOT NULL DEFAULT 14,
    ReviewerPolicy NVARCHAR(100) NOT NULL,
    ReviewScope NVARCHAR(50) NOT NULL DEFAULT 'COMMON', -- 'COMMON' | 'MAJOR_SPECIFIC'
    MajorId INT NULL
);

-- 3. BẢNG TIÊU CHÍ MINH CHỨNG TRONG CỔNG (REQUIREMENTS)
CREATE TABLE dbo.GateRequirements (
    Id NVARCHAR(50) NOT NULL PRIMARY KEY,
    GateId NVARCHAR(50) NOT NULL FOREIGN KEY REFERENCES dbo.ReviewGates(Id) ON DELETE CASCADE,
    Code NVARCHAR(50) NOT NULL,
    Title NVARCHAR(255) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    Type NVARCHAR(50) NOT NULL, -- 'DOCUMENT' | 'EVIDENCE' | 'DEMO' | 'PREVIOUS_GATE'
    Scope NVARCHAR(50) NOT NULL, -- 'COMMON' | 'IT' | 'Marketing' | 'Design'
    VerificationMode NVARCHAR(50) NOT NULL DEFAULT 'HUMAN', -- 'HUMAN' | 'SYSTEM' | 'SYSTEM + HUMAN'
    IsMandatory BIT NOT NULL DEFAULT 1,
    MinCount INT NOT NULL DEFAULT 1
);

-- 4. BẢNG ẢNH CHỤP QUY TRÌNH ĐỒ ÁN BẤT BIẾN (PROJECT PROCESS SNAPSHOTS)
CREATE TABLE dbo.ProjectProcessSnapshots (
    Id NVARCHAR(50) NOT NULL PRIMARY KEY,
    ProjectId INT NOT NULL UNIQUE,
    TemplateVersionId NVARCHAR(50) NOT NULL,
    SnapshotJson NVARCHAR(MAX) NOT NULL,
    AppliedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    AppliedBy INT NOT NULL,
    RowVersion ROWVERSION NOT NULL
);

-- 5. BẢNG THỂ HIỆN CỔNG CỦA ĐỒ ÁN THỰC TẾ (GATE INSTANCES)
CREATE TABLE dbo.ProjectGateInstances (
    Id NVARCHAR(50) NOT NULL PRIMARY KEY,
    ProjectId INT NOT NULL,
    GateCode NVARCHAR(20) NOT NULL,
    Status NVARCHAR(30) NOT NULL DEFAULT 'PLANNED', -- 'PLANNED' | 'IN_REVIEW' | 'PASSED' | 'REVISION_REQUIRED' | 'LOCKED'
    Eligibility NVARCHAR(30) NOT NULL DEFAULT 'NOT_READY',
    StartAtUtc DATETIMEOFFSET NULL,
    EndAtUtc DATETIMEOFFSET NULL,
    PassedAtUtc DATETIMEOFFSET NULL,
    AssignedReviewerUserId INT NULL,
    RowVersion ROWVERSION NOT NULL,
    CONSTRAINT UQ_ProjectGate UNIQUE (ProjectId, GateCode)
);

-- 6. BẢNG LỊCH SỬ NỘP MINH CHỨNG (ARTIFACT SUBMISSIONS)
CREATE TABLE dbo.GateArtifactSubmissions (
    Id NVARCHAR(50) NOT NULL PRIMARY KEY,
    ProjectId INT NOT NULL,
    GateCode NVARCHAR(20) NOT NULL,
    RequirementId NVARCHAR(50) NOT NULL,
    ArtifactVersion INT NOT NULL DEFAULT 1,
    ArtifactFilename NVARCHAR(255) NOT NULL,
    StorageUri NVARCHAR(1000) NOT NULL,
    Notes NVARCHAR(MAX) NULL,
    VerificationStatus NVARCHAR(30) NOT NULL DEFAULT 'PENDING', -- 'PENDING' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED'
    ReviewerFeedback NVARCHAR(MAX) NULL,
    SubmittedBy INT NOT NULL,
    SubmittedAtUtc DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    VerifiedBy INT NULL,
    VerifiedAtUtc DATETIMEOFFSET NULL
);

-- 7. BẢNG NHẬT KÝ KIỂM TOÁN HỌC VỤ BẤT BIẾN (REVIEW GATE AUDITS)
CREATE TABLE dbo.ReviewGateAudits (
    Id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    ProjectId INT NOT NULL,
    GateCode NVARCHAR(20) NOT NULL,
    Action NVARCHAR(50) NOT NULL, -- 'SUBMITTED' | 'VERIFIED' | 'DECISION_PASSED' | 'REVISION_REQUESTED'
    ActorUserId INT NOT NULL,
    ActorRole NVARCHAR(50) NOT NULL,
    PreviousStatus NVARCHAR(50) NULL,
    NewStatus NVARCHAR(50) NOT NULL,
    Notes NVARCHAR(MAX) NULL,
    TimestampUtc DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
);

-- TẠO CÁC INDEX TỐI ƯU HIỆU NĂNG TRUY VẤN
CREATE NONCLUSTERED INDEX IX_ProjectGateInstances_Project ON dbo.ProjectGateInstances(ProjectId);
CREATE NONCLUSTERED INDEX IX_GateArtifactSubmissions_Requirement ON dbo.GateArtifactSubmissions(ProjectId, RequirementId);
CREATE NONCLUSTERED INDEX IX_ReviewGateAudits_Project ON dbo.ReviewGateAudits(ProjectId);
```

---

## 3. DANH MỤC SỰ KIỆN MIỀN & OUTBOX NOTIFICATIONS (SRS §3.14)

```csharp
public abstract record DomainEventBase(Guid EventId, DateTimeOffset OccurredAt);

// Khi Trưởng nhóm nộp minh chứng
public record ReviewGateRevisionSubmittedEvent(
    Guid EventId,
    int ProjectId,
    string ProjectCode,
    string GateCode,
    string RequirementId,
    int ArtifactVersion,
    int SubmittedByUserId,
    DateTimeOffset OccurredAt) : DomainEventBase(EventId, OccurredAt);

// Khi Thẩm định viên xác minh từng minh chứng
public record ReviewGateEvidenceVerifiedEvent(
    Guid EventId,
    int ProjectId,
    string GateCode,
    string RequirementId,
    string VerificationStatus,
    int ReviewerUserId,
    DateTimeOffset OccurredAt) : DomainEventBase(EventId, OccurredAt);

// Khi Thẩm định viên chốt quyết định ĐẠT hoặc YÊU CẦU SỬA ĐỔI CỔNG
public record ReviewGateDecisionRecordedEvent(
    Guid EventId,
    int ProjectId,
    string ProjectCode,
    string GateCode,
    string Decision, // "PASSED" | "REVISION_REQUIRED"
    int ReviewerUserId,
    DateTimeOffset OccurredAt) : DomainEventBase(EventId, OccurredAt);
```
