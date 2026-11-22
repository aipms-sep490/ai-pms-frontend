import { httpGet, httpPost, httpPut } from '../../../services/http/http-client'

export interface ProjectChecklistItemDto {
  id: number
  itemCode: string
  section: string
  trackScope: 'COMMON' | 'IT' | 'MKT' | 'INTEGRATION'
  majorId?: number | null
  conditionTag: string
  coreQuestion: string
  priority: 'Mandatory' | 'Recommended' | 'Conditional'
  weight: number
  isApplicable: boolean
  naReason?: string | null
  tailoredCheckpoints?: string | null
  tailoredEvidence?: string | null
  reviewerFocusPrompt?: string | null
  sourceRef?: string | null
  advisoryStatus?: string | null
  advisoryNotes?: string | null
  reviewerScore?: number | null
  reviewerNotes?: string | null
}

export interface ChecklistNormalizedScoreDto {
  totalApplicableWeight: number
  earnedWeightedScore: number
  normalizedScoreOutOf10: number | null
  ratingBand: string
  applicableCount: number
  scoredCount: number
  naCount: number
}

export interface ProjectGateChecklistDto {
  id: number
  projectId: number
  gateInstanceId: number
  gateCode: string
  templateId?: number | null
  version: number
  status: 'DRAFT' | 'PUBLISHED'
  advisorRecommendation: 'PENDING' | 'RECOMMEND_DEFENSE' | 'NOT_RECOMMENDED'
  reviewerRecommendation: 'PENDING' | 'RECOMMEND_DEFENSE' | 'NOT_RECOMMENDED'
  review3ConsensusStatus: 'PENDING_RECOMMENDATIONS' | 'AGREE' | 'DISAGREE'
  concurrencyToken: string
  scoreSummary?: ChecklistNormalizedScoreDto | null
  items: ProjectChecklistItemDto[]
}

export interface ChecklistDiffPreviewDto {
  checklistId: number
  version: number
  status: string
  totalItems: number
  applicableItems: number
  naItems: number
  tailoredItems: number
  entries: Array<{
    itemCode: string
    section: string
    priority: string
    isApplicable: boolean
    naReason?: string | null
    coreQuestion: string
    tailoredCheckpoints?: string | null
    tailoredEvidence?: string | null
  }>
}

export interface PreDefenseLockStatusDto {
  projectId: number
  projectStatus: string
  lockWorkflowStatus: 'OPEN' | 'PENDING_SUPERVISOR_LOCK' | 'LOCKED'
  coldManifestSha256?: string | null
  lockedBySupervisorId?: number | null
  forceLockedBy?: number | null
  forceLockReason?: string | null
}

export const getProjectGateChecklist = (projectId: number, gateCode: string) =>
  httpGet<ProjectGateChecklistDto>(`/projects/${projectId}/review-gates/${encodeURIComponent(gateCode)}/checklist`)

export const tailorProjectChecklist = (
  projectId: number,
  checklistId: number,
  body: {
    concurrencyToken: string
    items: Array<{
      itemCode: string
      isApplicable: boolean
      naReason?: string | null
      tailoredCheckpoints?: string | null
      tailoredEvidence?: string | null
      reviewerFocusPrompt?: string | null
      sourceRef?: string | null
    }>
  },
) => httpPut<ProjectGateChecklistDto>(`/projects/${projectId}/checklists/${checklistId}/tailor`, body)

export const getChecklistDiffPreview = (projectId: number, checklistId: number) =>
  httpGet<ChecklistDiffPreviewDto>(`/projects/${projectId}/checklists/${checklistId}/diff`)

export const publishProjectChecklist = (projectId: number, checklistId: number) =>
  httpPost<ProjectGateChecklistDto>(`/projects/${projectId}/checklists/${checklistId}/publish`, {})

export const requestFinalLock = (projectId: number) =>
  httpPost<PreDefenseLockStatusDto>(`/projects/${projectId}/final-submission/request-lock`, {})

export const supervisorDecideFinalLock = (projectId: number, body: { decision: 'LOCK' | 'RETURN_TO_OPEN'; notes?: string }) =>
  httpPost<PreDefenseLockStatusDto>(`/projects/${projectId}/final-submission/supervisor-lock`, body)

export const forceLockFinal = (projectId: number, reason: string) =>
  httpPost<PreDefenseLockStatusDto>(`/projects/${projectId}/final-submission/force-lock`, { reason })
