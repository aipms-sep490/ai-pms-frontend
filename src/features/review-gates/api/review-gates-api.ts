import { env } from '../../../app/config/env'
import { httpGet, httpPost, httpPut } from '../../../services/http/http-client'
import { reviewGatesMockAdapter } from './review-gates-mock-adapter'
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

/**
 * Review Gates API Client.
 * When real Backend Review Gates endpoints are deployed in ASP.NET Core,
 * setting VITE_USE_MOCK_REVIEW_GATES=false will automatically route to
 * httpGet / httpPost / httpPut without modifying UI components.
 * When in mock mode (default), it routes to reviewGatesMockAdapter.
 */
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
    return httpPut<ReviewGateTemplate>(`/academic/gate-templates/${template.id}`, template)
  }
  return httpPost<ReviewGateTemplate>('/academic/gate-templates', template)
}

export async function publishReviewGateTemplate(id: string, concurrencyToken?: string): Promise<ReviewGateTemplate> {
  if (env.reviewGatesMockEnabled) return reviewGatesMockAdapter.publishTemplate(id, concurrencyToken)
  return httpPost<ReviewGateTemplate>(`/academic/gate-templates/${id}/publish`, { concurrencyToken })
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

export async function getStudentReviewTimeline(projectId?: string): Promise<StudentReviewTimelineDto> {
  if (env.reviewGatesMockEnabled) return reviewGatesMockAdapter.getStudentReviewTimeline(projectId)
  const path = projectId ? `/projects/${projectId}/review-gates/timeline` : '/students/me/review-gates/timeline'
  return httpGet<StudentReviewTimelineDto>(path)
}

export async function submitRevision(
  req: SubmitRevisionRequest,
  isLeader: boolean,
): Promise<StudentReviewTimelineDto> {
  if (env.reviewGatesMockEnabled) return reviewGatesMockAdapter.submitRevision(req, isLeader)
  return httpPost<StudentReviewTimelineDto>(`/projects/${req.projectId}/review-gates/${req.gateCode}/evidence`, req)
}

export async function getAssignedReviews(): Promise<AssignedReviewItem[]> {
  if (env.reviewGatesMockEnabled) return reviewGatesMockAdapter.getAssignedReviews()
  return httpGet<AssignedReviewItem[]>('/reviewers/me/gate-assignments')
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
  return httpPost<StudentReviewTimelineDto>(`/projects/${req.projectId}/review-gates/${req.gateCode}/submit-package`, req)
}

export async function submitSupervisorFeedback(
  req: SupervisorFeedbackRequest,
): Promise<void> {
  if (env.reviewGatesMockEnabled) return reviewGatesMockAdapter.submitSupervisorFeedback(req)
  return httpPost<void>(`/projects/${req.projectId}/review-gates/${req.gateCode}/supervisor-feedback`, req)
}
