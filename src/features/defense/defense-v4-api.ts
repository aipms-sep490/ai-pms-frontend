import { httpGet, httpPatch, httpPost } from '../../services/http/http-client'

export interface PeriodDefenseRoomSchedulingConfig {
  periodId: number
  enableDefenseRoomScheduling: boolean
  coldWindowEndAt: string | null
  defenseBufferHours: number
}

export interface StandbyPoolMember {
  id: number
  projectPeriodId: number
  userId: number
  fullName: string
  majorId: number
  departmentId: number
  isAvailable: boolean
}

export interface StandbySwapResult {
  defenseSessionId: number
  committeeId: number
  replacedUserId: number
  replacementUserId: number
  revokedAssignmentsCount: number
  createdAssignmentsCount: number
}

export const getPeriodDefenseRoomScheduling = (periodId: number) =>
  httpGet<PeriodDefenseRoomSchedulingConfig>(`/academic/project-periods/${periodId}/defense-room-scheduling`)

export const updatePeriodDefenseRoomScheduling = (
  periodId: number,
  body: { enableDefenseRoomScheduling: boolean; coldWindowEndAt?: string | null; defenseBufferHours?: number },
) => httpPatch<PeriodDefenseRoomSchedulingConfig>(`/academic/project-periods/${periodId}/defense-room-scheduling`, body)

export const listStandbyPool = (periodId: number) =>
  httpGet<StandbyPoolMember[]>(`/defense-scheduling/v4/standby-pool?periodId=${periodId}`)

export const standbySwapEvaluator = (
  sessionId: number,
  body: { replacedUserId: number; replacementUserId: number; reason: string },
) => httpPost<StandbySwapResult>(`/defense-scheduling/v4/sessions/${sessionId}/standby-swap`, body)
