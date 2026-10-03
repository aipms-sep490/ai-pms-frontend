export type CalendarSourceType = 'TASK' | 'MILESTONE' | 'MEETING' | 'DELIVERABLE' | 'FINAL_SUBMISSION' | 'EVALUATION_ASSIGNMENT' | 'PROGRESS_REPORT'

export interface CalendarProjectionItem {
  sourceType: CalendarSourceType
  sourceId: number | string
  projectId?: number
  projectName?: string
  title: string
  startAt?: string
  endAt?: string
  dueAt?: string
  status: string
  scopeLabel?: string
  deepLink: string
  metadata?: Record<string, string | number | boolean | null>
}

export interface AttentionItem {
  code: string
  source: CalendarSourceType | 'ACCOUNT' | 'PROJECT'
  sourceId: number | string
  title: string
  description: string
  dueAt?: string
  status: string
  /** UI ordering only. It is never used to make an authorization decision. */
  presentationPriority: number
  deepLink: string
}

/** Complete, empty, degraded and unsupported reads remain visibly distinct. */
export type CalendarSourceState = 'ready' | 'empty' | 'partial' | 'error' | 'unavailable' | 'unsupported'

export interface CalendarSourceStatus {
  id: string
  label: string
  state: CalendarSourceState
  message?: string
}

export interface CalendarAttentionData {
  calendar: CalendarProjectionItem[]
  attention: AttentionItem[]
  sources: CalendarSourceStatus[]
}
