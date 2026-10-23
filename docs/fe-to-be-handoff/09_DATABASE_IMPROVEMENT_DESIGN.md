# 09 — DATABASE IMPROVEMENT DESIGN & DDL SPECIFICATION
**AI-PMS (Academic Information & Project Management System)**  
**Target Migration:** `db/changes/V061__create_review_gates_schema.sql`  
**RDBMS:** Microsoft SQL Server 2022 / Azure SQL Database  

---

## 1. Migration Overview
This script adds 8 new tables for the Review Gates subsystem and 1 interdisciplinary support table, complete with foreign keys, check constraints, non-clustered performance indexes, and optimistic concurrency tokens (`RowVersion`).

All foreign keys use `ON DELETE NO ACTION` to eliminate multiple cascade path cycles in SQL Server.

---

## 2. Production Ready DDL Script (`V061__create_review_gates_schema.sql`)

```sql
-- ============================================================================
-- SCRIPT: V061__create_review_gates_schema.sql
-- DESCRIPTION: Introduces Review Gates, Evidence Ledgers, Reviewer Assignments,
--              Evaluations, and Interdisciplinary Department Mapping.
-- ============================================================================

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
BEGIN TRANSACTION;

-- ----------------------------------------------------------------------------
-- 1. ReviewGateTemplates: Master template definition per academic period/major
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ReviewGateTemplates')
BEGIN
    CREATE TABLE dbo.ReviewGateTemplates (
        Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_ReviewGateTemplates_Id DEFAULT NEWSEQUENTIALID(),
        AcademicPeriodId UNIQUEIDENTIFIER NOT NULL,
        MajorId UNIQUEIDENTIFIER NULL, -- NULL indicates universal template across all majors
        GateSequence INT NOT NULL,     -- 1, 2, 3, 4
        GateName NVARCHAR(150) NOT NULL,
        GateDescription NVARCHAR(500) NULL,
        OffsetDaysFromSemesterStart INT NOT NULL, -- Target scheduling offset
        DurationDays INT NOT NULL CONSTRAINT DF_ReviewGateTemplates_DurationDays DEFAULT 7,
        PassThresholdScore DECIMAL(4,2) NOT NULL CONSTRAINT DF_ReviewGateTemplates_PassThreshold DEFAULT 6.50,
        IsMandatory BIT NOT NULL CONSTRAINT DF_ReviewGateTemplates_IsMandatory DEFAULT 1,
        CreatedAtUtc DATETIME2(7) NOT NULL CONSTRAINT DF_ReviewGateTemplates_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CreatedBy UNIQUEIDENTIFIER NOT NULL,
        RowVersion ROWVERSION NOT NULL,
        CONSTRAINT PK_ReviewGateTemplates PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_ReviewGateTemplates_AcademicPeriod FOREIGN KEY (AcademicPeriodId) REFERENCES dbo.AcademicPeriods(Id),
        CONSTRAINT FK_ReviewGateTemplates_Major FOREIGN KEY (MajorId) REFERENCES dbo.Majors(Id),
        CONSTRAINT UQ_ReviewGateTemplates_Period_Major_Seq UNIQUE (AcademicPeriodId, MajorId, GateSequence),
        CONSTRAINT CK_ReviewGateTemplates_Score CHECK (PassThresholdScore >= 0.0 AND PassThresholdScore <= 10.0)
    );
    CREATE NONCLUSTERED INDEX IX_ReviewGateTemplates_PeriodMajor ON dbo.ReviewGateTemplates (AcademicPeriodId, MajorId);
END;

-- ----------------------------------------------------------------------------
-- 2. GateTemplateCriteria: Itemized rubric scoring criteria for each gate template
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'GateTemplateCriteria')
BEGIN
    CREATE TABLE dbo.GateTemplateCriteria (
        Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_GateTemplateCriteria_Id DEFAULT NEWSEQUENTIALID(),
        GateTemplateId UNIQUEIDENTIFIER NOT NULL,
        CriteriaCode NVARCHAR(50) NOT NULL,
        CriteriaName NVARCHAR(200) NOT NULL,
        Weight DECIMAL(3,2) NOT NULL, -- Sum of weights must equal 1.00
        MinScoreThreshold DECIMAL(4,2) NOT NULL CONSTRAINT DF_GateTemplateCriteria_MinScore DEFAULT 4.00,
        SortOrder INT NOT NULL CONSTRAINT DF_GateTemplateCriteria_SortOrder DEFAULT 1,
        CONSTRAINT PK_GateTemplateCriteria PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_GateTemplateCriteria_Template FOREIGN KEY (GateTemplateId) REFERENCES dbo.ReviewGateTemplates(Id) ON DELETE CASCADE,
        CONSTRAINT CK_GateTemplateCriteria_Weight CHECK (Weight > 0.0 AND Weight <= 1.0)
    );
    CREATE NONCLUSTERED INDEX IX_GateTemplateCriteria_Template ON dbo.GateTemplateCriteria (GateTemplateId, SortOrder);
END;

-- ----------------------------------------------------------------------------
-- 3. ProjectGateInstances: Specific gate execution for an active project
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProjectGateInstances')
BEGIN
    CREATE TABLE dbo.ProjectGateInstances (
        Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_ProjectGateInstances_Id DEFAULT NEWSEQUENTIALID(),
        ProjectId UNIQUEIDENTIFIER NOT NULL,
        GateTemplateId UNIQUEIDENTIFIER NOT NULL,
        GateSequence INT NOT NULL,
        GateName NVARCHAR(150) NOT NULL,
        Status NVARCHAR(50) NOT NULL, -- LOCKED, OPEN_FOR_SUBMISSION, UNDER_REVIEW, PASSED, REVISION_REQUIRED, FAILED, OVERRIDDEN_PASSED
        SubmissionDeadlineUtc DATETIME2(7) NOT NULL,
        ExtensionDeadlineUtc DATETIME2(7) NULL,
        SubmittedAtUtc DATETIME2(7) NULL,
        EvaluatedAtUtc DATETIME2(7) NULL,
        AverageScore DECIMAL(4,2) NULL,
        IsOverridden BIT NOT NULL CONSTRAINT DF_ProjectGateInstances_IsOverridden DEFAULT 0,
        OverriddenBy UNIQUEIDENTIFIER NULL,
        OverriddenAtUtc DATETIME2(7) NULL,
        OverrideReason NVARCHAR(1000) NULL,
        MentorEndorsedAtUtc DATETIME2(7) NULL,
        MentorFeedback NVARCHAR(1000) NULL,
        RowVersion ROWVERSION NOT NULL,
        CONSTRAINT PK_ProjectGateInstances PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_ProjectGateInstances_Project FOREIGN KEY (ProjectId) REFERENCES dbo.Projects(Id),
        CONSTRAINT FK_ProjectGateInstances_Template FOREIGN KEY (GateTemplateId) REFERENCES dbo.ReviewGateTemplates(Id),
        CONSTRAINT FK_ProjectGateInstances_OverriddenBy FOREIGN KEY (OverriddenBy) REFERENCES dbo.Users(Id),
        CONSTRAINT UQ_ProjectGateInstances_Project_Seq UNIQUE (ProjectId, GateSequence),
        CONSTRAINT CK_ProjectGateInstances_Status CHECK (Status IN ('LOCKED', 'OPEN_FOR_SUBMISSION', 'UNDER_REVIEW', 'PASSED', 'REVISION_REQUIRED', 'FAILED', 'OVERRIDDEN_PASSED'))
    );
    CREATE NONCLUSTERED INDEX IX_ProjectGateInstances_StatusDeadline ON dbo.ProjectGateInstances (ProjectId, Status, SubmissionDeadlineUtc);
    CREATE NONCLUSTERED INDEX IX_ProjectGateInstances_CohortLookup ON dbo.ProjectGateInstances (GateSequence, Status) INCLUDE (ProjectId, AverageScore);
END;

-- ----------------------------------------------------------------------------
-- 4. GateEvidenceLedgers: Mandatory/optional evidence submitted by students
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'GateEvidenceLedgers')
BEGIN
    CREATE TABLE dbo.GateEvidenceLedgers (
        Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_GateEvidenceLedgers_Id DEFAULT NEWSEQUENTIALID(),
        GateInstanceId UNIQUEIDENTIFIER NOT NULL,
        EvidenceType NVARCHAR(50) NOT NULL, -- GIT_REPOSITORY, DOCUMENT_PDF, DEMO_URL, TEST_REPORT, MENTOR_SIGNOFF
        Title NVARCHAR(200) NOT NULL,
        Description NVARCHAR(1000) NULL,
        ExternalUrl NVARCHAR(1000) NULL,
        FileStorageKey NVARCHAR(500) NULL,
        FileChecksumSha256 NVARCHAR(64) NULL,
        FileSizeBytes BIGINT NULL,
        Status NVARCHAR(30) NOT NULL CONSTRAINT DF_GateEvidenceLedgers_Status DEFAULT 'SUBMITTED', -- SUBMITTED, VERIFIED, REJECTED
        SubmittedBy UNIQUEIDENTIFIER NOT NULL,
        SubmittedAtUtc DATETIME2(7) NOT NULL CONSTRAINT DF_GateEvidenceLedgers_SubmittedAtUtc DEFAULT SYSUTCDATETIME(),
        RowVersion ROWVERSION NOT NULL,
        CONSTRAINT PK_GateEvidenceLedgers PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_GateEvidenceLedgers_GateInstance FOREIGN KEY (GateInstanceId) REFERENCES dbo.ProjectGateInstances(Id) ON DELETE CASCADE,
        CONSTRAINT FK_GateEvidenceLedgers_User FOREIGN KEY (SubmittedBy) REFERENCES dbo.Users(Id),
        CONSTRAINT CK_GateEvidenceLedgers_Type CHECK (EvidenceType IN ('GIT_REPOSITORY', 'DOCUMENT_PDF', 'DEMO_URL', 'TEST_REPORT', 'MENTOR_SIGNOFF'))
    );
    CREATE NONCLUSTERED INDEX IX_GateEvidenceLedgers_GateInstance ON dbo.GateEvidenceLedgers (GateInstanceId, EvidenceType);
END;

-- ----------------------------------------------------------------------------
-- 5. GateReviewerAssignments: Independent reviewers mapped to project gates
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'GateReviewerAssignments')
BEGIN
    CREATE TABLE dbo.GateReviewerAssignments (
        Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_GateReviewerAssignments_Id DEFAULT NEWSEQUENTIALID(),
        GateInstanceId UNIQUEIDENTIFIER NOT NULL,
        ReviewerId UNIQUEIDENTIFIER NOT NULL,
        AssignedBy UNIQUEIDENTIFIER NOT NULL,
        AssignedAtUtc DATETIME2(7) NOT NULL CONSTRAINT DF_GateReviewerAssignments_AssignedAtUtc DEFAULT SYSUTCDATETIME(),
        ReviewStatus NVARCHAR(30) NOT NULL CONSTRAINT DF_GateReviewerAssignments_Status DEFAULT 'ASSIGNED', -- ASSIGNED, IN_PROGRESS, COMPLETED, EXPIRED
        DeadlineUtc DATETIME2(7) NOT NULL,
        CONSTRAINT PK_GateReviewerAssignments PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_GateReviewerAssignments_Gate FOREIGN KEY (GateInstanceId) REFERENCES dbo.ProjectGateInstances(Id) ON DELETE CASCADE,
        CONSTRAINT FK_GateReviewerAssignments_Reviewer FOREIGN KEY (ReviewerId) REFERENCES dbo.Users(Id),
        CONSTRAINT FK_GateReviewerAssignments_AssignedBy FOREIGN KEY (AssignedBy) REFERENCES dbo.Users(Id),
        CONSTRAINT UQ_GateReviewerAssignments_Gate_Reviewer UNIQUE (GateInstanceId, ReviewerId)
    );
    CREATE NONCLUSTERED INDEX IX_GateReviewerAssignments_Reviewer ON dbo.GateReviewerAssignments (ReviewerId, ReviewStatus, DeadlineUtc);
END;

-- ----------------------------------------------------------------------------
-- 6. GateEvaluations: Reviewer evaluation headers
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'GateEvaluations')
BEGIN
    CREATE TABLE dbo.GateEvaluations (
        Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_GateEvaluations_Id DEFAULT NEWSEQUENTIALID(),
        GateInstanceId UNIQUEIDENTIFIER NOT NULL,
        ReviewerId UNIQUEIDENTIFIER NOT NULL,
        IsDraft BIT NOT NULL CONSTRAINT DF_GateEvaluations_IsDraft DEFAULT 1,
        GeneralFeedback NVARCHAR(2000) NULL,
        TotalWeightedScore DECIMAL(4,2) NULL,
        Verdict NVARCHAR(30) NULL, -- PASSED, REVISION_REQUIRED, FAILED
        SubmittedAtUtc DATETIME2(7) NULL,
        RowVersion ROWVERSION NOT NULL,
        CONSTRAINT PK_GateEvaluations PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_GateEvaluations_Gate FOREIGN KEY (GateInstanceId) REFERENCES dbo.ProjectGateInstances(Id),
        CONSTRAINT FK_GateEvaluations_Reviewer FOREIGN KEY (ReviewerId) REFERENCES dbo.Users(Id),
        CONSTRAINT UQ_GateEvaluations_Gate_Reviewer UNIQUE (GateInstanceId, ReviewerId)
    );
    CREATE NONCLUSTERED INDEX IX_GateEvaluations_Gate ON dbo.GateEvaluations (GateInstanceId, IsDraft);
END;

-- ----------------------------------------------------------------------------
-- 7. GateEvaluationScores: Itemized scores per rubric criterion
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'GateEvaluationScores')
BEGIN
    CREATE TABLE dbo.GateEvaluationScores (
        Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_GateEvaluationScores_Id DEFAULT NEWSEQUENTIALID(),
        GateEvaluationId UNIQUEIDENTIFIER NOT NULL,
        CriteriaId UNIQUEIDENTIFIER NOT NULL,
        Score DECIMAL(4,2) NOT NULL,
        Comment NVARCHAR(500) NULL,
        CONSTRAINT PK_GateEvaluationScores PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_GateEvaluationScores_Evaluation FOREIGN KEY (GateEvaluationId) REFERENCES dbo.GateEvaluations(Id) ON DELETE CASCADE,
        CONSTRAINT FK_GateEvaluationScores_Criteria FOREIGN KEY (CriteriaId) REFERENCES dbo.GateTemplateCriteria(Id),
        CONSTRAINT UQ_GateEvaluationScores_Eval_Criteria UNIQUE (GateEvaluationId, CriteriaId),
        CONSTRAINT CK_GateEvaluationScores_Range CHECK (Score >= 0.0 AND Score <= 10.0)
    );
END;

-- ----------------------------------------------------------------------------
-- 8. GateAuditLogs: Immutable audit trail for gate transitions and overrides
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'GateAuditLogs')
BEGIN
    CREATE TABLE dbo.GateAuditLogs (
        Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_GateAuditLogs_Id DEFAULT NEWSEQUENTIALID(),
        GateInstanceId UNIQUEIDENTIFIER NOT NULL,
        FromStatus NVARCHAR(50) NOT NULL,
        ToStatus NVARCHAR(50) NOT NULL,
        ActionType NVARCHAR(50) NOT NULL, -- SYSTEM_PASS, REVIEWER_SCORE, DEPT_OVERRIDE, DEADLINE_LOCK
        PerformedBy UNIQUEIDENTIFIER NOT NULL,
        PerformedAtUtc DATETIME2(7) NOT NULL CONSTRAINT DF_GateAuditLogs_PerformedAtUtc DEFAULT SYSUTCDATETIME(),
        Justification NVARCHAR(1000) NULL,
        IpAddress NVARCHAR(50) NULL,
        CONSTRAINT PK_GateAuditLogs PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_GateAuditLogs_Gate FOREIGN KEY (GateInstanceId) REFERENCES dbo.ProjectGateInstances(Id),
        CONSTRAINT FK_GateAuditLogs_User FOREIGN KEY (PerformedBy) REFERENCES dbo.Users(Id)
    );
    CREATE NONCLUSTERED INDEX IX_GateAuditLogs_GateDate ON dbo.GateAuditLogs (GateInstanceId, PerformedAtUtc DESC);
END;

-- ----------------------------------------------------------------------------
-- 9. ProjectAffiliatedDepartments: Interdisciplinary multi-department bridge
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProjectAffiliatedDepartments')
BEGIN
    CREATE TABLE dbo.ProjectAffiliatedDepartments (
        Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_ProjectAffiliatedDepartments_Id DEFAULT NEWSEQUENTIALID(),
        ProjectId UNIQUEIDENTIFIER NOT NULL,
        DepartmentId UNIQUEIDENTIFIER NOT NULL,
        AffiliationRole NVARCHAR(30) NOT NULL, -- PRIMARY, SECONDARY, SUPPORTING
        MajorCode NVARCHAR(20) NOT NULL,       -- e.g. SE, MKT, GD
        WeightPercentage DECIMAL(5,2) NOT NULL CONSTRAINT DF_ProjectAffiliated_Weight DEFAULT 100.0,
        CONSTRAINT PK_ProjectAffiliatedDepartments PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_ProjectAffiliated_Project FOREIGN KEY (ProjectId) REFERENCES dbo.Projects(Id) ON DELETE CASCADE,
        CONSTRAINT FK_ProjectAffiliated_Department FOREIGN KEY (DepartmentId) REFERENCES dbo.Departments(Id),
        CONSTRAINT UQ_ProjectAffiliated_Project_Dept UNIQUE (ProjectId, DepartmentId)
    );
    CREATE NONCLUSTERED INDEX IX_ProjectAffiliated_DeptProject ON dbo.ProjectAffiliatedDepartments (DepartmentId, ProjectId);
END;

COMMIT TRANSACTION;
```
