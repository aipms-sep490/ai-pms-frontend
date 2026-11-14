import { httpDelete, httpGet, httpPost, httpPut } from '../../services/http/http-client'
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

// Room catalog (BE-16-02)
export interface RoomDto {
  id: number
  code: string
  building: string
  floor: number
  capacity: number
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE' | string
  concurrencyToken: string
}

export interface SaveRoomRequest {
  code: string
  building: string
  floor: number
  capacity: number
  status?: string
  concurrencyToken?: string
}

export const getRooms = (params?: { building?: string; status?: string; minCapacity?: number }, signal?: AbortSignal) => {
  const qs = new URLSearchParams()
  if (params?.building) qs.set('building', params.building)
  if (params?.status) qs.set('status', params.status)
  if (params?.minCapacity) qs.set('minCapacity', String(params.minCapacity))
  const query = qs.toString() ? `?${qs.toString()}` : ''
  return httpGet<RoomDto[]>(`/rooms${query}`, signal)
}

export const createRoom = (body: SaveRoomRequest) => httpPost<RoomDto>('/rooms', body)
export const updateRoom = (id: number, body: SaveRoomRequest) => httpPut<RoomDto>(`/rooms/${id}`, body)
export const deactivateRoom = (id: number, concurrencyToken: string) =>
  httpDelete<RoomDto>(`/rooms/${id}?concurrencyToken=${encodeURIComponent(concurrencyToken)}`)

// Period defense sessions for Timetable Grid (BE-16-02)
export interface PeriodDefenseSessionDto {
  id: number
  projectId: number
  projectCode: string
  projectTitle: string
  committeeId: number
  committeeName: string
  roomId: number | null
  roomCode: string | null
  slotNumber: number | null
  startAt: string
  endAt: string
  status: string
  concurrencyToken: string
  canCancel: boolean
  evaluatorRole?: string
  processStage?: string
  rubricStandard?: string
}

export const getPeriodDefenseSessions = (periodId: number, date?: string, signal?: AbortSignal) => {
  const query = date ? `?date=${encodeURIComponent(date)}` : ''
  return httpGet<PeriodDefenseSessionDto[]>(`/project-periods/${periodId}/defense-sessions${query}`, signal)
}

export const getAvailableRooms = (periodId: number, date: string, startAt: string, endAt: string, signal?: AbortSignal) => {
  const query = `?date=${encodeURIComponent(date)}&startAt=${encodeURIComponent(startAt)}&endAt=${encodeURIComponent(endAt)}`
  return httpGet<RoomDto[]>(`/project-periods/${periodId}/rooms/availability${query}`, signal)
}

export interface RoomSchedulingExclusion {
  roomId: number
  date: string | null
  slotNumber: number | null
}

// Auto Schedule (BE-16-08)
export interface AutoSchedulePreviewRequest {
  startDate: string
  endDate: string
  roomIds: number[]
  maxSlotsPerDay?: number
  exclusions?: RoomSchedulingExclusion[]
}

export interface AutoScheduleAllocation {
  projectId: number
  committeeId: number
  roomId: number
  roomCode: string
  date: string
  slotNumber: number
  startAt: string
  endAt: string
}

export interface AutoScheduleConflictNotice {
  projectId: number
  projectCode?: string
  reason: string
}

export interface AutoSchedulePreviewDto {
  scheduledCount: number
  unscheduledCount: number
  allocations: AutoScheduleAllocation[]
  conflicts: AutoScheduleConflictNotice[]
  concurrencyToken: string
}

export interface AutoScheduleApplyRequest {
  allocations: AutoScheduleAllocation[]
  concurrencyToken: string
  exclusions?: RoomSchedulingExclusion[]
}

export interface AutoScheduleApplyDto {
  success: boolean
  createdSessionsCount: number
}

export const previewAutoSchedule = (periodId: number, body: AutoSchedulePreviewRequest) =>
  httpPost<AutoSchedulePreviewDto>(`/project-periods/${periodId}/defense-sessions/auto-schedule/preview`, body)

export const applyAutoSchedule = (periodId: number, body: AutoScheduleApplyRequest) =>
  httpPost<AutoScheduleApplyDto>(`/project-periods/${periodId}/defense-sessions/auto-schedule/apply`, body)

// Defense Change Requests (BE-16-09)
export interface CreateDefenseChangeRequest {
  desiredRoomId: number
  desiredStartAt: string
  desiredEndAt: string
  reasonCategory: 'ROOM_FACILITY_ISSUE' | 'SCHEDULE_CLASH' | 'SPECIAL_REQUIREMENT' | 'OTHER' | string
  reasonDetails: string
  evidenceFileUrl?: string | null
}

export interface DefenseChangeRequestDto {
  id: number
  defenseSessionId: number
  requesterId: number
  currentRoomId: number
  currentStartAt: string
  currentEndAt: string
  desiredRoomId: number
  desiredStartAt: string
  desiredEndAt: string
  reasonCategory: string
  reasonDetails: string
  evidenceFileUrl: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN' | string
  reviewerId: number | null
  reviewNote?: string | null
  reviewedAt?: string | null
  concurrencyToken: string
  createdAt: string
}

export interface DecideDefenseChangeRequest {
  decision: 'APPROVED' | 'REJECTED'
  reviewNote?: string
  concurrencyToken: string
}

export const createDefenseChangeRequest = (sessionId: number, body: CreateDefenseChangeRequest) =>
  httpPost<DefenseChangeRequestDto>(`/defense-sessions/${sessionId}/change-requests`, body)

export const decideDefenseChangeRequest = (id: number, body: DecideDefenseChangeRequest) =>
  httpPost<DefenseChangeRequestDto>(`/defense-sessions/change-requests/${id}/decision`, body)

export const withdrawDefenseChangeRequest = (id: number, concurrencyToken: string) =>
  httpPost<DefenseChangeRequestDto>(`/defense-sessions/change-requests/${id}/withdraw`, { concurrencyToken })

export const getSessionDefenseChangeRequests = (sessionId: number, signal?: AbortSignal) =>
  httpGet<DefenseChangeRequestDto[]>(`/defense-sessions/${sessionId}/change-requests`, signal)

export const getSessionChangeRooms = (sessionId: number, signal?: AbortSignal) =>
  httpGet<RoomDto[]>(`/defense-sessions/${sessionId}/change-rooms`, signal)

export const getPeriodDefenseChangeRequests = (periodId: number, status?: string, signal?: AbortSignal) => {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return httpGet<DefenseChangeRequestDto[]>(`/project-periods/${periodId}/defense-sessions/change-requests${query}`, signal)
}
