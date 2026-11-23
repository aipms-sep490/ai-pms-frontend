import { httpDelete, httpGet, httpPost } from '../../../services/http/http-client'

export interface PinnedResource {
  id: number
  projectId: number
  resourceType: 'FIGMA' | 'DRIVE' | 'DOC' | 'REPO_LINK' | 'OTHER'
  title: string
  url: string
  createdBy: number
  createdAt: string
}

export interface AnchoredComment {
  id: number
  projectId: number
  gateInstanceId: number | null
  evidenceId: number | null
  anchorRef: string
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  status: 'OPEN' | 'RESOLVED'
  content: string
  createdBy: number
  resolvedBy: number | null
  createdAt: string
  resolvedAt: string | null
}

export interface MemberWeeklyActivity {
  userId: number
  fullName: string
  majorId: number | null
  weeklyCounts: number[]
  totalActions: number
  lastActivityAt: string | null
  daysSinceLastActivity: number | null
  isSilentMember: boolean
}

export interface InternalContributionHeatmap {
  projectId: number
  weeks: number
  generatedAtUtc: string
  members: MemberWeeklyActivity[]
  silentMemberIds: number[]
}

export interface ProjectHealthPulse {
  projectId: number
  status: 'GREEN' | 'YELLOW' | 'RED' | 'INSUFFICIENT_DATA'
  summary: string
  signals: {
    evidenceReadyPercent: number | null
    totalMandatoryGateRequirements: number
    blockedOver48hCount: number
    weeklyReportsLast14Days: number
    interdisciplinaryBalanceRatio: number | null
  }
  evaluatedAtUtc: string
}

export const listPinnedResources = (projectId: number) =>
  httpGet<PinnedResource[]>(`/projects/${projectId}/hub/pinned-resources`)
export const addPinnedResource = (projectId: number, body: { resourceType: string; title: string; url: string }) =>
  httpPost<PinnedResource>(`/projects/${projectId}/hub/pinned-resources`, body)
export const deletePinnedResource = (projectId: number, resourceId: number) =>
  httpDelete(`/projects/${projectId}/hub/pinned-resources/${resourceId}`)

export const listAnchoredComments = (projectId: number, gateCode: string) =>
  httpGet<AnchoredComment[]>(`/projects/${projectId}/hub/gates/${encodeURIComponent(gateCode)}/anchored-comments`)
export const resolveAnchoredComment = (projectId: number, gateCode: string, commentId: number) =>
  httpPost<AnchoredComment>(`/projects/${projectId}/hub/gates/${encodeURIComponent(gateCode)}/anchored-comments/${commentId}/resolve`, {})

export const getInternalHeatmap = (projectId: number, weeks = 4) =>
  httpGet<InternalContributionHeatmap>(`/projects/${projectId}/hub/contribution-heatmap?weeks=${weeks}`)
export const getProjectHealthPulse = (projectId: number) =>
  httpGet<ProjectHealthPulse>(`/projects/${projectId}/hub/health-pulse`)
