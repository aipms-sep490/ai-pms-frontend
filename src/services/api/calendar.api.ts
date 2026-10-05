import { httpGet } from '../http/http-client'

export interface BackendCalendarItem {
  sourceType: 'TASK' | 'MILESTONE' | 'MEETING' | 'DELIVERABLE' | 'FINAL_SUBMISSION' | 'PROGRESS_REPORT'
  sourceId: number
  projectId: number
  code?: string | null
  title: string
  startAt?: string | null
  endAt?: string | null
  dueAt?: string | null
  status: string
  deepLink?: string | null
}

export interface BackendCalendarPage { items: BackendCalendarItem[]; nextCursor?: string | null; hasMore: boolean; complete: boolean }
export interface BackendCalendarQuery { from: string; to: string; pageSize: number; cursor?: string }

/** Scoped server calendar. Callers must not use it for an actor whose backend scope is known to be broad. */
export function getScopedCalendar(query: BackendCalendarQuery, signal?: AbortSignal): Promise<BackendCalendarPage> {
  const params = new URLSearchParams({ from: query.from, to: query.to, pageSize: String(query.pageSize) })
  if (query.cursor) params.set('cursor', query.cursor)
  return httpGet<BackendCalendarPage>(`/calendar?${params.toString()}`, signal)
}
