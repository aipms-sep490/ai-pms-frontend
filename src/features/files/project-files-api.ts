import { httpDelete, httpGet, httpGetBlob, httpGetStream, httpPostForm } from '../../services/http/http-client'
import type { PagedResult } from '../../types/backend'
import { getUploadPolicy, validateUploadFile } from '../../services/api/upload-policies.api'
import { uploadProjectFileInChunks, type ProjectFileUploadOptions } from './project-file-uploads'

export type FileParentType = 'TASK' | 'REPORT' | 'MEETING'

export interface ProjectFile {
  id: number
  parentType: string
  parentId: number
  fileName: string
  contentType: string
  sizeBytes: number
  uploadedBy: number
  uploadedByName?: string | null
  createdAt: string
  canDelete?: boolean
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
  for (const [key, value] of Object.entries({ page: 1, pageSize: 12, ...filters })) {
    if (value !== undefined && value !== '') query.set(key, String(value))
  }
  return query.toString()
}

export const getProjectFiles = (projectId: number, filters: ProjectFileFilters = {}, signal?: AbortSignal) =>
  httpGet<PagedResult<ProjectFile>>(`/projects/${projectId}/files?${queryOf(filters)}`, signal)

export const getProjectFile = (fileId: number, signal?: AbortSignal) => httpGet<ProjectFile>(`/files/${fileId}`, signal)
export const downloadProjectFile = (fileId: number, signal?: AbortSignal) => httpGetBlob(`/files/${fileId}/download`, { signal })
export const deleteProjectFile = (fileId: number) => httpDelete(`/files/${fileId}`)

export async function uploadProjectFile(parentType: FileParentType, parentId: number, file: File, options: ProjectFileUploadOptions = {}) {
  if (options.useSession || file.size > 20 * 1024 * 1024) {
    const policy = await getUploadPolicy(parentType)
    const error = validateUploadFile(file, policy)
    if (error) throw new Error(error)
    if (policy?.chunkSizeBytes && policy.singleRequestMaxBytes != null) return uploadProjectFileInChunks(parentType, parentId, file, options)
    if (file.size > (policy?.singleRequestMaxBytes ?? 20 * 1024 * 1024)) throw new Error('Chưa xác nhận được chức năng tải tệp lớn. Hãy tải lại trang rồi thử lại.')
  }
  const form = new FormData()
  form.set('parentType', parentType)
  form.set('parentId', String(parentId))
  form.set('file', file)
  return httpPostForm<ProjectFile>('/files', form, options.signal)
}

interface DownloadFileHandle { createWritable(): Promise<WritableStream<Uint8Array>> }

export async function saveProjectFile(file: ProjectFile): Promise<void> {
  const picker = (window as Window & { showSaveFilePicker?: (options: { suggestedName: string }) => Promise<DownloadFileHandle> }).showSaveFilePicker
  if (picker && file.sizeBytes > 20 * 1024 * 1024) {
    // Open within the click gesture before any network await, then stream to disk.
    const handle = await picker({ suggestedName: file.fileName })
    const stream = await httpGetStream(`/files/${file.id}/download`)
    let writable: WritableStream<Uint8Array>
    try { writable = await handle.createWritable() }
    catch (error) { await stream.cancel(); throw error }
    await stream.pipeTo(writable)
    return
  }
  const blob = await downloadProjectFile(file.id)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = file.fileName; anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
