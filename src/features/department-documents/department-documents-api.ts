import { httpGet, httpGetBlob, httpPost, httpPostForm } from '../../services/http/http-client'

export interface DepartmentDocument {
  id: number
  departmentId: number
  majorId: number
  projectPeriodId: number | null
  code: string
  title: string
  version: number
  status: 'DRAFT' | 'PUBLISHED' | 'RETIRED'
  fileName: string
  contentType: string
  sizeBytes: number
  sha256: string
  concurrencyToken: string
  uploadedAt: string
  publishedAt: string | null
}

const base = '/academic/department-documents'

export function listDepartmentDocuments(majorId: number, projectPeriodId?: number, signal?: AbortSignal) {
  const query = new URLSearchParams({ majorId: String(majorId) })
  if (projectPeriodId) query.set('projectPeriodId', String(projectPeriodId))
  return httpGet<DepartmentDocument[]>(`${base}?${query}`, signal)
}

export function uploadDepartmentDocument(input: {
  majorId: number; projectPeriodId?: number; code: string; title: string; file: File
}) {
  const form = new FormData()
  form.append('majorId', String(input.majorId))
  if (input.projectPeriodId) form.append('projectPeriodId', String(input.projectPeriodId))
  form.append('code', input.code)
  form.append('title', input.title)
  form.append('file', input.file)
  return httpPostForm<DepartmentDocument>(base, form)
}

export function publishDepartmentDocument(row: DepartmentDocument) {
  return httpPost<DepartmentDocument>(`${base}/${row.id}/publish`, { concurrencyToken: row.concurrencyToken })
}

export function retireDepartmentDocument(row: DepartmentDocument) {
  return httpPost<DepartmentDocument>(`${base}/${row.id}/retire`, { concurrencyToken: row.concurrencyToken })
}

export function downloadDepartmentDocument(id: number, signal?: AbortSignal) {
  return httpGetBlob(`${base}/${id}/download`, { signal })
}
