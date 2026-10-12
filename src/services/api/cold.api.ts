import { httpDelete, httpGet, httpGetBlob, httpPost, httpPostForm } from '../http/http-client'
import type { PagedResult } from '../../types/backend'

export type ColdScope = 'COMMON' | 'MAJOR_SPECIFIC' | 'INDIVIDUAL' | (string & {})
export type ColdSubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'LOCKED' | (string & {})

export interface ColdFile {
  id: number
  fileName: string
  contentType: string
  sizeBytes: number
  sha256: string
  downloadUrl: string
}

/** One immutable version of a report. Only the latest version is editable while DRAFT. */
export interface ColdSubmission {
  id: number
  checklistItemId: number
  projectId: number
  reportType: string
  scope: ColdScope
  majorId: number
  studentId: number | null
  version: number
  status: ColdSubmissionStatus
  note: string | null
  createdBy: number
  createdAt: string
  submittedAt: string | null
  lockedAt: string | null
  concurrencyToken: string
  files: ColdFile[]
}

/** `canWrite` is server-decided (frozen major/individual target + window); never inferred client-side. */
export interface ColdChecklistItem {
  id: number
  templateId: number
  templateVersion: number
  reportType: string
  name: string
  required: boolean
  scope: ColdScope
  majorId: number
  studentId: number | null
  latest: ColdSubmission | null
  canWrite: boolean
}

export interface ColdChecklist {
  id: number
  projectId: number
  projectPeriodId: number
  deadline: string
  status: string
  concurrencyToken: string
  lockedAt: string | null
  canLock: boolean
  blockers: string[]
  items: ColdChecklistItem[]
}

export const getColdChecklist = (projectId: number, signal?: AbortSignal) =>
  httpGet<ColdChecklist>(`/projects/${projectId}/cold/checklist`, signal)

/** Omit `concurrencyToken` to create the first draft version; include it to edit the current draft. */
export const saveColdDraft = (itemId: number, body: { expectedLatestVersion: number; note?: string | null; concurrencyToken?: string | null }) =>
  httpPost<ColdSubmission>(`/cold-checklist-items/${itemId}/draft`, body)

export const getColdSubmissionHistory = (itemId: number, page = 1, pageSize = 20, signal?: AbortSignal) =>
  httpGet<PagedResult<ColdSubmission>>(`/cold-checklist-items/${itemId}/history?page=${page}&pageSize=${pageSize}`, signal)

export const uploadColdSubmissionFile = (submissionId: number, file: File, concurrencyToken: string) => {
  const form = new FormData()
  form.append('file', file)
  form.append('concurrencyToken', concurrencyToken)
  return httpPostForm<ColdSubmission>(`/cold-submissions/${submissionId}/files`, form)
}

export const removeColdSubmissionFile = (submissionId: number, fileId: number, concurrencyToken: string) =>
  httpDelete<ColdSubmission>(`/cold-submissions/${submissionId}/files/${fileId}?concurrencyToken=${encodeURIComponent(concurrencyToken)}`)

export const submitColdSubmission = (submissionId: number, concurrencyToken: string) =>
  httpPost<ColdSubmission>(`/cold-submissions/${submissionId}/submit`, { concurrencyToken })

/** Scoped download: the backend enforces the caller may only reach files within their own target. */
export const downloadColdSubmissionFile = (submissionId: number, fileId: number, signal?: AbortSignal) =>
  httpGetBlob(`/cold-submissions/${submissionId}/files/${fileId}/download`, { signal })
