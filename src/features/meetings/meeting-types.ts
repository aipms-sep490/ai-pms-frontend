export type MeetingStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
export type AttendanceStatus = 'INVITED' | 'ACCEPTED' | 'DECLINED' | 'ATTENDED' | 'ABSENT'
/** BE-06/N06 · a participant's own RSVP, independent of post-hoc attendanceStatus. */
export type RsvpStatus = 'INVITED' | 'ACCEPTED' | 'TENTATIVE' | 'DECLINED'
export type MeetingRecurrence = 'NONE' | 'WEEKLY' | 'BIWEEKLY'

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
  concurrencyToken?: string
  /**
   * Optional until the frozen Video Meeting API is deployed. Legacy API reads omit these
   * fields, and callers must not infer either value from location or onlineUrl.
   */
  meetingDeliveryMode?: import('./video/meeting-video.types').MeetingDeliveryMode
  videoChannel?: import('./video/meeting-video.types').MeetingVideoChannel
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
  /** Defaults to INVITED server-side; only meaningful once VITE_ENABLE_MEETING_COLLABORATION is on. */
  rsvpStatus?: RsvpStatus | string
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
  /** Transitional optional fields: absent values preserve legacy Meeting API compatibility. */
  meetingDeliveryMode?: import('./video/meeting-video.types').MeetingDeliveryMode
  videoChannel?: import('./video/meeting-video.types').MeetingVideoChannel
}
export interface CreateMeeting extends MeetingSchedule {
  participantUserIds: number[]
  /** Series-only fields, read by CreateMeetingPage to pick create-one vs create-series; never sent as-is to BE. */
  recurrence?: MeetingRecurrence
  occurrenceCount?: number
}
export interface MeetingNotes {
  meetingNotes: string | null
  attendances: { userId: number; attendanceStatus: AttendanceStatus }[]
}
export interface MeetingCandidate { userId: number; fullName: string; role: string }
export interface MeetingDecision { id: number; meetingId: number; content: string; decidedBy: number; decidedAt: string }
export type MeetingActionStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'
export interface MeetingActionItem {
  id: number; meetingId: number; title: string; description: string | null; assigneeUserId: number | null
  dueAt: string | null; status: MeetingActionStatus | string; concurrencyToken: string; createdBy: number; createdAt: string; updatedAt: string
}
export interface SaveMeetingActionItem {
  title: string; description: string | null; assigneeUserId: number | null; dueAt: string | null
  status: MeetingActionStatus; concurrencyToken: string
}

// BE-06/N06/N07 · meeting series, RSVP, notes-lock and notes history (MeetingCollaborationController).
export interface CreateMeetingSeries { meeting: CreateMeeting; recurrence: MeetingRecurrence; occurrenceCount: number }
export interface MeetingSeries { seriesId: string; recurrence: string; occurrences: Meeting[] }
export interface MeetingRsvp { meetingId: number; userId: number; status: string; concurrencyToken: string }
export interface MeetingEmailDelivery { userId: number; notificationType: string; status: string; attemptCount: number; sentAt: string | null }
export interface MeetingCollaboration {
  meetingId: number
  concurrencyToken: string
  seriesId: string | null
  occurrenceNumber: number | null
  recurrence: string
  notesVersion: number
  notesLockedAt: string | null
  notesLockedBy: number | null
  canLockNotes: boolean
  myRsvp: MeetingRsvp | null
  emailDeliveries: MeetingEmailDelivery[]
  hasMoreEmailDeliveries: boolean
}
export interface MeetingNotesVersion {
  id: number
  meetingId: number
  version: number
  isLocked: boolean
  meetingNotes: string | null
  minutes: string | null
  decisions: string | null
  blockers: string | null
  changedBy: number
  changedAt: string
}

export const recurrenceLabels: Record<MeetingRecurrence, string> = { NONE: 'Không lặp lại', WEEKLY: 'Hàng tuần', BIWEEKLY: '2 tuần 1 lần' }
export const rsvpStatusLabels: Record<string, string> = { INVITED: 'Chưa phản hồi', ACCEPTED: 'Tham dự', TENTATIVE: 'Có thể tham dự', DECLINED: 'Từ chối' }

export const meetingStatuses: Record<MeetingStatus, string> = {
  SCHEDULED: 'Đã lên lịch', COMPLETED: 'Đã hoàn tất', CANCELLED: 'Đã hủy',
}
export const attendanceStatuses: Record<AttendanceStatus, string> = {
  INVITED: 'Đã mời', ACCEPTED: 'Đã xác nhận', DECLINED: 'Từ chối', ATTENDED: 'Có mặt', ABSENT: 'Vắng mặt',
}
