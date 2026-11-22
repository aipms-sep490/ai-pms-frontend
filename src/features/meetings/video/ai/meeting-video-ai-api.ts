import { httpDelete, httpGet, httpPatch, httpPost, httpPostForm } from '../../../../services/http/http-client'
import type {
  CreateTranscriptSegmentPayload,
  GenerateMeetingAiSummaryPayload,
  MeetingAiAnswer,
  MeetingAiCoachMode,
  MeetingAiCoachResult,
  MeetingAiInsight,
  MeetingTranscriptFeed,
  MeetingTranscriptSegment,
} from './meeting-video-ai.types'

export const getMeetingAiWorkspace = (
  meetingId: number,
  afterSegmentId?: number | null,
  signal?: AbortSignal,
) => {
  const query = afterSegmentId && afterSegmentId > 0 ? `?afterSegmentId=${afterSegmentId}` : ''
  return httpGet<MeetingTranscriptFeed>(`/meetings/${meetingId}/video/ai/workspace${query}`, signal)
}

export const appendMeetingTranscript = (
  meetingId: number,
  payload: CreateTranscriptSegmentPayload,
) => httpPost<MeetingTranscriptSegment>(`/meetings/${meetingId}/video/ai/transcript`, payload)

export const transcribeMeetingAudioClip = (
  meetingId: number,
  file: Blob,
  fileName: string,
  language = 'vi-VN',
) => {
  const form = new FormData()
  form.append('file', file, fileName)
  form.append('language', language)
  return httpPostForm<MeetingTranscriptSegment>(`/meetings/${meetingId}/video/ai/transcribe-audio`, form)
}

export const toggleTranscriptHighlight = (
  meetingId: number,
  segmentId: number,
  isHighlighted: boolean,
) =>
  httpPatch<MeetingTranscriptSegment>(
    `/meetings/${meetingId}/video/ai/transcript/${segmentId}/highlight`,
    { isHighlighted },
  )

export const deleteTranscriptSegment = (meetingId: number, segmentId: number) =>
  httpDelete<void>(`/meetings/${meetingId}/video/ai/transcript/${segmentId}`)

export const getMeetingAiInsights = (meetingId: number, limit = 10, signal?: AbortSignal) =>
  httpGet<MeetingAiInsight[]>(`/meetings/${meetingId}/video/ai/insights?limit=${limit}`, signal)

export const generateMeetingAiSummary = (
  meetingId: number,
  payload: GenerateMeetingAiSummaryPayload,
) => httpPost<MeetingAiInsight>(`/meetings/${meetingId}/video/ai/summarize`, payload)

export const askMeetingAi = (
  meetingId: number,
  question: string,
  recentMinutes?: number | null,
) =>
  httpPost<MeetingAiAnswer>(`/meetings/${meetingId}/video/ai/ask`, {
    question,
    recentMinutes: recentMinutes ?? null,
  })

export const coachMeetingAi = (
  meetingId: number,
  mode: MeetingAiCoachMode,
  recentMinutes?: number | null,
) =>
  httpPost<MeetingAiCoachResult>(`/meetings/${meetingId}/video/ai/coach`, {
    mode,
    recentMinutes: recentMinutes ?? null,
  })
