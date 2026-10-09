import { httpPost, httpPostForm } from '../../../services/http/http-client'

export interface CurriculumPreviewRow {
  rowNumber: number
  studentCode: string
  userId: number | null
  fullName: string | null
  currentCurriculumCode: string | null
  curriculumCode: string | null
  expectedConcurrencyToken: string | null
  status: string
  errors: string[]
}
export interface CurriculumPreview { rows: CurriculumPreviewRow[]; canCommit: boolean }
export interface CurriculumUpdate { userId: number; studentCode: string; curriculumCode: string; expectedConcurrencyToken: string }
export interface CurriculumCommitResult { updated: number; unchanged: number }

export function previewCurriculum(file: File, accessToken: string, signal?: AbortSignal) {
  const form = new FormData()
  form.append('file', file)
  return httpPostForm<CurriculumPreview>('/users/curriculum-import/preview', form, { accessToken, signal })
}

/** Reject incomplete/unknown preview rows rather than silently committing a partial batch. */
export function curriculumCommitRows(preview: CurriculumPreview): CurriculumUpdate[] | null {
  if (!preview.canCommit || !preview.rows.length || preview.rows.length > 500) return null
  const updates: CurriculumUpdate[] = []
  for (const row of preview.rows) {
    if (row.errors.length) return null
    if (row.status === 'SKIPPED') continue
    if (!['UPDATE', 'UNCHANGED'].includes(row.status) || !row.userId || !row.studentCode.trim()
      || !row.curriculumCode?.trim() || !row.expectedConcurrencyToken) return null
    updates.push({ userId: row.userId, studentCode: row.studentCode, curriculumCode: row.curriculumCode, expectedConcurrencyToken: row.expectedConcurrencyToken })
  }
  return updates.length ? updates : null
}

export function commitCurriculum(rows: CurriculumUpdate[], accessToken: string, signal?: AbortSignal) {
  return httpPost<CurriculumCommitResult>('/users/curriculum-import/commit', { rows }, { accessToken, signal })
}
