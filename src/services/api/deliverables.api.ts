import { httpDelete, httpGet, httpPost, httpPostForm, httpPut } from '../http/http-client'
import type { PagedResult } from '../../types/backend'
import type { Deliverable, DeliverableFeedback, DeliverableVersion, SaveDeliverable } from '../../features/deliverables/deliverable-types'

export interface DeliverableFilters { status?: string; search?: string; milestoneId?: number; deliverableType?: string; page?: number; pageSize?: number }

function queryOf(input: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(input)) if (value !== undefined && value !== '') query.set(key, String(value))
  return query.toString()
}

export const getDeliverables = (projectId: number, filters: DeliverableFilters = {}, signal?: AbortSignal) =>
  httpGet<PagedResult<Deliverable>>(`/projects/${projectId}/deliverables?${queryOf({ page: 1, pageSize: 20, ...filters })}`, signal)
export const getDeliverable = (id: number, signal?: AbortSignal) => httpGet<Deliverable>(`/deliverables/${id}`, signal)
export const createDeliverable = (projectId: number, body: SaveDeliverable) => httpPost<Deliverable>(`/projects/${projectId}/deliverables`, body)
export const updateDeliverable = (id: number, body: SaveDeliverable) => httpPut<Deliverable>(`/deliverables/${id}`, body)
export const deleteDeliverable = (id: number) => httpDelete(`/deliverables/${id}`)
export const getDeliverableVersions = (id: number, page = 1, pageSize = 20, signal?: AbortSignal) =>
  httpGet<PagedResult<DeliverableVersion>>(`/deliverables/${id}/versions?${queryOf({ page, pageSize })}`, signal)
export const submitDeliverableVersion = (id: number, expectedLatestVersion: number, file: File, note?: string) => {
  const body = new FormData()
  body.set('file', file)
  body.set('expectedLatestVersion', String(expectedLatestVersion))
  if (note?.trim()) body.set('note', note.trim())
  return httpPostForm<DeliverableVersion>(`/deliverables/${id}/versions`, body)
}
export const reviewDeliverableVersion = (id: number, decision: 'ACCEPTED' | 'REJECTED', feedback: string) =>
  httpPost<DeliverableFeedback>(`/deliverable-versions/${id}/review`, { decision, feedback })
export const getDeliverableFeedback = (id: number, page = 1, pageSize = 20, signal?: AbortSignal) =>
  httpGet<PagedResult<DeliverableFeedback>>(`/deliverable-versions/${id}/feedback?${queryOf({ page, pageSize })}`, signal)
