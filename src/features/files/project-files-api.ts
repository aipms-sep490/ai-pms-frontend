import { httpDelete, httpGet, httpGetBlob, httpPostForm } from '../../services/http/http-client'
import type { PagedResult } from '../../types/backend'

export type FileParentType = 'TASK' | 'REPORT' | 'MEETING'

export interface ProjectFile {
  id: number
  parentType: string
  parentId: number
  fileName: string
  contentType: string
  sizeBytes: number
  uploadedBy: number
  createdAt: string
}

export interface ProjectFileFilters {
  search?: string
  contentType?: string
  uploadedBy?: number
  from?: string
  to?: string
  parentType?: string
  page?: number
  pageSize?: number
}

function queryOf(filters: ProjectFileFilters) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries({ page: 1, pageSize: 20, ...filters })) {
    if (value !== undefined && value !== '') query.set(key, String(value))
  }
  return query.toString()
}

export const getProjectFiles = (projectId: number, filters: ProjectFileFilters = {}, signal?: AbortSignal) =>
  httpGet<PagedResult<ProjectFile>>(`/projects/${projectId}/files?${queryOf(filters)}`, signal)

export const getProjectFile = (fileId: number, signal?: AbortSignal) => httpGet<ProjectFile>(`/files/${fileId}`, signal)
export const downloadProjectFile = (fileId: number, signal?: AbortSignal) => httpGetBlob(`/files/${fileId}/download`, { signal })
export const deleteProjectFile = (fileId: number) => httpDelete(`/files/${fileId}`)

export function uploadProjectFile(parentType: FileParentType, parentId: number, file: File) {
  const form = new FormData()
  form.set('parentType', parentType)
  form.set('parentId', String(parentId))
  form.set('file', file)
  return httpPostForm<ProjectFile>('/files', form)
}
