import { httpGet, httpPost } from '../../../services/http/http-client'
import type { ProjectDto, ProjectWorkflowActionsDto } from '../../../types/backend'

export interface ReviewQueuePage<T> { items: T[]; page: number; pageSize: number; totalCount: number; totalPages?: number }
export interface ReviewProjectSummary { id: number; teamId: number; teamName: string; code: string; title: string; status: string; createdAt: string; submittedAt: string | null; majors: { majorCode: string; majorName: string }[] }
export interface ReviewHistory { oldStatus: string | null; newStatus: string; changedByName: string; reason: string | null; changedAt: string }
export interface ReviewScope { projectMode: string; primaryMajorId: number | null; leadDepartmentId: number; requirements: { majorId: number; minMembers: number; maxMembers: number; responsibility: string }[] }
export interface DepartmentDecision { departmentId: number; decision: 'PENDING' | 'APPROVED' | 'REJECTED' | string; decidedBy: number | null; decidedAt: string | null; reason: string | null }
export interface ReviewDetail { concurrencyToken: string; academicScope: ReviewScope | null; latestSubmission: null | { id: number; projectPeriodId: number; submittedBy: number; submittedAt: string; evidence: { scope: ReviewScope; policy: { minMembers: number; maxMembers: number; minDistinctMajors: number; version: string }; organizationId: number; windowStartAt: string; windowEndAt: string; members: { userId: number; fullName: string; majorId: number; isLeader: boolean }[]; departmentIds: number[] }; decisions: DepartmentDecision[] } }

export interface QueueQuery { page: number; pageSize: number; search?: string }
const auth = (accessToken: string) => ({ accessToken })
export function getReviewQueue(query: QueueQuery, accessToken: string) { const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) }); if (query.search?.trim()) params.set('search', query.search.trim()); return httpGet<ReviewQueuePage<ReviewProjectSummary>>(`/v1/projects/review-queue?${params}`, auth(accessToken)) }
export const getReviewDetail = (id: number, accessToken: string) => httpGet<ReviewDetail>(`/v1/projects/${id}/academic-review`, auth(accessToken))
export const getProjectForReview = (id: number, accessToken: string) => httpGet<ProjectDto>(`/v1/projects/${id}`, auth(accessToken))
export const getReviewHistory = (id: number, accessToken: string) => httpGet<ReviewHistory[]>(`/v1/projects/${id}/history`, auth(accessToken))
export const getReviewActions = (id: number, accessToken: string) => httpGet<ProjectWorkflowActionsDto>(`/v1/projects/${id}/actions`, auth(accessToken))
export const startReview = (id: number, concurrencyToken: string, accessToken: string) => httpPost(`/v1/projects/${id}/start-review`, { concurrencyToken }, auth(accessToken))
export const decideProjectReview = (id: number, kind: 'revision' | 'approve' | 'reject', concurrencyToken: string, reason: string | undefined, accessToken: string) => httpPost(`/v1/projects/${id}/${kind}`, kind === 'approve' ? { concurrencyToken } : { concurrencyToken, reason }, auth(accessToken))
export const decideDepartment = (id: number, input: { snapshotId: number; concurrencyToken: string; decision: 'APPROVED' | 'REJECTED'; reason?: string }, accessToken: string) => httpPost<ReviewDetail>(`/v1/projects/${id}/department-decisions`, input, auth(accessToken))
