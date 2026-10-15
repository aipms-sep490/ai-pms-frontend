import { httpGet, httpPost } from '../../services/http/http-client'
import type { PagedResult } from '../../types/backend'
import type {
  CancelDefenseRequest,
  CreateCommitteeRequest,
  DefenseCommittee,
  DefenseSession,
  ScheduleDefenseRequest,
} from './defense-types'

export const getProjectDefenseSessions = (projectId: number, page = 1, pageSize = 20, signal?: AbortSignal) =>
  httpGet<PagedResult<DefenseSession>>(`/projects/${projectId}/defense-sessions?page=${page}&pageSize=${pageSize}`, signal)

export const getDefenseSession = (id: number, signal?: AbortSignal) =>
  httpGet<DefenseSession>(`/defense-sessions/${id}`, signal)

export const scheduleDefense = (projectId: number, body: ScheduleDefenseRequest) =>
  httpPost<DefenseSession>(`/projects/${projectId}/defense-sessions`, body)

export const cancelDefense = (id: number, body: CancelDefenseRequest) =>
  httpPost<DefenseSession>(`/defense-sessions/${id}/cancel`, body)

export const getDefenseCommittees = (projectId: number, page = 1, pageSize = 50, signal?: AbortSignal) =>
  httpGet<PagedResult<DefenseCommittee>>(`/projects/${projectId}/defense-committees?page=${page}&pageSize=${pageSize}`, signal)

export const createDefenseCommittee = (projectId: number, body: CreateCommitteeRequest) =>
  httpPost<DefenseCommittee>(`/projects/${projectId}/defense-committees`, body)
