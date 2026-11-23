export type TranscriptSource = 'WEB_SPEECH' | 'AUDIO_STT' | 'MANUAL_NOTE'

export interface MeetingTranscriptSegment {
  id: number
  meetingId: number
  meetingVideoSessionId: number | null
  speakerUserId: number | null
  speakerName: string
  language: string
  source: TranscriptSource | string
  content: string
  isHighlighted: boolean
  clientSegmentId: string | null
  spokenAt: string
  createdBy: number
}

export interface MeetingSpeakerStat {
  speakerUserId: number | null
  speakerName: string
  segmentCount: number
  wordCount: number
  highlightCount: number
  sharePercent: number
}

export interface MeetingAiTopic {
  title: string
  summary: string
  speakers: string[]
}

export interface MeetingAiActionItem {
  title: string
  description: string | null
  ownerName: string | null
  assigneeUserId: number | null
  dueAt: string | null
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string
  evidenceQuote: string | null
  sourceSegmentId: number | null
}

export interface MeetingAiAgendaItem {
  item: string
  status: 'COVERED' | 'PARTIAL' | 'MISSED' | string
  note: string
}

export interface MeetingAiSpeakerInsight {
  speakerName: string
  userId: number | null
  summary: string
  keyContributions: string[]
}

export interface MeetingAiNextMeeting {
  title: string
  purpose: string | null
  suggestedTimeNote: string | null
}

export type MeetingAiInsightType = 'LIVE_PULSE' | 'FULL_MINUTES' | 'COACH_CHECK'

export interface MeetingAiInsight {
  id: number
  meetingId: number
  insightType: MeetingAiInsightType | string
  status: 'COMPLETED' | 'FALLBACK' | string
  modelVersion: string | null
  transcriptSegmentCount: number
  lastSegmentId: number | null
  executiveSummary: string
  currentTopic: string | null
  formattedMinutes: string
  keyTopics: MeetingAiTopic[]
  decisions: string[]
  actionItems: MeetingAiActionItem[]
  blockersAndRisks: string[]
  openQuestions: string[]
  agendaCoverage: MeetingAiAgendaItem[]
  speakerInsights: MeetingAiSpeakerInsight[]
  suggestedNextQuestions: string[]
  nextMeetingSuggestion: MeetingAiNextMeeting | null
  createdBy: number
  createdByName: string
  createdAt: string
}

export interface MeetingTranscriptFeed {
  meetingId: number
  totalSegments: number
  lastSegmentId: number | null
  segments: MeetingTranscriptSegment[]
  speakerStats: MeetingSpeakerStat[]
  latestInsight: MeetingAiInsight | null
  aiAvailable: boolean
  audioSttConfigured: boolean
}

export interface CreateTranscriptSegmentPayload {
  content: string
  language?: string
  source?: 'WEB_SPEECH' | 'MANUAL_NOTE'
  speakerName?: string | null
  isHighlighted?: boolean
  clientSegmentId?: string | null
  spokenAt?: string | null
}

export interface GenerateMeetingAiSummaryPayload {
  mode: 'LIVE_PULSE' | 'FULL_MINUTES'
  recentMinutes?: number | null
  focusPrompt?: string | null
}

export interface MeetingAiCitation {
  segmentId: number
  speakerName: string
  spokenAt: string
  excerpt: string
}

export interface MeetingAiAnswer {
  meetingId: number
  question: string
  answer: string
  citations: MeetingAiCitation[]
  followUpQuestions: string[]
  status: 'COMPLETED' | 'FALLBACK' | string
  generatedAt: string
}

export type MeetingAiCoachMode =
  | 'CATCH_UP'
  | 'AGENDA_CHECK'
  | 'TASK_AUDIT'
  | 'SUPERVISOR_FEEDBACK_DRAFT'

export interface MeetingAiCoachFinding {
  category: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | string
  title: string
  detail: string
  relatedEntity: string | null
}

export interface MeetingAiCoachResult {
  meetingId: number
  mode: MeetingAiCoachMode | string
  headline: string
  summary: string
  findings: MeetingAiCoachFinding[]
  suggestedPrompts: string[]
  draftText: string | null
  status: 'COMPLETED' | 'FALLBACK' | string
  generatedAt: string
}

/** Real-time caption / sync messages exchanged over LiveKit DataChannel */
export interface LiveCaptionLine {
  key: string
  clientSegmentId: string
  speakerName: string
  text: string
  isFinal: boolean
  language: string
  spokenAt: string
  persistedId?: number
}

export type LiveKitAiDataPacket =
  | {
      type: 'caption-interim'
      clientSegmentId: string
      speakerName: string
      text: string
      language: string
      spokenAt: string
    }
  | {
      type: 'caption-final'
      clientSegmentId: string
      speakerName: string
      text: string
      language: string
      spokenAt: string
      persistedId?: number
    }
  | {
      type: 'ai-insight-updated'
      insightId: number
      insightType: string
    }
  | {
      type: 'transcript-sync'
      segmentId?: number
    }
