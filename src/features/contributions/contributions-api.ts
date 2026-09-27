import { httpGet, httpPost } from '../../services/http/http-client'
import type { PagedResult } from '../../types/backend'

export interface ContributionMember {
  userId: number; displayName: string; assignedTasks: number; completedTasks: number
  submittedReports: number; attendedMeetings: number; submittedDeliverableVersions: number
  activityScore: number; evidenceCount: number; uploadedFiles: number
}
export interface ContributionSummary {
  dataStatus: string; activityVariance: number | null; members: ContributionMember[]
  page: number; pageSize: number; totalCount: number; ruleVersion: string
  snapshotHash: string | null; snapshotAt: string | null
}
export interface ContributionEvidence {
  sourceType: string; sourceId: number; label: string; occurredAt: string; credit: number
}

const root = (projectId: number) => `/v1/projects/${projectId}/contributions`
export const getContributions = (projectId: number, page: number, snapshot: boolean) =>
  httpGet<ContributionSummary>(`${root(projectId)}?page=${page}&pageSize=20&snapshot=${snapshot}`)
export const getContributionEvidence = (projectId: number, userId: number, page: number, sourceType?: string) => {
  const query = new URLSearchParams({ page: String(page), pageSize: '20' })
  if (sourceType) query.set('sourceType', sourceType)
  return httpGet<PagedResult<ContributionEvidence>>(`${root(projectId)}/${userId}/evidence?${query}`)
}
export const rebuildContributionSnapshot = (projectId: number) => httpPost<ContributionSummary>(`${root(projectId)}/snapshot`)
