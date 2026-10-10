export interface ResultPolicy { projectId: number; passThreshold: number; concurrencyToken: string; isLocked: boolean; assignments: Array<{ assignmentId: number; weightPercent: number }> }

/** One scored contribution feeding a project result. `advisory` contributions (v5 D6:
 * industry ADVISORY) are shown separately and never counted into the numeric total. */
export interface ResultContribution { assignmentId: number; evaluationId: number; evaluatorId: number; rubricId: number; weightPercent: number; score: number; advisory?: boolean; source?: string }

/** v5 ProjectResult = 50% COMMON + 50% MajorAggregate. `majorScore` is null while a
 * mandatory major is still PENDING; the FE never substitutes 0. Optional until the
 * backend ships the breakdown — the page shows the total alone when absent. */
export interface ProjectMajorScore { majorId: number; majorName?: string | null; majorScore: number | null; weightPercent: number; status?: string }

export interface ResultPreview {
  projectId: number; canPublish: boolean; blockers: string[]; totalScore: number | null; passThreshold: number | null; outcome: string | null; confirmationToken: string
  contributions: ResultContribution[]
  commonScore?: number | null; majorAggregate?: number | null; majorBreakdown?: ProjectMajorScore[]
}
export interface ProjectResult {
  id: number; projectId: number; finalSubmissionId: number; totalScore: number; passThreshold: number; outcome: string; calculationRule: string; publishedBy: number; publishedAt: string; policyConcurrencyToken: string
  contributions: ResultContribution[]
  commonScore?: number | null; majorAggregate?: number | null; majorBreakdown?: ProjectMajorScore[]
}
/** One weighted component of a student's published result. Per BE-09, `score`
 * is null while that component is still PENDING; the FE never substitutes 0. */
export interface StudentResultComponent { scope: 'COMMON' | 'MAJOR' | 'INDIVIDUAL' | string; majorName?: string | null; weightPercent: number; score: number | null; status: string }

export interface StudentResult {
  id: number; projectId: number; studentId: number; majorId: number; schemeId: number
  totalScore: number; passThreshold: number; outcome: string; calculationRule: string
  publishedBy: number; publishedAt: string; snapshotJson: string
  // BE-09 typed breakdown (optional until the backend contract ships; the page
  // shows the summary alone when these are absent).
  schemeName?: string; schemeVersion?: number | string; components?: StudentResultComponent[]
}
