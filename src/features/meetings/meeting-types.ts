export type MeetingStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
export type AttendanceStatus = 'INVITED' | 'ACCEPTED' | 'DECLINED' | 'ATTENDED' | 'ABSENT'

export interface Meeting {
  id: number
  projectId: number
  title: string
  agenda: string | null
  meetingNotes: string | null
  startAt: string
  endAt: string | null
  location: string | null
  onlineUrl: string | null
  status: MeetingStatus
  createdBy: number
  createdByName: string
  participantCount: number
  createdAt: string
  updatedAt: string
}
export interface MeetingParticipant {
  id: number
  meetingId: number
  userId: number
  fullName: string
  email: string
  attendanceStatus: AttendanceStatus | null
  createdAt: string
  updatedAt: string
}
export interface MeetingFeedback {
  id: number
  projectId: number
  supervisorAssignmentId: number
  supervisorUserId: number
  supervisorName: string
  meetingId: number | null
  feedbackText: string
  createdAt: string
  updatedAt: string
}
// The detail DTO has participants, not participantCount.
export interface MeetingDetail extends Omit<Meeting, 'participantCount'> {
  participants: MeetingParticipant[]
  feedbacks: MeetingFeedback[]
}
export interface MeetingSchedule {
  title: string
  agenda: string | null
  startAt: string
  endAt: string | null
  location: string | null
  onlineUrl: string | null
}
export interface CreateMeeting extends MeetingSchedule { participantUserIds: number[] }
export interface MeetingNotes {
  meetingNotes: string | null
  attendances: { userId: number; attendanceStatus: AttendanceStatus }[]
}
export interface MeetingCandidate { userId: number; fullName: string; role: string }

export const meetingStatuses: Record<MeetingStatus, string> = {
  SCHEDULED: 'Đã lên lịch', COMPLETED: 'Đã hoàn tất', CANCELLED: 'Đã hủy',
}
export const attendanceStatuses: Record<AttendanceStatus, string> = {
  INVITED: 'Đã mời', ACCEPTED: 'Đã xác nhận', DECLINED: 'Từ chối', ATTENDED: 'Có mặt', ABSENT: 'Vắng mặt',
}
