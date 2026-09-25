export interface EvaluationAssignment {
  id: number; projectId: number; evaluatorId: number; rubricId: number; projectPeriodId: number; departmentId: number
  evaluationType: 'SUPERVISOR' | 'LECTURER'; status: 'ACTIVE' | 'REVOKED'; assignedBy: number; assignedAt: string; revokedAt: string | null; concurrencyToken: string
}
export interface EvaluationScore { rubricCriterionId: number; name: string; description: string | null; weightPercent: number; maxScore: number; sortOrder: number; isRequired: boolean; score: number | null; comments: string | null }
export interface EvaluationDraft {
  id: number; assignmentId: number; projectId: number; evaluatorId: number; rubricId: number; rubricName: string; rootRubricId: number; rubricVersion: number
  evaluationType: string; status: 'DRAFT' | 'FINALIZED' | string; comments: string | null; totalScore: number | null; scoreScale: number; calculationRule: string
  missingCriterionIds: number[]; missingRequiredCriterionIds: number[]; concurrencyToken: string; createdAt: string; updatedAt: string; scores: EvaluationScore[]
  finalization: { finalizedBy: number; finalizedAt: string; evidence: { finalSubmissionId: number; artifactCount: number; fileCount: number } } | null
}
export interface EvaluationScoreInput { rubricCriterionId: number; score: number; comments: string | null }
