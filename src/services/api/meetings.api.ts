import { HttpError, httpDelete, httpGet, httpPost, httpPut } from '../http/http-client'
import type { PagedResult, SupervisorAssignmentDto, TeamDto } from '../../types/backend'
import type { CreateMeeting, CreateMeetingSeries, Meeting, MeetingActionItem, MeetingCandidate, MeetingCollaboration, MeetingDecision, MeetingDetail, MeetingFeedback, MeetingNotes, MeetingNotesVersion, MeetingParticipant, MeetingRsvp, MeetingSchedule, MeetingSeries, MeetingStatus, SaveMeetingActionItem } from '../../features/meetings/meeting-types'

export interface MeetingFilters { status?: MeetingStatus; from?: string; to?: string; page?: number; pageSize?: number }
export function getMeetings(projectId: number, filters: MeetingFilters = {}, signal?: AbortSignal) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries({ page: 1, pageSize: 10, ...filters })) {
    if (value !== undefined && value !== '') query.set(key, String(value))
  }
  return httpGet<PagedResult<Meeting>>(`/projects/${projectId}/meetings?${query}`, signal)
}
export const getMeeting = (id: number, signal?: AbortSignal) => httpGet<MeetingDetail>(`/meetings/${id}`, signal)
export const createMeeting = (projectId: number, body: CreateMeeting) => httpPost<Meeting>(`/projects/${projectId}/meetings`, body)
export const updateMeeting = (id: number, body: MeetingSchedule & { concurrencyToken?: string }) => httpPut<Meeting>(`/meetings/${id}`, body)
const meetingTokenQuery = (concurrencyToken?: string) => concurrencyToken ? `?${new URLSearchParams({ concurrencyToken })}` : ''
export const cancelMeeting = (id: number, concurrencyToken?: string) => httpPost<Meeting>(`/meetings/${id}/cancel${meetingTokenQuery(concurrencyToken)}`)
export const completeMeeting = (id: number, concurrencyToken?: string) => httpPost<Meeting>(`/meetings/${id}/complete${meetingTokenQuery(concurrencyToken)}`)
export const updateMeetingNotes = (id: number, body: MeetingNotes & { concurrencyToken?: string }) => httpPut<Meeting>(`/meetings/${id}/notes`, body)
export const addMeetingParticipant = (id: number, userId: number, concurrencyToken?: string) => httpPost<MeetingParticipant>(`/meetings/${id}/participants${meetingTokenQuery(concurrencyToken)}`, { userId, attendanceStatus: 'INVITED' })
export const removeMeetingParticipant = (id: number, userId: number, concurrencyToken?: string) => httpDelete(`/meetings/${id}/participants/${userId}${meetingTokenQuery(concurrencyToken)}`)
export const addMeetingFeedback = (id: number, feedbackText: string, concurrencyToken?: string) => httpPost<MeetingFeedback>(`/meetings/${id}/feedback${meetingTokenQuery(concurrencyToken)}`, { feedbackText })
export const getMeetingDecisions = (id: number, signal?: AbortSignal) => httpGet<PagedResult<MeetingDecision>>(`/meetings/${id}/decisions?page=1&pageSize=100`, signal)
export const getMeetingActionItems = (id: number, signal?: AbortSignal) => httpGet<PagedResult<MeetingActionItem>>(`/meetings/${id}/action-items?page=1&pageSize=100`, signal)
export const createMeetingDecision = (id: number, content: string, concurrencyToken: string) => httpPost<MeetingDecision>(`/meetings/${id}/decisions`, { content, concurrencyToken })
export const createMeetingActionItem = (id: number, body: SaveMeetingActionItem) => httpPost<MeetingActionItem>(`/meetings/${id}/action-items`, body)
export const updateMeetingActionItem = (meetingId: number, actionId: number, body: SaveMeetingActionItem) => httpPut<MeetingActionItem>(`/meetings/${meetingId}/action-items/${actionId}`, body)

// BE-06/N06/N07 · verified against AIPMS.Api MeetingCollaborationController + MeetingCollaborationDtos.
export const createMeetingSeries = (projectId: number, body: CreateMeetingSeries) => httpPost<MeetingSeries>(`/projects/${projectId}/meeting-series`, body)
export const getMeetingCollaboration = (meetingId: number, signal?: AbortSignal) => httpGet<MeetingCollaboration>(`/meetings/${meetingId}/collaboration`, signal)
export const respondMeetingRsvp = (meetingId: number, status: string, concurrencyToken: string) => httpPut<MeetingRsvp>(`/meetings/${meetingId}/rsvp`, { status, concurrencyToken })
export const lockMeetingNotes = (meetingId: number, concurrencyToken: string) => httpPost<MeetingCollaboration>(`/meetings/${meetingId}/notes/lock`, { concurrencyToken })
export const getMeetingNotesHistory = (meetingId: number, page = 1, pageSize = 20, signal?: AbortSignal) =>
  httpGet<PagedResult<MeetingNotesVersion>>(`/meetings/${meetingId}/notes/history?${new URLSearchParams({ page: String(page), pageSize: String(pageSize) })}`, signal)

/** Only project roster and current assignments; never the global account directory. */
export async function getMeetingCandidates(projectId: number, teamId: number, signal?: AbortSignal): Promise<{ candidates: MeetingCandidate[]; notice?: string }> {
  let members: TeamDto['members'] = []
  let notice: string | undefined
  try {
    members = (await httpGet<TeamDto>(`/teams/${teamId}`, signal)).members
  } catch (reason) {
    if (!(reason instanceof HttpError) || reason.status !== 403) throw reason
    // Assigned lecturers can access meetings but the current Teams endpoint denies their roster access.
    // Keep scheduling available; never substitute an old registration snapshot or a global user directory.
    notice = 'Tài khoản này chưa được cấp quyền xem danh sách sinh viên của nhóm. Bạn vẫn có thể lưu lịch và mời GVHD; trưởng nhóm có thể thêm sinh viên sau.'
  }
  const candidates = new Map<number, MeetingCandidate>(members.map((member) => [member.userId, {
    userId: member.userId, fullName: member.fullName, role: member.isLeader ? 'Trưởng nhóm' : 'Thành viên',
  }]))
  let page = 1
  let totalPages = 1
  do {
    const assignments = await httpGet<PagedResult<SupervisorAssignmentDto>>(`/projects/${projectId}/supervisor-assignments?page=${page}&pageSize=100`, signal)
    for (const assignment of assignments.items) {
      if (!assignment.endedAt) candidates.set(assignment.supervisorUserId, {
        userId: assignment.supervisorUserId, fullName: assignment.supervisorName, role: 'Giảng viên hướng dẫn',
      })
    }
    totalPages = assignments.totalPages
    page += 1
  } while (page <= totalPages)
  return { candidates: [...candidates.values()], notice }
}
