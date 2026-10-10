export interface ResultPolicy { projectId: number; passThreshold: number; concurrencyToken: string; isLocked: boolean; assignments: Array<{ assignmentId: number; weightPercent: number }> }
export interface ResultPreview { projectId: number; canPublish: boolean; blockers: string[]; totalScore: number | null; passThreshold: number | null; outcome: string | null; confirmationToken: string; contributions: Array<{ assignmentId: number; evaluationId: number; evaluatorId: number; rubricId: number; weightPercent: number; score: number }> }
export interface ProjectResult { id: number; projectId: number; finalSubmissionId: number; totalScore: number; passThreshold: number; outcome: string; calculationRule: string; publishedBy: number; publishedAt: string; policyConcurrencyToken: string; contributions: ResultPreview['contributions'] }
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
