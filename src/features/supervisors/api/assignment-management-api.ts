import { httpGet, httpPost } from '../../../services/http/http-client'
import type { SupervisorAssignmentDto } from '../../../types/backend'
export const getSupervisorAssignment = (id: number) => httpGet<SupervisorAssignmentDto>(`/supervisor-assignments/${id}`)
export const replaceSupervisorAssignment = (id: number, supervisorProfileId: number, reason: string) => httpPost<SupervisorAssignmentDto>(`/supervisor-assignments/${id}/replace`, { supervisorProfileId, reason })
export const endSupervisorAssignment = (id: number, reason: string) => httpPost<SupervisorAssignmentDto>(`/supervisor-assignments/${id}/end`, { reason })

export interface ReplacementCandidate {
  candidate: import('../../../types/backend').SupervisorCandidateDto
  assignmentType: string; majorId: number | null; responsibleDepartmentId: number | null
  eligible: boolean; reasons: string[]; expertiseMatch: 'MATCHED' | 'NOT_REQUIRED' | 'UNKNOWN' | string
}
export const getReplacementCandidates = (id: number, page = 1, search = '') => httpGet<import('../../../types/backend').PagedResult<ReplacementCandidate>>(`/supervisor-assignments/${id}/replacement-candidates?${new URLSearchParams({ page: String(page), pageSize: '20', search })}`)

export interface ReplacementProfile { id: number; fullName: string; departmentId: number; departmentName: string; isAvailable: boolean }
/** Discovery only. Replacement eligibility/capacity is checked by the write service. */
export const getReplacementDirectory = (page = 1) => httpGet<import('../../../types/backend').PagedResult<ReplacementProfile>>(`/supervisors?isAvailable=true&page=${page}&pageSize=100`)
