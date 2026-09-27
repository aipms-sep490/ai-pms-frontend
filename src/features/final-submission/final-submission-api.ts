import { HttpError, httpGet, httpGetBlob, httpPost, httpPut } from '../../services/http/http-client'
import type { PagedResult } from '../../types/backend'

export interface FinalPeriod { id: number; name: string; status: string; startAt: string; endAt: string; canPrepareDraft: boolean; blockers: string[] }
export interface FinalDraftItem { deliverableVersionId: number; deliverableId: number; title: string; versionNumber: number; versionStatus: string; isEligible: boolean }
export interface FinalDraft {
  id: number; projectId: number; projectPeriodId: number; status: string; isLocked: boolean; notes: string | null
  concurrencyToken: string; canEdit: boolean; editBlockers: string[]; items: FinalDraftItem[]
}
export interface FinalRequirements {
  projectId: number; concurrencyToken: string | null
  items: Array<{ deliverableId: number; title: string }>
}
export interface FinalChecklist {
  projectId: number; projectPeriodId: number | null; deadline: string | null
  draftConcurrencyToken: string | null; requirementsConcurrencyToken: string | null
  canSubmit: boolean; blockers: string[]
  items: Array<{ deliverableId: number; title: string; selectedVersionId: number | null; isComplete: boolean }>
}
export interface LockedFinalSubmission {
  id: number; projectId: number; projectPeriodId: number; status: string; isLocked: boolean
  submittedBy: number; submittedAt: string; deadline: string; notes: string | null
  items: Array<{ deliverableVersionId: number; deliverableId: number; title: string; versionNumber: number; statusAtSubmission: string; wasRequired: boolean; files: Array<{ id: number; fileName: string; contentType: string; sizeBytes: number }> }>
}

const root = (projectId: number) => `/v1/projects/${projectId}`

async function optional<T>(request: Promise<T>): Promise<T | null> {
  try { return await request } catch (reason) { if (reason instanceof HttpError && reason.status === 404) return null; throw reason }
}

export const getFinalPeriods = (projectId: number, page = 1) => httpGet<PagedResult<FinalPeriod>>(`${root(projectId)}/final-submission-periods?page=${page}&pageSize=100`)
export const getFinalDraft = (projectId: number) => optional(httpGet<FinalDraft>(`${root(projectId)}/final-submission-draft`))
export const createFinalDraft = (projectId: number, body: { projectPeriodId: number; notes: string | null; deliverableVersionIds: number[] }) => httpPost<FinalDraft>(`${root(projectId)}/final-submission-draft`, body)
export const updateFinalDraft = (projectId: number, body: { projectPeriodId: number; notes: string | null; deliverableVersionIds: number[]; concurrencyToken: string }) => httpPut<FinalDraft>(`${root(projectId)}/final-submission-draft`, body)
export const getFinalRequirements = (projectId: number) => httpGet<FinalRequirements>(`${root(projectId)}/final-submission/requirements`)
export const configureFinalRequirements = (projectId: number, deliverableIds: number[], concurrencyToken: string | null) => httpPut<FinalRequirements>(`${root(projectId)}/final-submission/requirements`, { deliverableIds, concurrencyToken })
export const getFinalChecklist = (projectId: number) => httpGet<FinalChecklist>(`${root(projectId)}/final-submission/checklist`)
export const getLockedFinalSubmission = (projectId: number) => optional(httpGet<LockedFinalSubmission>(`${root(projectId)}/final-submission`))
export const downloadLockedFile = (projectId: number, fileId: number) => httpGetBlob(`${root(projectId)}/final-submission/files/${fileId}/download`)
export const submitFinalSubmission = (projectId: number, draftConcurrencyToken: string, requirementsConcurrencyToken: string) => httpPost<LockedFinalSubmission>(`${root(projectId)}/final-submission`, { draftConcurrencyToken, requirementsConcurrencyToken })
