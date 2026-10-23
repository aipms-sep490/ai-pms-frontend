export type RequirementType =
  | 'FILE'
  | 'EXTERNAL_LINK'
  | 'DOCUMENT'
  | 'EVIDENCE'
  | 'DEMO'
  | 'LINK'
  | 'PREVIOUS_GATE'
  | 'MANUAL_DECISION'
  | 'METRIC'

export type RequirementScope =
  | 'COMMON'
  | 'MAJOR_SPECIFIC'
  | 'INDIVIDUAL'

export type VerificationMode = 'HUMAN' | 'SYSTEM' | 'SYSTEM + HUMAN'

export interface GateRequirement {
  id: string
  code?: string
  title: string
  description?: string
  type: RequirementType
  scope: RequirementScope
  majorId?: number | null
  targetStudentId?: number | null
  verification: VerificationMode
  required: boolean
  minCount?: number
  evidenceType?: string
}

export interface ReviewGate {
  weight?: number
  id: string
  code: string
  sequence?: number
  title: string
  objective: string
  required: boolean
  blockNextGate: boolean
  blocksDefense?: boolean
  start: string | null
  end: string | null
  reviewerPolicy: string
  reviewScope: 'COMMON' | 'MAJOR_SPECIFIC'
  requirements: GateRequirement[]
}

export type TemplateStatus = 'DRAFT' | 'PROPOSED' | 'PUBLISHED'

export interface ReviewGateTemplate {
  id: string
  code: string
  name: string
  projectPeriodId?: number | null
  mode: 'SINGLE_MAJOR' | 'INTERDISCIPLINARY'
  major: string
  gatesCount: number
  status: TemplateStatus
  version: string
  concurrencyToken: string
  gates: ReviewGate[]
}

export type GateStatus = 'PLANNED' | 'IN_REVIEW' | 'PASSED' | 'REVISION_REQUIRED' | 'LOCKED'

export interface ProjectReviewMatrixRow {
  projectId: string
  projectName: string
  mode: 'SINGLE_MAJOR' | 'INTERDISCIPLINARY'
  major: string
  dept: string
  taskProgress: number
  hasTasks?: boolean
  gateStatuses: Record<string, GateStatus>
  blockingReasons?: Record<string, string[]>
  hybridScopes?: Record<string, GateStatus>
  hybridScopeLabels?: Record<string, string>
}

export interface DefenseCondition {
  id: string
  title: string
  satisfied: boolean | null
  detail: string
  isMandatory: boolean
}

export interface DefenseReadinessSummary {
  projectId: string
  projectName: string
  isReady: boolean
  blockedCount: number
  conditions: DefenseCondition[]
}

export interface StudentGateRequirement {
  id: string
  code: string
  title: string
  type: RequirementType
  scope: RequirementScope
  isMandatory: boolean
  verificationStatus: 'PENDING' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED'
  latestArtifact?: {
    version: number
    filename: string
    submittedAt: string
    submittedBy: string
    notes?: string | null
    contentType?: string
    sizeBytes?: number
    sha256?: string
    downloadUrl?: string
    linkUrl?: string | null
  } | null
  reviewerFeedback?: string | null
}

export interface StudentGateInstance {
  weight?: number
  gateInstanceId: string
  code: string
  title: string
  objective: string
  status: GateStatus
  reviewEligibility: 'READY' | 'BLOCKED' | 'NOT_READY'
  isRequired: boolean
  windowStart: string | null
  windowEnd: string | null
  concurrencyToken?: string
  blockingReasons: Array<{ code: string; requirementCode?: string; message: string }>
  requirements: StudentGateRequirement[]
}

export interface DisciplineBranchProgress {
  scope: string
  name: string
  progress: number | null
  weight?: number | null
  status?: GateStatus
}

export interface StudentReviewTimelineDto {
  projectId: string
  projectCode: string
  projectName: string
  projectMode: 'SINGLE_MAJOR' | 'INTERDISCIPLINARY'
  major: string
  effectivePolicyVersion: string
  currentGateCode: string
  taskProgress?: number
  academicProgress?: number | null
  academicProgressSource?: string
  isDefenseReady?: boolean | null
  defenseReadinessStatus?: string
  disciplineProgress?: DisciplineBranchProgress[]
  supervisorFeedbacks?: Array<{
    gateCode: string
    feedback: string
    submittedAt: string
    supervisorName?: string
  }>
  gates: StudentGateInstance[]
  capabilities: {
    canSubmitPackage: boolean
    canSubmitRevision: boolean
    blockingReasons: string[]
  }
}

export interface SubmitRevisionRequest {
  projectId: string
  gateCode: string
  requirementId: string
  artifactName: string
  notes: string
  expectedVersion: number
  concurrencyToken?: string
  mode?: 'file' | 'link'
  linkUrl?: string
  file?: File
}

export interface SubmitGatePackageRequest {
  projectId: string
  gateCode: string
  notes?: string
  concurrencyToken?: string
}

export interface SupervisorFeedbackRequest {
  projectId: string
  gateCode: string
  feedback: string
}

export interface AssignedReviewItem {
  id: string
  projectId: string
  projectCode: string
  projectName: string
  gateCode: string
  gateTitle: string
  scope: string
  dueAt: string | null
  status: 'PENDING_REVIEW' | 'IN_REVIEW' | 'DECIDED' | 'REVOKED'
  latestDecision?: 'PASSED' | 'REVISION_REQUIRED' | null
  requirements: StudentGateRequirement[]
  reviewerNotes?: string | null
  concurrencyToken: string
}

export interface VerifyEvidenceRequest {
  assignmentId: string
  requirementId: string
  decision: 'ACCEPTED' | 'REJECTED'
  feedback?: string
  concurrencyToken: string
}

export interface GateDecisionRequest {
  assignmentId: string
  decision: 'PASSED' | 'REVISION_REQUIRED'
  notes: string
  concurrencyToken: string
}

