import { httpGet, httpPost, httpPut } from '../../../services/http/http-client'
import type { PagedResult } from '../../../types/backend'

export interface ReportingCycle { id: number; projectId: number; projectPeriodId: number; reportType: 'WEEKLY' | 'MONTHLY' | string; periodStart: string; periodEnd: string; deadline: string; latePolicy: 'BLOCK' | 'FLAG' | string; createdBy: number; createdAt: string; updatedAt: string; concurrencyToken: string }
export interface ProjectActionItem { id: number; projectId: number; sourceType: 'MEETING' | 'PROGRESS_REPORT' | string; meetingId: number | null; progressReportId: number | null; title: string; description: string | null; ownerId: number | null; ownerName: string | null; taskId: number | null; taskTitle: string | null; milestoneId: number | null; milestoneTitle: string | null; dueAt: string | null; status: 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE' | 'CANCELLED' | string; createdBy: number; createdAt: string; updatedAt: string; concurrencyToken: string }
export interface ProjectEvidence { id: number; projectId: number; sourceType: string; sourceId: number; majorId: number | null; classification: string; verificationStatus: string; submittedBy: number; submittedAt: string; notes: string | null }

const root = (projectId: number) => `/projects/${projectId}`
export interface ProjectGovernance { projectId: number; projectStatus: string; leadDepartment: { departmentId: number; name: string } | null; participatingDepartments: Array<{ departmentId: number; name: string }> | null; actorScope: { departmentId: number | null; isAdmin: boolean }; allowedActions: string[] | null; blockers: string[] | null }
export function canManageProjectGovernance(value: ProjectGovernance): boolean {
  return !!value.allowedActions?.includes('MANAGE_GOVERNANCE') && !value.actorScope.isAdmin && value.leadDepartment !== null && value.leadDepartment.departmentId === value.actorScope.departmentId && !['ARCHIVED', 'COMPLETED'].includes(value.projectStatus.toUpperCase())
}
export const getProjectGovernance = (projectId: number) => httpGet<ProjectGovernance>(`${root(projectId)}/governance`)
export const getReportingCycle = (projectId: number, id: number) => httpGet<ReportingCycle>(`${root(projectId)}/reporting-cycles/${id}`)
export const getProjectActionItem = (projectId: number, id: number) => httpGet<ProjectActionItem>(`${root(projectId)}/action-items/${id}`)
export const updateProjectActionItem = (projectId: number, id: number, body: Pick<ProjectActionItem, 'title' | 'description' | 'ownerId' | 'taskId' | 'milestoneId' | 'dueAt' | 'concurrencyToken'>) => httpPut<ProjectActionItem>(`${root(projectId)}/action-items/${id}`, body)
export const getReportingCycles = (projectId: number, signal?: AbortSignal) => httpGet<PagedResult<ReportingCycle>>(`${root(projectId)}/reporting-cycles?page=1&pageSize=100`, signal)
export const createReportingCycle = (projectId: number, body: { reportType: 'WEEKLY' | 'MONTHLY'; periodStart: string; periodEnd: string; deadline: string; latePolicy: 'BLOCK' | 'FLAG'; projectPeriodId?: number }) => httpPost<ReportingCycle>(`${root(projectId)}/reporting-cycles`, body)
export const updateReportingCycle = (projectId: number, id: number, body: Partial<Pick<ReportingCycle, 'periodStart' | 'periodEnd' | 'deadline' | 'latePolicy'>> & { concurrencyToken: string }) => httpPut<ReportingCycle>(`${root(projectId)}/reporting-cycles/${id}`, body)
export const getProjectActionItems = (projectId: number, signal?: AbortSignal) => httpGet<PagedResult<ProjectActionItem>>(`${root(projectId)}/action-items?page=1&pageSize=100`, signal)
export const createProjectActionItem = (projectId: number, body: { sourceType: 'MEETING' | 'PROGRESS_REPORT'; meetingId?: number; progressReportId?: number; title: string; description?: string | null; dueAt?: string | null }) => httpPost<ProjectActionItem>(`${root(projectId)}/action-items`, body)
export const updateProjectActionItemStatus = (projectId: number, id: number, status: ProjectActionItem['status'], concurrencyToken: string) => httpPost<ProjectActionItem>(`${root(projectId)}/action-items/${id}/status`, { status, concurrencyToken })
export interface ProjectEvidenceQuery {
  page?: number
  pageSize?: number
  sourceType?: string
  majorId?: number
  verificationStatus?: string
}

export const getProjectEvidence = (projectId: number, query: ProjectEvidenceQuery = {}, signal?: AbortSignal) => {
  const params = new URLSearchParams({ page: String(query.page ?? 1), pageSize: String(query.pageSize ?? 20) })
  if (query.sourceType) params.set('sourceType', query.sourceType)
  if (query.majorId) params.set('majorId', String(query.majorId))
  if (query.verificationStatus) params.set('verificationStatus', query.verificationStatus)
  return httpGet<PagedResult<ProjectEvidence>>(`${root(projectId)}/evidence?${params.toString()}`, signal)
}
export const createProjectEvidence = (projectId: number, body: { sourceType: string; sourceId: number; majorId: number | null; notes?: string | null }) => httpPost<ProjectEvidence>(`${root(projectId)}/evidence`, body)
