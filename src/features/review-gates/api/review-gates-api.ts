import { httpDelete, httpGet, httpGetBlob, httpPost, httpPostForm, httpPut } from '../../../services/http/http-client'
import type { PagedResult } from '../../../types/backend/common.backend.types'
import { requireGateToken, toTemplateRequest } from './review-gates-contract'
import { safeEvidenceLink } from '../utils/evidence-link'
import type { GateSessionScript } from '../types/gate-session-script.types'
import type {
  AssignedReviewItem,
  CreateReviewGateAssignmentRequest,
  DefenseReadinessSummary,
  GateAssignmentSummary,
  GateDecisionRequest,
  GateReviewerCandidate,
  GateRoundConsensus,
  ProjectReviewMatrixRow,
  RecordRoundScopeDecisionRequest,
  ReopenReviewGateRequest,
  ReviewGateTemplate,
  RevokeReviewGateAssignmentRequest,
  StudentReviewTimelineDto,
  SubmitGatePackageRequest,
  SubmitRevisionRequest,
  SupervisorFeedbackRequest,
  VerifyEvidenceRequest,
} from '../types/review-gates.types'

/** Real routes/DTOs checked against BE ReviewGatesController. */
export async function getReviewGateTemplates(): Promise<ReviewGateTemplate[]> {
  return httpGet<ReviewGateTemplate[]>('/academic/gate-templates')
}

export async function getReviewGateTemplate(id: string): Promise<ReviewGateTemplate | null> {
  return httpGet<ReviewGateTemplate>(`/academic/gate-templates/${id}`)
}

export interface GateWorkbookPreview {
  draft: Record<string, unknown> | null
  issues: Array<{ cell: string; message: string }>
  changes: string[]
}
export const downloadGateWorkbook = (id: string) => httpGetBlob(`/academic/gate-templates/${id}/workbook`)
export const previewGateWorkbook = (id: string, file: File) => {
  const body = new FormData(); body.append('file', file)
  return httpPostForm<GateWorkbookPreview>(`/academic/gate-templates/${id}/workbook/preview`, body)
}
export const commitGateWorkbook = (id: string, draft: Record<string, unknown>) =>
  httpPut<ReviewGateTemplate>(`/academic/gate-templates/${id}`, draft)

export async function saveReviewGateTemplate(template: ReviewGateTemplate): Promise<ReviewGateTemplate> {
  if (template.id && !template.id.startsWith('tmpl-temp') && !template.id.startsWith('tmpl-draft')) {
    return httpPut<ReviewGateTemplate>(`/academic/gate-templates/${template.id}`, toTemplateRequest(template))
  }
  return httpPost<ReviewGateTemplate>('/academic/gate-templates', toTemplateRequest(template))
}

export async function publishReviewGateTemplate(id: string, concurrencyToken?: string): Promise<ReviewGateTemplate> {
  return httpPost<ReviewGateTemplate>(`/academic/gate-templates/${id}/publish`, { concurrencyToken: requireGateToken(concurrencyToken) })
}

export async function deleteReviewGateTemplate(id: string): Promise<void> {
  await httpDelete(`/academic/gate-templates/${encodeURIComponent(id)}`)
}

export async function getProjectReviewMatrix(filterMode?: string): Promise<ProjectReviewMatrixRow[]> {
  const query = filterMode && filterMode !== 'ALL' ? `?mode=${filterMode}` : ''
  return httpGet<ProjectReviewMatrixRow[]>(`/departments/review-gates/matrix${query}`)
}

export async function updateGateDecision(
  projectId: string,
  gateCode: string,
  newStatus: 'PASSED' | 'REVISION_REQUIRED' | 'IN_REVIEW',
): Promise<ProjectReviewMatrixRow> {
  return httpPost<ProjectReviewMatrixRow>(`/projects/${projectId}/review-gates/${gateCode}/decision`, { newStatus })
}

export async function updateHybridScopeDecision(
  projectId: string,
  scope: string,
  newStatus: 'PASSED' | 'REVISION_REQUIRED' | 'IN_REVIEW',
  concurrencyToken?: string | null,
): Promise<ProjectReviewMatrixRow> {
  return httpPost<ProjectReviewMatrixRow>(`/projects/${projectId}/review-gates/scopes/${encodeURIComponent(scope)}`, { newStatus, ...(concurrencyToken ? { concurrencyToken } : {}) })
}

export async function getDefenseReadiness(projectId: string): Promise<DefenseReadinessSummary> {
  return httpGet<DefenseReadinessSummary>(`/projects/${projectId}/defense-readiness`)
}

export async function getStudentReviewTimeline(projectId?: string, signal?: AbortSignal): Promise<StudentReviewTimelineDto> {
  const path = projectId ? `/projects/${projectId}/review-gates/timeline` : '/students/me/review-gates/timeline'
  return httpGet<StudentReviewTimelineDto>(path, signal)
}

export async function submitRevision(
  req: SubmitRevisionRequest,
  canUpload: boolean,
): Promise<StudentReviewTimelineDto> {
  if (!canUpload) throw new Error('Bạn không có quyền nộp minh chứng cho yêu cầu này.')
  if (req.mode === 'link') {
    const linkUrl = req.linkUrl?.trim()
    if (!safeEvidenceLink(linkUrl)) throw new Error('Vui lòng nhập liên kết HTTPS tuyệt đối, có tên miền hợp lệ và không chứa thông tin đăng nhập.')
    return httpPost<StudentReviewTimelineDto>(`/projects/${req.projectId}/review-gates/${encodeURIComponent(req.gateCode)}/evidence`, {
      requirementId: req.requirementId, artifactName: linkUrl, notes: req.notes,
      expectedVersion: req.expectedVersion, concurrencyToken: requireGateToken(req.concurrencyToken), linkUrl,
    })
  }
  if (!req.file) throw new Error('Vui lòng chọn tệp minh chứng thực tế.')
  const body = new FormData()
  body.append('file', req.file)
  body.append('requirementId', req.requirementId)
  body.append('notes', req.notes)
  body.append('expectedVersion', String(req.expectedVersion))
  body.append('concurrencyToken', requireGateToken(req.concurrencyToken))
  return httpPostForm<StudentReviewTimelineDto>(`/projects/${req.projectId}/review-gates/${encodeURIComponent(req.gateCode)}/evidence/file`, body)
}

export async function getAssignedReviewPage(page = 1, pageSize = 10): Promise<PagedResult<AssignedReviewItem>> {
  return httpGet<PagedResult<AssignedReviewItem>>(`/reviewers/me/gate-assignments?page=${page}&pageSize=${pageSize}`)
}

/** Compatibility for callers that only need the first page; the page UI uses the envelope. */
export async function getAssignedReviews(): Promise<AssignedReviewItem[]> {
  return (await getAssignedReviewPage()).items
}

export async function downloadReviewGateEvidence(projectId: string, gateCode: string, requirementId: string, version: number): Promise<Blob> {
  return httpGetBlob(`/projects/${encodeURIComponent(projectId)}/review-gates/${encodeURIComponent(gateCode)}/requirements/${encodeURIComponent(requirementId)}/evidence/${version}/download`)
}

export async function verifyEvidence(req: VerifyEvidenceRequest): Promise<AssignedReviewItem> {
  return httpPost<AssignedReviewItem>(`/review-gates/assignments/${req.assignmentId}/evidence/${req.requirementId}/verify`, req)
}

export async function submitGateDecision(req: GateDecisionRequest): Promise<AssignedReviewItem> {
  return httpPost<AssignedReviewItem>(`/review-gates/assignments/${req.assignmentId}/decision`, req)
}

export async function submitGateForReview(
  req: SubmitGatePackageRequest,
): Promise<StudentReviewTimelineDto> {
  const token = requireGateToken(req.concurrencyToken)
  const idempotencyKey = req.idempotencyKey?.trim() || `gate-${req.projectId}-${req.gateCode}-${token}`
  return httpPost<StudentReviewTimelineDto>(`/projects/${req.projectId}/review-gates/${encodeURIComponent(req.gateCode)}/submit-for-review`, {
    notes: req.notes,
    concurrencyToken: token,
    idempotencyKey,
  })
}

export interface SignedPreviewToken {
  token: string
  expiresAtUtc: string
  streamUrl: string
  safePreviewUrl: string
  contentType: string
  fileName: string
  scanStatus: string
}

export async function issueEvidencePreviewToken(projectId: string, gateCode: string, requirementId: string, version: number): Promise<SignedPreviewToken> {
  return httpPost<SignedPreviewToken>(`/projects/${encodeURIComponent(projectId)}/review-gates/${encodeURIComponent(gateCode)}/requirements/${encodeURIComponent(requirementId)}/evidence/${version}/preview-token`, {})
}

export async function submitSupervisorFeedback(
  req: SupervisorFeedbackRequest,
): Promise<void> {
  await httpPost(`/projects/${req.projectId}/review-gates/${encodeURIComponent(req.gateCode)}/feedback`, { feedback: req.feedback })
}

// Gate Evidence Archive (BE-16-05)
export async function downloadReviewGateEvidenceArchive(projectId: string | number, gateCode: string): Promise<Blob> {
  return httpGetBlob(`/projects/${encodeURIComponent(projectId)}/review-gates/${encodeURIComponent(gateCode)}/evidence/archive`)
}

// Gate Override & Reopen (BE-16-03 / TK-W2-07 / TK-W2-08)
export interface OverrideReviewGateRequest {
  decision: 'PASSED' | 'REVISION_REQUIRED' | 'FAILED'
  reason: string
  concurrencyToken: string
}

export interface OverrideReviewGateDto {
  projectId: number
  gateCode: string
  status: string
  decisionSource: 'OVERRIDE' | string
  overriddenBy: string
  overriddenAt: string
  reason: string
  concurrencyToken: string
}

export async function overrideReviewGate(
  projectId: string | number,
  gateCode: string,
  body: OverrideReviewGateRequest,
): Promise<OverrideReviewGateDto> {
  return httpPost<OverrideReviewGateDto>(`/projects/${encodeURIComponent(projectId)}/review-gates/${encodeURIComponent(gateCode)}/override`, body)
}

export async function reopenReviewGate(
  projectId: string | number,
  gateCode: string,
  body: ReopenReviewGateRequest,
): Promise<StudentReviewTimelineDto> {
  return httpPost<StudentReviewTimelineDto>(`/projects/${encodeURIComponent(projectId)}/review-gates/${encodeURIComponent(gateCode)}/reopen`, body)
}

interface ReviewGateUserCapabilitiesResponse {
  projectId?: number
  canOverrideGate?: boolean
  actions?: Array<{ code: string; allowed: boolean; reasons?: string[] }>
}

export async function getReviewGateOverrideCapability(projectId: string | number): Promise<{ canOverrideGate: boolean }> {
  const res = await httpGet<ReviewGateUserCapabilitiesResponse>(`/users/me/capabilities?projectId=${encodeURIComponent(projectId)}`)
  if (typeof res?.canOverrideGate === 'boolean') return { canOverrideGate: res.canOverrideGate }
  const action = res?.actions?.find(a => a.code === 'CAN_OVERRIDE_GATE')
  return { canOverrideGate: Boolean(action?.allowed) }
}

// Gate Reviewer Assignments & D17-Filtered Candidates (TK-W2-07 / TK-W2-08)
export async function getGateAssignments(projectId: string | number, gateCode: string): Promise<GateAssignmentSummary[]> {
  return httpGet<GateAssignmentSummary[]>(`/projects/${encodeURIComponent(projectId)}/review-gates/${encodeURIComponent(gateCode)}/assignments`)
}

export async function getGateReviewerCandidates(
  projectId: string | number,
  gateCode: string,
  params?: { majorId?: number | null; search?: string; page?: number; pageSize?: number },
): Promise<PagedResult<GateReviewerCandidate>> {
  const query = new URLSearchParams()
  if (params?.majorId != null) query.set('majorId', String(params.majorId))
  if (params?.search?.trim()) query.set('search', params.search.trim())
  if (params?.page != null) query.set('page', String(params.page))
  if (params?.pageSize != null) query.set('pageSize', String(params.pageSize))
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return httpGet<PagedResult<GateReviewerCandidate>>(`/projects/${encodeURIComponent(projectId)}/review-gates/${encodeURIComponent(gateCode)}/reviewer-candidates${suffix}`)
}

export async function assignGateReviewer(body: CreateReviewGateAssignmentRequest): Promise<AssignedReviewItem> {
  return httpPost<AssignedReviewItem>('/review-gates/assignments', body)
}

export async function revokeGateReviewer(
  assignmentId: string | number,
  body: RevokeReviewGateAssignmentRequest,
): Promise<AssignedReviewItem> {
  return httpPost<AssignedReviewItem>(`/review-gates/assignments/${encodeURIComponent(assignmentId)}/revoke`, body)
}

export async function getGateRoundScopeConsensus(
  projectId: string | number,
  gateCode: string,
  roundNumber?: number,
): Promise<GateRoundConsensus> {
  const suffix = roundNumber != null ? `?roundNumber=${roundNumber}` : ''
  return httpGet<GateRoundConsensus>(`/projects/${encodeURIComponent(projectId)}/review-gates/${encodeURIComponent(gateCode)}/round-scope-decisions${suffix}`)
}

export async function recordGateRoundScopeDecision(
  projectId: string | number,
  gateCode: string,
  body: RecordRoundScopeDecisionRequest,
): Promise<GateRoundConsensus> {
  return httpPost<GateRoundConsensus>(`/projects/${encodeURIComponent(projectId)}/review-gates/${encodeURIComponent(gateCode)}/round-scope-decisions`, body)
}

// Gate Session Scripts (BE-16-07)
export async function getGateSessionScript(gateId: string | number): Promise<GateSessionScript> {
  return httpGet<GateSessionScript>(`/review-gates/${gateId}/session-script`)
}

export async function saveGateSessionScript(
  gateId: string | number,
  body: Partial<GateSessionScript> & { concurrencyToken?: string | null },
): Promise<GateSessionScript> {
  return httpPut<GateSessionScript>(`/review-gates/${gateId}/session-script`, body)
}

export async function syncGatePresence(
  gateId: string | number,
  body: { sessionId: string; participants: Array<{ userId: number | string; joinedAt?: string; leftAt?: string; durationMinutes?: number }>; concurrencyToken: string },
): Promise<GateSessionScript> {
  return httpPost<GateSessionScript>(`/review-gates/${gateId}/livekit-presence/sync`, body)
}

export {
  previewGate3Schedule,
  applyGate3Schedule,
  getGate3Schedules,
  changeGate3Schedule,
} from '../../defense/room-planner-api'
export type {
  ReviewGate3ScheduleDto,
} from '../../defense/room-planner-api'
