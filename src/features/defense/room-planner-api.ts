import { httpGet, httpPost } from '../../services/http/http-client'

export interface RoomDto {
  id: number
  code: string
  building: string
  floor: number
  capacity: number
  status: string
  concurrencyToken: string
}

export interface RoomSchedulingExclusion {
  roomId: number
  date: string | null
  slotNumber: number | null
}

export interface DefenseAllocation {
  projectId: number
  committeeId: number
  roomId: number
  roomCode: string
  date: string
  slotNumber: number
  startAt: string
  endAt: string
}

export interface AutoSchedulePreview {
  scheduledCount: number
  unscheduledCount: number
  allocations: DefenseAllocation[]
  conflicts: { projectId: number; reason: string }[]
  concurrencyToken: string
}

export const getPlannerRooms = (signal?: AbortSignal) => httpGet<RoomDto[]>('/rooms', signal)

export const previewDefenseSchedule = (periodId: number, input: {
  startDate: string
  endDate: string
  roomIds: number[]
  maxSlotsPerDay: number
  exclusions: RoomSchedulingExclusion[]
}) => httpPost<AutoSchedulePreview>(`/project-periods/${periodId}/defense-sessions/auto-schedule/preview`, input)

export const applyDefenseSchedule = (periodId: number, input: {
  allocations: DefenseAllocation[]
  concurrencyToken: string
  exclusions: RoomSchedulingExclusion[]
}) => httpPost<{ success: boolean; createdSessionsCount: number }>(
  `/project-periods/${periodId}/defense-sessions/auto-schedule/apply`, input)
