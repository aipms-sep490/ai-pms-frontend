import { env } from '../../../app/config/env'
import { httpGet, httpGetBlob, httpPost, httpPostForm, httpPut } from '../../../services/http/http-client'
import type { PagedResult } from '../../../types/backend/common.backend.types'
import { requireGateToken, toTemplateRequest } from './review-gates-contract'
import { reviewGatesMockAdapter } from './review-gates-mock-adapter'
import { safeEvidenceLink } from '../utils/evidence-link'
import type {
  AssignedReviewItem,
  DefenseReadinessSummary,
  GateDecisionRequest,
  ProjectReviewMatrixRow,
  ReviewGateTemplate,
  StudentReviewTimelineDto,
  SubmitGatePackageRequest,
  SubmitRevisionRequest,
  SupervisorFeedbackRequest,
  VerifyEvidenceRequest,
} from '../types/review-gates.types'

/** Real routes/DTOs checked against BE acc6f04 and subsequent origin/develop. */
export async function getReviewGateTemplates(): Promise<ReviewGateTemplate[]> {
  if (env.reviewGatesMockEnabled) return reviewGatesMockAdapter.getTemplates()
  return httpGet<ReviewGateTemplate[]>('/academic/gate-templates')
}

export async function getReviewGateTemplate(id: string): Promise<ReviewGateTemplate | null> {
  if (env.reviewGatesMockEnabled) return reviewGatesMockAdapter.getTemplateById(id)
  return httpGet<ReviewGateTemplate>(`/academic/gate-templates/${id}`)
}

export async function saveReviewGateTemplate(template: ReviewGateTemplate): Promise<ReviewGateTemplate> {
  if (env.reviewGatesMockEnabled) return reviewGatesMockAdapter.saveTemplate(template)
  if (template.id && !template.id.startsWith('tmpl-temp') && !template.id.startsWith('tmpl-draft')) {
    return httpPut<ReviewGateTemplate>(`/academic/gate-templates/${template.id}`, toTemplateRequest(template))
  }
  return httpPost<ReviewGateTemplate>('/academic/gate-templates', toTemplateRequest(template))
}

export async function publishReviewGateTemplate(id: string, concurrencyToken?: string): Promise<ReviewGateTemplate> {
  if (env.reviewGatesMockEnabled) return reviewGatesMockAdapter.publishTemplate(id, concurrencyToken)
  return httpPost<ReviewGateTemplate>(`/academic/gate-templates/${id}/publish`, { concurrencyToken: requireGateToken(concurrencyToken) })
}

export async function getProjectReviewMatrix(filterMode?: string): Promise<ProjectReviewMatrixRow[]> {
  if (env.reviewGatesMockEnabled) return reviewGatesMockAdapter.getMonitoringMatrix(filterMode)
  const query = filterMode && filterMode !== 'ALL' ? `?mode=${filterMode}` : ''
  return httpGet<ProjectReviewMatrixRow[]>(`/departments/review-gates/matrix${query}`)
}

export async function updateGateDecision(
  projectId: string,
  gateCode: string,
  newStatus: 'PASSED' | 'REVISION_REQUIRED' | 'IN_REVIEW',
): Promise<ProjectReviewMatrixRow> {
  if (env.reviewGatesMockEnabled) return reviewGatesMockAdapter.updateProjectGateDecision(projectId, gateCode, newStatus)
  return httpPost<ProjectReviewMatrixRow>(`/projects/${projectId}/review-gates/${gateCode}/decision`, { newStatus })
}

export async function updateHybridScopeDecision(
  projectId: string,
  scope: string,
  newStatus: 'PASSED' | 'REVISION_REQUIRED' | 'IN_REVIEW',
): Promise<ProjectReviewMatrixRow> {
  if (env.reviewGatesMockEnabled) return reviewGatesMockAdapter.updateHybridScopeDecision(projectId, scope, newStatus)
  return httpPost<ProjectReviewMatrixRow>(`/projects/${projectId}/review-gates/scopes/${scope}`, { newStatus })
}

export async function getDefenseReadiness(projectId: string): Promise<DefenseReadinessSummary> {
  if (env.reviewGatesMockEnabled) return reviewGatesMockAdapter.getDefenseReadiness(projectId)
  return httpGet<DefenseReadinessSummary>(`/projects/${projectId}/defense-readiness`)
}

export async function getStudentReviewTimeline(projectId?: string, signal?: AbortSignal): Promise<StudentReviewTimelineDto> {
  if (env.reviewGatesMockEnabled) return reviewGatesMockAdapter.getStudentReviewTimeline(projectId)
  const path = projectId ? `/projects/${projectId}/review-gates/timeline` : '/students/me/review-gates/timeline'
  return httpGet<StudentReviewTimelineDto>(path, { signal })
}

export async function submitRevision(
  req: SubmitRevisionRequest,
  isLeader: boolean,
): Promise<StudentReviewTimelineDto> {
  if (env.reviewGatesMockEnabled) return reviewGatesMockAdapter.submitRevision(req, isLeader)

  if (!isLeader) throw new Error('Bạn không có quyền nộp minh chứng.')
  if (req.mode === 'link') {
    const linkUrl = req.linkUrl?.trim()
    if (!safeEvidenceLink(linkUrl)) throw new Error('Vui lòng nhập liên kết HTTPS tuyệt đối, có tên miền hợp lệ và không chứa thông tin đăng nhập.')
    return httpPost<StudentReviewTimelineDto>(`/projects/${req.projectId}/review-gates/${encodeURIComponent(req.gateCode)}/evidence`, {
      requirementId: req.requirementId, artifactName: linkUrl, notes: req.notes,
      expectedVersion: req.expectedVersion, concurrencyToken: requireGateToken(req.concurrencyToken), linkUrl,
    })
  }
  if (!req.file) throw new Error('Vui lòng chọn tệp minh chứng thực tế.')
  if (req.file.size > 20 * 1024 * 1024) throw new Error('Tệp vượt quá giới hạn 20 MiB.')
  const body = new FormData()
  body.append('file', req.file)
  body.append('requirementId', req.requirementId)
  body.append('notes', req.notes)
  body.append('expectedVersion', String(req.expectedVersion))
  body.append('concurrencyToken', requireGateToken(req.concurrencyToken))
  return httpPostForm<StudentReviewTimelineDto>(`/projects/${req.projectId}/review-gates/${encodeURIComponent(req.gateCode)}/evidence/file`, body)
}

export async function getAssignedReviewPage(page = 1, pageSize = 20): Promise<PagedResult<AssignedReviewItem>> {
  if (env.reviewGatesMockEnabled) {
    const items = await reviewGatesMockAdapter.getAssignedReviews()
    return { items: items.slice((page - 1) * pageSize, page * pageSize), page, pageSize, totalCount: items.length, totalPages: Math.ceil(items.length / pageSize) }
  }
  return httpGet<PagedResult<AssignedReviewItem>>(`/reviewers/me/gate-assignments?page=${page}&pageSize=${pageSize}`)
}

/** Compatibility for callers that only need the first page; the page UI uses the envelope. */
export async function getAssignedReviews(): Promise<AssignedReviewItem[]> {
  return (await getAssignedReviewPage()).items
}

export async function downloadReviewGateEvidence(projectId: string, gateCode: string, requirementId: string, version: number): Promise<Blob> {
  if (env.reviewGatesMockEnabled) throw new Error('Bản mô phỏng không chứa tệp minh chứng thực tế.')
  return httpGetBlob(`/projects/${encodeURIComponent(projectId)}/review-gates/${encodeURIComponent(gateCode)}/requirements/${encodeURIComponent(requirementId)}/evidence/${version}/download`)
}

export async function verifyEvidence(req: VerifyEvidenceRequest): Promise<AssignedReviewItem> {
  if (env.reviewGatesMockEnabled) return reviewGatesMockAdapter.verifyEvidence(req)
  return httpPost<AssignedReviewItem>(`/review-gates/assignments/${req.assignmentId}/evidence/${req.requirementId}/verify`, req)
}

export async function submitGateDecision(req: GateDecisionRequest): Promise<AssignedReviewItem> {
  if (env.reviewGatesMockEnabled) return reviewGatesMockAdapter.submitGateDecision(req)
  return httpPost<AssignedReviewItem>(`/review-gates/assignments/${req.assignmentId}/decision`, req)
}

export async function submitGateForReview(
  req: SubmitGatePackageRequest,
): Promise<StudentReviewTimelineDto> {
  if (env.reviewGatesMockEnabled) return reviewGatesMockAdapter.submitGateForReview(req)
  return httpPost<StudentReviewTimelineDto>(`/projects/${req.projectId}/review-gates/${encodeURIComponent(req.gateCode)}/submit-for-review`, {
    notes: req.notes, concurrencyToken: requireGateToken(req.concurrencyToken),
  })
}

export async function submitSupervisorFeedback(
  req: SupervisorFeedbackRequest,
): Promise<void> {
  if (env.reviewGatesMockEnabled) return reviewGatesMockAdapter.submitSupervisorFeedback(req)
  await httpPost(`/projects/${req.projectId}/review-gates/${encodeURIComponent(req.gateCode)}/feedback`, { feedback: req.feedback })
}
