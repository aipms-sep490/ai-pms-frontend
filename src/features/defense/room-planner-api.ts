import { httpGet, httpPost, httpPut } from '../../services/http/http-client'

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
  committeeId?: number
  gateInstanceId?: number
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

export interface ReviewGate3ScheduleDto {
  projectId: number
  gateInstanceId: number
  roomId: number
  roomCode: string
  startAt: string
  endAt: string
  publishedAt: string
  publishedBy: number | null
  concurrencyToken: string
}

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
}

export const getPlannerRooms = (signal?: AbortSignal) => httpGet<RoomDto[]>('/rooms', signal)

// Gate 4 Defense Auto-Scheduling
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

export const getPeriodDefenseSessions = (periodId: number, date?: string, signal?: AbortSignal) => {
  const query = date ? `?date=${encodeURIComponent(date)}` : ''
  return httpGet<PeriodDefenseSessionDto[]>(`/project-periods/${periodId}/defense-sessions${query}`, signal)
}

// Gate 3 Review Auto-Scheduling
export const previewGate3Schedule = (periodId: number, input: {
  startDate: string
  endDate: string
  roomIds: number[]
  maxSlotsPerDay: number
  exclusions: RoomSchedulingExclusion[]
}) => httpPost<AutoSchedulePreview>(`/project-periods/${periodId}/review-gates/r3/schedule/preview`, input)

export const applyGate3Schedule = (periodId: number, input: {
  allocations: DefenseAllocation[]
  concurrencyToken: string
  exclusions: RoomSchedulingExclusion[]
}) => httpPost<ReviewGate3ScheduleDto[]>(`/project-periods/${periodId}/review-gates/r3/schedule/apply`, input)

export const getGate3Schedules = (periodId: number, signal?: AbortSignal) =>
  httpGet<ReviewGate3ScheduleDto[]>(`/project-periods/${periodId}/review-gates/r3/schedule`, signal)

export const changeGate3Schedule = (periodId: number, gateInstanceId: number, input: {
  roomId: number
  startAt: string
  endAt: string
  reason: string
  concurrencyToken: string
}) => httpPut<ReviewGate3ScheduleDto>(`/project-periods/${periodId}/review-gates/r3/schedule/${gateInstanceId}`, input)

export function formatScheduleConflictReason(reason: string): string {
  switch (reason) {
    case 'REVIEW_GATE_2_NOT_PASSED':
      return 'Chưa đạt Gate 2 (Đề cương & Kiến trúc sơ bộ)'
    case 'REVIEW_GATE_3_NOT_PASSED':
      return 'Chưa đạt Gate 3 (Thiết kế chi tiết & Đánh giá chuyên môn)'
    case 'REVIEW_GATE_3_WINDOW_REQUIRED':
      return 'Chưa cấu hình cửa sổ thời gian Gate 3'
    case 'DEFENSE_GATE_WINDOW_REQUIRED':
      return 'Chưa cấu hình cửa sổ thời gian Gate 4'
    case 'REVIEW_GATE_3_REVIEWERS_REQUIRED':
      return 'Chưa phân công đủ 2 người đánh giá (Chủ tọa & Thư ký)'
    case 'DEFENSE_COMMITTEE_REQUIRED':
      return 'Chưa gán hội đồng bảo vệ'
    case 'SUPERVISOR_CONFLICT_OF_INTEREST':
      return 'Xung đột lợi ích: Người hướng dẫn không được ngồi hội đồng nhóm mình'
    case 'NO_ROOM_OR_CONFLICT_FREE_SLOT':
      return 'Hết phòng hoặc không tìm được ca không trùng lịch giảng viên'
    case 'REVIEW_GATE_3_ROOM_UNAVAILABLE':
      return 'Phòng không khả dụng hoặc đã bị chiếm ca'
    case 'DEFENSE_ROOM_CAPACITY':
      return 'Phòng không đủ sức chứa (nhóm + hội đồng + 5 chỗ dự phòng)'
    default:
      return reason
  }
}
