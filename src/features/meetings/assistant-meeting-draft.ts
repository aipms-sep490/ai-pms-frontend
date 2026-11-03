import type { AssistantDraft, AssistantMeetingDraft } from '../ai/academic-ai-api'
import { safeMeetingUrl } from './meeting-utils'

export function readAssistantMeetingDraft(value: unknown, projectId: number): AssistantDraft | undefined {
  if (!value || typeof value !== 'object') return undefined
  const draft = value as Record<string, unknown>
  if (draft.kind !== 'MEETING' || draft.projectId !== projectId || typeof draft.title !== 'string' || typeof draft.description !== 'string') return undefined
  const source = draft.meeting && typeof draft.meeting === 'object' ? draft.meeting as Record<string, unknown> : {}
  const date = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)) ? value : null
  const startAt = date(source.startAt)
  const end = date(source.endAt)
  const mode = source.meetingDeliveryMode
  const channel = source.videoChannel
  const meeting: AssistantMeetingDraft = {
    startAt, endAt: startAt && end && Date.parse(end) >= Date.parse(startAt) ? end : null,
    meetingDeliveryMode: mode === 'ONSITE' || mode === 'REMOTE' || mode === 'HYBRID' ? mode : null,
    videoChannel: channel === 'NONE' || channel === 'IN_APP_VIDEO' || channel === 'EXTERNAL_LINK' ? channel : null,
    location: typeof source.location === 'string' ? source.location.slice(0, 255) : null,
    onlineUrl: typeof source.onlineUrl === 'string' ? safeMeetingUrl(source.onlineUrl) : null,
    inviteAll: source.inviteAll === true,
  }
  return { kind: 'MEETING', title: draft.title.slice(0, 255), description: draft.description.slice(0, 4000), meeting }
}
