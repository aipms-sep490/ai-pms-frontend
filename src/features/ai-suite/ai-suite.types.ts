export interface AiSnapshotMetaDto {
  snapshotId: number | null
  featureKey: string
  status: string
  modelVersion: string | null
  generatedAt: string
  createdByName: string | null
  isSimulatedFallback?: boolean
}

// #1 Defense Mock Q&A, Answer Evaluation & Gate Script Draft
export type CommitteeRoleFocus = 'ALL' | 'CHAIR' | 'REVIEWER' | 'SECRETARY'

export interface DefenseMockRequest {
  roleFocus?: CommitteeRoleFocus
  questionCount?: number
  focusTopic?: string | null
}

export interface DefenseMockQuestionDto {
  id: string
  committeeRole: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | string
  category: string
  question: string
  whyAsked: string
  suggestedAnswerOutline: string
  keyPointsToMention: string[]
  targetStudentName: string | null
}

export interface DefenseMockDto {
  projectId: number
  headline: string
  readinessAssessment: string
  weakSpots: string[]
  questions: DefenseMockQuestionDto[]
  meta: AiSnapshotMetaDto
}

export interface DefenseAnswerEvalRequest {
  question: string
  studentAnswer: string
  committeeRole?: string | null
  suggestedOutline?: string | null
}

export interface DefenseAnswerEvalDto {
  projectId: number
  score: number
  verdict: 'STRONG' | 'ADEQUATE' | 'NEEDS_IMPROVEMENT' | string
  feedback: string
  strengths: string[]
  missingPoints: string[]
  improvedAnswerSample: string
  followUpProbe: string | null
  meta: AiSnapshotMetaDto
}

export interface GateScriptDraftRequest {
  focusNote?: string | null
}

export interface GateScriptAgendaDraftDto {
  stage: string
  durationMinutes: number
  purpose: string
}

export interface GateScriptQuestionDraftDto {
  askerRole: string
  question: string
  targetMemberName: string | null
  verificationGoal: string
}

export interface GateScriptDraftDto {
  gateInstanceId: number
  projectId: number
  gateCode: string
  executiveBrief: string
  strengthHighlights: string[]
  riskWatchlist: string[]
  agendaStages: GateScriptAgendaDraftDto[]
  suggestedQuestions: GateScriptQuestionDraftDto[]
  remediationWatchlist: string[]
  generalNotesDraft: string
  meta: AiSnapshotMetaDto
}

// #2 Auto Progress Report Draft
export interface ProgressReportDraftRequest {
  reportType?: string
  periodStart?: string | null
  periodEnd?: string | null
  additionalNote?: string | null
}

export interface ProgressReportDraftEvidenceDto {
  sourceType: 'TASK' | 'MEETING_AI' | 'DELIVERABLE' | 'MILESTONE' | string
  title: string
  detail: string
}

export interface ProgressReportDraftDto {
  projectId: number
  reportType: string
  periodStart: string
  periodEnd: string
  summary: string
  completedWork: string
  inProgressWork: string
  plannedWork: string
  issuesAndRisks: string
  evidence: ProgressReportDraftEvidenceDto[]
  meta: AiSnapshotMetaDto
}

// #3 Multi-dimensional Contribution Fairness
export interface MemberFairnessMetricDto {
  userId: number
  fullName: string
  role: string
  tasksAssigned: number
  tasksCompleted: number
  tasksOverdue: number
  criteriaCompleted: number
  commentCount: number
  meetingsAttended: number
  speechSegments: number
  speechSharePercent: number
  averageWeeklyScore: number | null
  averagePeerRating: number | null
  signal: 'BALANCED' | 'OVERLOADED_BURNOUT' | 'LOW_ENGAGEMENT_RISK' | 'PEER_MISMATCH' | string
  assessment: string
  evidenceBullets: string[]
}

export interface ContributionFairnessDto {
  projectId: number
  balanceScore: number
  headline: string
  executiveSummary: string
  includesPrivateSignals: boolean
  members: MemberFairnessMetricDto[]
  rebalanceRecommendations: string[]
  supervisorVerificationQuestions: string[]
  meta: AiSnapshotMetaDto
}

// #4 Rubric Grading Copilot, Calibration & Appeal Assist
export interface RubricCriterionSuggestionDto {
  rubricCriterionId: number
  criterionName: string
  weightPercent: number
  maxScore: number | null
  suggestedLevel: string
  suggestedScoreMin: number | null
  suggestedScoreMax: number | null
  suggestedComment: string
  evidenceCitations: string[]
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | string
}

export interface RubricGradingCopilotDto {
  assignmentId: number
  projectId: number
  rubricName: string
  overallSummary: string
  criteria: RubricCriterionSuggestionDto[]
  verificationQuestions: string[]
  disclaimer: string
  meta: AiSnapshotMetaDto
  antiAnchoringEnforced?: boolean
}

export interface ScoreCalibrationAlertDto {
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | string
  category: string
  title: string
  detail: string
  criterionName: string | null
}

export interface ScoreCalibrationDto {
  projectId: number
  evaluatedCount: number
  overallStatus: 'CONSISTENT' | 'REVIEW_RECOMMENDED' | 'HIGH_VARIANCE' | string
  summary: string
  alerts: ScoreCalibrationAlertDto[]
  recommendations: string[]
  meta: AiSnapshotMetaDto
}

export interface AppealAssistDto {
  appealId: number
  projectId: number
  appealSummary: string
  meritAssessment: 'LIKELY_MERIT' | 'NEEDS_MANUAL_CHECK' | 'WEAK_BASIS' | string
  keyClaims: string[]
  evidenceChecks: string[]
  draftResponse: string
  meta: AiSnapshotMetaDto
}

// #5 Task Breakdown & Sprint Retrospective
export interface TaskBreakdownRequest {
  taskId?: number | null
  title?: string | null
  description?: string | null
  milestoneId?: number | null
}

export interface TaskBreakdownCriterionDto {
  title: string
  verificationHint: string
}

export interface TaskAssigneeRecommendationDto {
  userId: number
  fullName: string
  majorName: string | null
  openTaskCount: number
  reason: string
}

export interface TaskBreakdownDto {
  projectId: number
  taskTitle: string
  suggestedPriority: string
  suggestedStoryPoints: number
  implementationSummary: string
  criteria: TaskBreakdownCriterionDto[]
  potentialRisks: string[]
  relatedExistingTasks: string[]
  recommendedAssignees: TaskAssigneeRecommendationDto[]
  meta: AiSnapshotMetaDto
}

export interface SprintRetroDto {
  projectId: number
  sprintId: number
  sprintName: string
  totalTasks: number
  completedTasks: number
  overdueOrIncompleteTasks: number
  headline: string
  executiveSummary: string
  wentWell: string[]
  needsImprovement: string[]
  bottlenecks: string[]
  nextSprintActions: string[]
  meta: AiSnapshotMetaDto
}

// #6 Pre-flight Submission Checker
export type SubmissionPreflightTarget = 'FINAL_SUBMISSION' | 'COLD' | 'REVIEW_GATE'

export interface SubmissionPreflightRequest {
  target: SubmissionPreflightTarget
  targetId?: number | null
}

export interface SubmissionPreflightCheckDto {
  item: string
  status: 'PASS' | 'WARN' | 'FAIL' | string
  detail: string
  fixSuggestion: string | null
}

export interface SubmissionPreflightDto {
  projectId: number
  target: string
  readinessScore: number
  verdict: 'READY' | 'WARNING' | 'BLOCKING_ISSUES' | string
  summary: string
  checks: SubmissionPreflightCheckDto[]
  priorityFixes: string[]
  meta: AiSnapshotMetaDto
}

// #7 Team Skill-Gap & Working Agreement Draft
export interface TeamSkillGapRequest {
  topicId?: number | null
  projectId?: number | null
  customTopicDescription?: string | null
}

export interface SkillCoverageItemDto {
  skillOrRole: string
  status: 'COVERED' | 'WEAK' | 'MISSING' | string
  coveredByMembers: string[]
  note: string
}

export interface MemberRoleSuggestionDto {
  userId: number
  fullName: string
  majorName: string | null
  suggestedRole: string
  strengths: string[]
}

export interface TeamSkillGapDto {
  teamId: number
  teamName: string
  projectMode: string
  readinessScore: number
  summary: string
  coverageMatrix: SkillCoverageItemDto[]
  roleSuggestions: MemberRoleSuggestionDto[]
  onboardingRecommendations: string[]
  meta: AiSnapshotMetaDto
}

export interface WorkingAgreementDraftRequest {
  teamPreferences?: string | null
}

export interface WorkingAgreementSectionDraftDto {
  title: string
  body: string
}

export interface WorkingAgreementDraftDto {
  projectId: number
  summary: string
  sections: WorkingAgreementSectionDraftDto[]
  meta: AiSnapshotMetaDto
}

// #8 Department Weekly Executive Brief
export interface DepartmentBriefRequest {
  semesterId?: number | null
  departmentId?: number | null
}

export interface DepartmentRiskProjectDto {
  projectId: number
  projectCode: string
  projectTitle: string
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | string
  overdueTaskCount: number
  blockedTaskCount: number
  daysSinceLastMeeting: number
  reason: string
  recommendedAction: string
}

export interface DepartmentSupervisorLoadDto {
  userId: number
  fullName: string
  activeProjectCount: number
  note: string
}

export interface DepartmentExecutiveBriefDto {
  departmentId: number | null
  scopeName: string
  totalActiveProjects: number
  atRiskProjectCount: number
  silentTeamCount: number
  pendingAppealsCount: number
  headline: string
  executiveSummary: string
  topRiskProjects: DepartmentRiskProjectDto[]
  supervisorAlerts: DepartmentSupervisorLoadDto[]
  weeklyPriorityActions: string[]
  meta: AiSnapshotMetaDto
}

// #9 Evaluation Scheme AI Suggest
export interface EvaluationSchemeSuggestComponentDto {
  name: string
  scope: 'COMMON' | 'MAJOR_SPECIFIC' | 'INDIVIDUAL' | string
  majorId: number | null
  majorName: string | null
  rubricId: number
  rubricCode: string
  rubricName: string
  stage: 'ON_GOING' | 'COLD' | 'DEFENSE' | string
  projectWeightPercent: number
  studentWeightPercent: number
  requiredEvaluators: number
  rationale: string
  isIntegration?: boolean
}

export interface EvaluationSchemeSuggestDto {
  projectId: number
  suggestedName: string
  suggestedPassThreshold: number
  summary: string
  usedAi: boolean
  components: EvaluationSchemeSuggestComponentDto[]
  warnings: string[]
  meta: AiSnapshotMetaDto
  calculationVersion?: string | null
  failingComponentFloor?: number | null
  trackCode?: string | null
}
