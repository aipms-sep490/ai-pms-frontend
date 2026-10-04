import { httpGet, httpPost } from '../../../services/http/http-client'
import type {
  MeetingVideoJoinResponse,
  MeetingVideoPresenceSummary,
  MeetingVideoResource,
} from './meeting-video.types'

/**
 * Explicit Video Meeting transport only. No feature component invokes these requests while
 * the rollout flag is off; callers must obtain authorization from the returned capabilities.
 */
export const getMeetingVideoSession = (meetingId: number, signal?: AbortSignal) =>
  httpGet<MeetingVideoResource>(`/meetings/${meetingId}/video/session`, signal)

export const startMeetingVideo = (meetingId: number) =>
  httpPost<MeetingVideoResource>(`/meetings/${meetingId}/video/start`)

/**
 * The Backend identifies the caller from the authenticated session. Do not send browser,
 * device, or provider metadata here: a join credential is minted solely from that authority.
 */
export const joinMeetingVideo = (meetingId: number) =>
  httpPost<MeetingVideoJoinResponse>(`/meetings/${meetingId}/video/join`)

export const endMeetingVideo = (meetingId: number) =>
  httpPost<MeetingVideoResource>(`/meetings/${meetingId}/video/end`)

export const getMeetingVideoPresence = (meetingId: number, signal?: AbortSignal) =>
  httpGet<MeetingVideoPresenceSummary>(`/meetings/${meetingId}/video/presence`, signal)
