import { httpGet, httpPost, httpPut } from '../../../services/http/http-client'

export type AcademicTrackCode = 'IT_ONLY' | 'MKT_ONLY' | 'IT_MKT'

export interface BlueprintGateRule {
  code: string
  sequence: number
  title: string
  objective: string
  submissionOffsetWorkingDays: number
  reviewDurationWorkingDays: number
  revisionDurationWorkingDays: number
  weight?: number | null
  blocksDefense?: boolean
  requiredDeliverables?: string[] | null
}

export interface BlueprintSprintRule {
  originId: string
  name: string
  startOffsetWorkingDays: number
  durationWorkingDays: number
}

export interface BlueprintTaskRule {
  originId: string
  title: string
  description?: string | null
  priority?: string
  isCoreGateTask?: boolean
  gateCode?: string | null
  dueOffsetWorkingDays?: number | null
}

export interface BlueprintMilestoneRule {
  originId: string
  title: string
  description?: string | null
  startOffsetWorkingDays: number
  dueOffsetWorkingDays: number
  sortOrder: number
  coreTasks?: BlueprintTaskRule[] | null
}

export interface BlueprintIntegrationDeliverableRule {
  code: string
  title: string
  stages: string[]
}

export interface AcademicBlueprintConfig {
  gateRules?: BlueprintGateRule[]
  sprintRules?: BlueprintSprintRule[]
  milestoneRules?: BlueprintMilestoneRule[]
  integrationDeliverables?: BlueprintIntegrationDeliverableRule[]
  evaluationSchemePreset?: string | null
}

export interface AcademicBlueprintApprovalDto {
  departmentId: number
  scopeRole: 'LEAD' | 'PARTICIPATING'
  decision: 'PENDING' | 'APPROVED' | 'REJECTED'
  decidedBy?: number | null
  decidedAt?: string | null
  notes?: string | null
}

export interface AcademicBlueprintDto {
  id: number
  academicSemesterId: number
  trackCode: AcademicTrackCode
  code: string
  name: string
  version: number
  status: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'RETIRED'
  leadDepartmentId: number
  participatingDepartmentId?: number | null
  periodPolicyVersionId?: number | null
  gateTemplateId?: number | null
  milestoneTemplateId?: number | null
  rubricId?: number | null
  config: AcademicBlueprintConfig
  concurrencyToken: string
  createdBy: number
  createdAt: string
  updatedAt: string
  publishedAt?: string | null
  approvals: AcademicBlueprintApprovalDto[]
}

export interface BlueprintDryRunDiffDto {
  projectId: number
  blueprintId: number
  blueprintVersion: number
  trackCode: AcademicTrackCode
  executionPeriodId?: number | null
  anchorDateUtc: string
  alreadyApplied: boolean
  gates: Array<{
    code: string
    title: string
    action: string
    submissionDueAt: string
    reviewWindowEndAt: string
    revisionDueAt: string
  }>
  sprints: Array<{ entityType: string; originId: string; title: string; action: string; startAt?: string | null; endAt?: string | null }>
  milestones: Array<{ entityType: string; originId: string; title: string; action: string; startAt?: string | null; endAt?: string | null }>
  coreTasks: Array<{ entityType: string; originId: string; title: string; action: string; isCoreGateTask: boolean }>
  preservedCustomizedItems: string[]
}

export interface GateDeadlineChangeRequestDto {
  id: number
  projectId: number
  gateInstanceId: number
  gateCode: string
  requestedSubmissionDueAt: string
  requestedReviewEndAt: string
  requestedRevisionDueAt: string
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  requestedBy: number
  reviewedBy?: number | null
  reviewNotes?: string | null
  createdAt: string
  reviewedAt?: string | null
  concurrencyToken: string
}

export interface SemesterReadinessDto {
  academicSemesterId: number
  isReadyForRegistration: boolean
  presentPeriodTypes: string[]
  missingPeriodTypes: string[]
  publishedTracks: string[]
  missingOrUnpublishedTracks: string[]
  blockingIssues: string[]
}

export interface CreateAcademicBlueprintRequest {
  academicSemesterId: number
  trackCode: AcademicTrackCode
  code: string
  name: string
  leadDepartmentId: number
  participatingDepartmentId?: number | null
  config: AcademicBlueprintConfig
  periodPolicyVersionId?: number | null
  gateTemplateId?: number | null
  milestoneTemplateId?: number | null
  rubricId?: number | null
}

export interface UpdateAcademicBlueprintRequest {
  name: string
  participatingDepartmentId?: number | null
  config: AcademicBlueprintConfig
  concurrencyToken: string
  periodPolicyVersionId?: number | null
  gateTemplateId?: number | null
  milestoneTemplateId?: number | null
  rubricId?: number | null
}

export function listAcademicBlueprints(params?: { semesterId?: number; trackCode?: string; status?: string }) {
  const query = new URLSearchParams()
  if (params?.semesterId) query.set('semesterId', String(params.semesterId))
  if (params?.trackCode) query.set('trackCode', params.trackCode)
  if (params?.status) query.set('status', params.status)
  const qs = query.toString()
  return httpGet<AcademicBlueprintDto[]>(`/academic-blueprints${qs ? `?${qs}` : ''}`)
}

export function createAcademicBlueprint(body: CreateAcademicBlueprintRequest) {
  return httpPost<AcademicBlueprintDto>('/academic-blueprints', body)
}

export function updateAcademicBlueprint(id: number, body: UpdateAcademicBlueprintRequest) {
  return httpPut<AcademicBlueprintDto>(`/academic-blueprints/${id}`, body)
}

export function submitAcademicBlueprintForReview(id: number) {
  return httpPost<AcademicBlueprintDto>(`/academic-blueprints/${id}/submit-review`, {})
}

export function recordBlueprintApproval(id: number, body: { departmentId: number; decision: 'APPROVED' | 'REJECTED'; notes?: string }) {
  return httpPost<AcademicBlueprintDto>(`/academic-blueprints/${id}/approvals`, body)
}

export function publishAcademicBlueprint(id: number) {
  return httpPost<AcademicBlueprintDto>(`/academic-blueprints/${id}/publish`, {})
}

export function cloneAcademicBlueprint(id: number) {
  return httpPost<AcademicBlueprintDto>(`/academic-blueprints/${id}/clone`, {})
}

export interface SemesterTrackMajorPresetDto {
  majorId: number
  majorCode: string
  majorName: string
  departmentId: number
  minMembers: number
  maxMembers: number
  responsibility: string
}

export interface SemesterTrackPresetDto {
  trackCode: AcademicTrackCode
  projectMode: 'SINGLE_MAJOR' | 'INTERDISCIPLINARY'
  minTeamSize: number
  maxTeamSize: number
  minDistinctMajors: number
  leadDepartmentId?: number | null
  participatingDepartmentId?: number | null
  defaultMajorRequirements: SemesterTrackMajorPresetDto[]
  hasPublishedBlueprint: boolean
}

export function getSemesterBlueprintReadiness(semesterId: number) {
  return httpGet<SemesterReadinessDto>(`/semesters/${semesterId}/blueprint-readiness`)
}

export function getSemesterTrackPresets(semesterId: number) {
  return httpGet<SemesterTrackPresetDto[]>(`/academic/semesters/${semesterId}/track-presets`)
}

export function dryRunBlueprintPlan(projectId: number, blueprintId?: number) {
  const qs = blueprintId ? `?blueprintId=${blueprintId}` : ''
  return httpPost<BlueprintDryRunDiffDto>(`/projects/${projectId}/blueprint-plan/dry-run${qs}`, {})
}

export function applyBlueprintPlan(projectId: number, blueprintId?: number) {
  const qs = blueprintId ? `?blueprintId=${blueprintId}` : ''
  return httpPost(`/projects/${projectId}/blueprint-plan/apply${qs}`, {})
}

export function listGateDeadlineChangeRequests(projectId: number, gateCode?: string) {
  const path = gateCode
    ? `/projects/${projectId}/review-gates/${encodeURIComponent(gateCode)}/deadline-change-requests`
    : `/projects/${projectId}/deadline-change-requests`
  return httpGet<GateDeadlineChangeRequestDto[]>(path)
}

export function createGateDeadlineChangeRequest(
  projectId: number,
  gateCode: string,
  body: { requestedSubmissionDueAt: string; requestedReviewEndAt: string; requestedRevisionDueAt: string; reason: string },
) {
  return httpPost<GateDeadlineChangeRequestDto>(
    `/projects/${projectId}/review-gates/${encodeURIComponent(gateCode)}/deadline-change-requests`,
    body,
  )
}

export function reviewGateDeadlineChangeRequest(
  projectId: number,
  requestId: number,
  body: { decision: 'APPROVED' | 'REJECTED'; reviewNotes?: string; concurrencyToken: string },
) {
  return httpPost<GateDeadlineChangeRequestDto>(
    `/projects/${projectId}/deadline-change-requests/${requestId}/review`,
    body,
  )
}
