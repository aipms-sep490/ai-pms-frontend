export type RequirementType =
  | 'DOCUMENT'
  | 'EVIDENCE'
  | 'DEMO'
  | 'LINK'
  | 'PREVIOUS_GATE'
  | 'MANUAL_DECISION'
  | 'METRIC'

export type RequirementScope =
  | 'COMMON'
  | 'IT'
  | 'Marketing'
  | 'Design'
  | 'MAJOR_SPECIFIC'
  | 'INDIVIDUAL'

export type VerificationMode = 'HUMAN' | 'SYSTEM' | 'SYSTEM + HUMAN'

export interface GateRequirement {
  id: string
  title: string
  description?: string
  type: RequirementType
  scope: RequirementScope
  majorId?: number | null
  verification: VerificationMode
  required: boolean
  minCount?: number
  evidenceType?: string
}

export interface ReviewGate {
  id: string
  code: string
  title: string
  objective: string
  required: boolean
  blockNextGate: boolean
  blocksDefense?: boolean
  start: string
  end: string
  reviewerPolicy: string
  reviewScope: 'COMMON' | 'MAJOR_SPECIFIC'
  requirements: GateRequirement[]
}

export type TemplateStatus = 'DRAFT' | 'PROPOSED' | 'PUBLISHED'

export interface ReviewGateTemplate {
  id: string
  code: string
  name: string
  projectPeriodId?: number
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
  gateStatuses: Record<string, GateStatus>
  blockingReasons?: Record<string, string[]>
  hybridScopes?: Record<string, GateStatus>
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
