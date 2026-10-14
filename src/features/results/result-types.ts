// v5 ProjectResult/StudentResult DTOs — BACKEND_READY
// (AIPMS.Application/Features/Results/DTOs/ProjectResultDtos.cs,
//  AIPMS.Application/Features/Evaluations/DTOs/EvaluationSchemeDtos.cs,
//  AIPMS.Application/Features/Results/DTOs/ResultRevisionDtos.cs,
//  AIPMS.Api/Controllers/ResultHistoryController.cs).
// A published result is versioned: `version` starts at 1; an accepted correction publishes a new
// version whose `supersedesVersion` points at the one it replaces, with its own `revisionId`. v1
// has null revisionId/supersedesVersion. Missing provenance is LEGACY/UNKNOWN — never recalculated
// from current profiles. `breakdown` is optional until the backend has enough data to compute it;
// every consumer must render the raw total alone when it's absent, never reconstruct it client-side.

export interface ResultPolicy { projectId: number; passThreshold: number; concurrencyToken: string; isLocked: boolean; assignments: Array<{ assignmentId: number; weightPercent: number }> }

/** One scored contribution feeding a project result. `advisory` contributions (v5 D6:
 * industry ADVISORY) are shown separately and never counted into the numeric total. */
export interface ResultContribution { assignmentId: number; evaluationId: number; evaluatorId: number; rubricId: number; weightPercent: number; score: number; advisory?: boolean; source?: string }

/** Per-major aggregate inside a project breakdown. The backend does not expose a per-major weight
 * or display name here — only the score (null while PENDING). */
export interface ResultMajorScore { majorId: number; score: number | null }

/** One weighted component of a result (project- or student-level). `score` is null while that
 * component is still PENDING — never substitute 0; `requiredEvaluators`/`finalizedEvaluators`
 * say why. */
export interface ResultComponentScore {
  componentId: number
  name: string
  scope: 'COMMON' | 'MAJOR' | 'INDIVIDUAL' | string
  majorId?: number | null
  weightPercent: number
  score: number | null
  requiredEvaluators: number
  finalizedEvaluators: number
  stage?: string | null
}

/** `isDemo`/`approvalStatus` distinguish an academically-approved scheme from a demo/proposed one
 * (e.g. an unapproved Marketing rubric template) — never present a non-approved breakdown as an
 * official academic result without surfacing this. */
export interface ResultBreakdown {
  schemeName?: string | null
  schemeVersion?: number | null
  calculationVersion: string
  isLegacy: boolean
  isDemo?: boolean | null
  approvalStatus: string
  readiness: string
  unroundedTotal?: number | null
  commonScore?: number | null
  majorAggregate?: number | null
  majorBreakdown: ResultMajorScore[]
  components: ResultComponentScore[]
}

export interface ResultPreview {
  projectId: number; canPublish: boolean; blockers: string[]; totalScore: number | null; passThreshold: number | null; outcome: string | null; confirmationToken: string
  contributions: ResultContribution[]
  breakdown?: ResultBreakdown | null
}

export interface ProjectResult {
  id: number; projectId: number; finalSubmissionId: number; totalScore: number; passThreshold: number; outcome: string; calculationRule: string; publishedBy: number; publishedAt: string; policyConcurrencyToken: string
  contributions: ResultContribution[]
  breakdown?: ResultBreakdown | null
  /** Published version number; version 1 is the original publication. */
  version: number
  /** Set only for a corrected (v2+) result. */
  revisionId?: number | null
  supersedesVersion?: number | null
}

export interface StudentResult {
  id: number; projectId: number; studentId: number; majorId: number; schemeId: number
  totalScore: number; passThreshold: number; outcome: string; calculationRule: string
  publishedBy: number; publishedAt: string; snapshotJson: string
  breakdown?: ResultBreakdown | null
  version: number
  revisionId?: number | null
  supersedesVersion?: number | null
}

/** Redacted published-version summary from the history list (no raw inputs / correction notes). */
export interface ResultRevisionSummary {
  revisionId: number | null
  version: number
  supersedesVersion: number | null
  /** Null for a project-level entry; set for a student-level one. */
  studentId: number | null
  totalScore: number
  outcome: string
  publishedBy: number
  publishedAt: string
  reason?: string | null
  bundleId?: number | null
}
