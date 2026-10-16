import { reviewGatesMockAdapter } from './review-gates-mock-adapter'
import type {
  DefenseReadinessSummary,
  ProjectReviewMatrixRow,
  ReviewGateTemplate,
} from '../types/review-gates.types'

/**
 * Review Gates API Client.
 * When real Backend Review Gates endpoints are deployed in ASP.NET Core,
 * this client will seamlessly route to httpGet / httpPost / httpPut.
 * Until then, it routes to reviewGatesMockAdapter to ensure a 100% working,
 * stable vertical slice adhering strictly to PROMPT B requirements.
 */
export async function getReviewGateTemplates(): Promise<ReviewGateTemplate[]> {
  return reviewGatesMockAdapter.getTemplates()
}

export async function getReviewGateTemplate(id: string): Promise<ReviewGateTemplate | null> {
  return reviewGatesMockAdapter.getTemplateById(id)
}

export async function saveReviewGateTemplate(template: ReviewGateTemplate): Promise<ReviewGateTemplate> {
  return reviewGatesMockAdapter.saveTemplate(template)
}

export async function publishReviewGateTemplate(id: string): Promise<ReviewGateTemplate> {
  return reviewGatesMockAdapter.publishTemplate(id)
}

export async function getProjectReviewMatrix(filterMode?: string): Promise<ProjectReviewMatrixRow[]> {
  return reviewGatesMockAdapter.getMonitoringMatrix(filterMode)
}

export async function updateGateDecision(
  projectId: string,
  gateCode: string,
  newStatus: 'PASSED' | 'REVISION_REQUIRED' | 'IN_REVIEW',
): Promise<ProjectReviewMatrixRow> {
  return reviewGatesMockAdapter.updateProjectGateDecision(projectId, gateCode, newStatus)
}

export async function updateHybridScopeDecision(
  projectId: string,
  scope: string,
  newStatus: 'PASSED' | 'REVISION_REQUIRED' | 'IN_REVIEW',
): Promise<ProjectReviewMatrixRow> {
  return reviewGatesMockAdapter.updateHybridScopeDecision(projectId, scope, newStatus)
}

export async function getDefenseReadiness(projectId: string): Promise<DefenseReadinessSummary> {
  return reviewGatesMockAdapter.getDefenseReadiness(projectId)
}
