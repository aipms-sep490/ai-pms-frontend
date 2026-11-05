/** v5 EvaluatorSource. SUPERVISOR/LECTURER are live today; DISCIPLINE_MENTOR/INDUSTRY
 * are accepted now so an industry/mentor assignment renders correctly the moment the
 * backend starts emitting it. Kept open with `string` for forward compatibility. */
export type EvaluatorRole = 'SUPERVISOR' | 'LECTURER' | 'DISCIPLINE_MENTOR' | 'INDUSTRY' | (string & {})

export interface EvaluationAssignment {
  projectTitle?: string | null; componentName?: string | null; rubricName?: string | null; majorName?: string | null; studentName?: string | null
  id: number; projectId: number; evaluatorId: number; rubricId: number; projectPeriodId: number; departmentId: number
  evaluationType: EvaluatorRole; status: 'ACTIVE' | 'REVOKED'; assignedBy: number; assignedAt: string; revokedAt: string | null; concurrencyToken: string
  scope: 'COMMON' | 'MAJOR_SPECIFIC' | 'INDIVIDUAL' | 'UNKNOWN'; majorId: number | null; studentId: number | null; componentId: number | null; policyVersionId: number | null
  /** Current BE EvaluationAssignmentDto includes the stage frozen on this assignment. */
  stage?: EvaluationStage | null
  /** v5 D6/BRX-EVAL-05: industry input is advisory unless the scheme grants a weighted scope.
   * Optional until the backend ships it; absent is treated as non-advisory (scored). */
  industryScoringMode?: 'ADVISORY' | 'WEIGHTED'; advisory?: boolean
}
export type EvaluationScope = Exclude<EvaluationAssignment['scope'], 'UNKNOWN'>
export type EvaluationStage = 'ON_GOING' | 'COLD' | 'DEFENSE' | (string & {})
export const evaluationStageLabels = {
  COLD: 'Chấm hồ sơ đã khóa',
  DEFENSE: 'Bảo vệ',
  ON_GOING: 'Đánh giá quá trình',
} as const
export const evaluationStageLabel = (stage: EvaluationStage | null | undefined) =>
  stage ? evaluationStageLabels[stage as keyof typeof evaluationStageLabels] ?? stage : 'Chưa xác định'
export interface CriterionLevel { levelOrder: number; label: string; descriptor: string; scoreFrom: number | null; scoreTo: number | null }
export interface SchemeEvaluatorWeight { evaluatorId: number; weightPercent: number }
export interface SchemePolicy {
  isDemo: boolean; approvalStatus: string; approvalReference: string | null
  formula: string; calculationVersion: string; roundingMode: string; decimalPlaces: number
}
export interface EvaluationSchemeComponent {
  id: number; name: string; scope: EvaluationScope; majorId: number | null; rubricId: number
  projectWeightPercent: number; studentWeightPercent: number; requiredEvaluators: number
  /** Missing weights use the BE equal-mean rule; historical stages remain unknown. */
  evaluatorWeights?: SchemeEvaluatorWeight[] | null; stage?: EvaluationStage | null
}
export interface EvaluationSchemeStudent { studentId: number; majorId: number; departmentId: number }
export interface EvaluationScheme { id: number; rootId: number; version: number; projectId: number; projectPeriodId: number; name: string; status: 'DRAFT' | 'PROPOSED' | 'PUBLISHED' | 'FROZEN' | string; passThreshold: number; concurrencyToken: string; policyVersionId: number | null; components: EvaluationSchemeComponent[]; students: EvaluationSchemeStudent[]; calculationRule: string; policy?: SchemePolicy | null; lockedAt?: string | null }
export interface EvaluationScore { rubricCriterionId: number; name: string; description: string | null; weightPercent: number; maxScore: number; sortOrder: number; isRequired: boolean; score: number | null; comments: string | null; criterionCode?: string | null; /** BE sends leaves only; these fields identify their display group. */ parentId?: number | null; parentName?: string | null; effectiveWeightPercent?: number | null; learningOutcome?: string | null; evidenceGuidance?: string | null; levels?: CriterionLevel[] | null }
export interface EvaluationDraft {
  id: number; assignmentId: number; projectId: number; evaluatorId: number; rubricId: number; rubricName: string; rootRubricId: number; rubricVersion: number
  evaluationType: string; status: 'DRAFT' | 'FINALIZED' | string; comments: string | null; totalScore: number | null; scoreScale: number; calculationRule: string
  missingCriterionIds: number[]; missingRequiredCriterionIds: number[]; concurrencyToken: string; createdAt: string; updatedAt: string; scores: EvaluationScore[]
  finalization: { finalizedBy: number; finalizedAt: string; evidence: { finalSubmissionId: number; artifactCount: number; fileCount: number } } | null
}
export interface EvaluationScoreInput { rubricCriterionId: number; score: number; comments: string | null }
