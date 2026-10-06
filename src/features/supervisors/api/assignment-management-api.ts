import { httpGet, httpPost } from '../../../services/http/http-client'
import type { SupervisorAssignmentDto } from '../../../types/backend'
export const getSupervisorAssignment = (id: number) => httpGet<SupervisorAssignmentDto>(`/supervisor-assignments/${id}`)
export const replaceSupervisorAssignment = (id: number, supervisorProfileId: number, reason: string) => httpPost<SupervisorAssignmentDto>(`/supervisor-assignments/${id}/replace`, { supervisorProfileId, reason })
export const endSupervisorAssignment = (id: number, reason: string) => httpPost<SupervisorAssignmentDto>(`/supervisor-assignments/${id}/end`, { reason })
