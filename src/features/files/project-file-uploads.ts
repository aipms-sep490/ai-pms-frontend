import { env } from '../../app/config/env'
import { HttpError, httpDelete, httpGet, httpPost, httpPutBlob } from '../../services/http/http-client'
import type { FileParentType, ProjectFile } from './project-files-api'

export interface ProjectFileUploadSession {
  sessionId: string
  parentType: FileParentType
  parentId: number
  fileName: string
  totalBytes: number
  nextOffset: number
  chunkSizeBytes: number
  expiresAt: string
  state: 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  file: ProjectFile | null
  error: string | null
}

export interface SavedProjectFileUpload {
  ownerId: string
  parentType: FileParentType
  parentId: number
  fileName: string
  sizeBytes: number
  lastModified: number
  sessionId: string
  expiresAt: string
  sampleHash?: string
}

export interface ProjectFileUploadOptions {
  ownerId?: string | number
  signal?: AbortSignal
  onProgress?: (session: ProjectFileUploadSession) => void
  /** Used only when the server publishes resumable upload support. */
  useSession?: boolean
}

const prefix = `aipms.project-upload.v1:${env.apiBaseUrl}:`
const activeUploads = new Set<string>()
const endpoint = '/files/upload-sessions'

export function currentUploadOwner(): string | undefined {
  try {
    const session = JSON.parse(localStorage.getItem('ai-pms.auth-session') ?? 'null') as { user?: { id?: string | number } } | null
    return session?.user?.id == null ? undefined : String(session.user.id)
  } catch { return undefined }
}

function keyFor(owner: string, type: FileParentType, parentId: number, file: File): string {
  return prefix + JSON.stringify([owner, type, parentId, file.name, file.size, file.lastModified])
}

function readSaved(key: string): SavedProjectFileUpload | null {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null') as SavedProjectFileUpload | null
    if (!saved || typeof saved.sessionId !== 'string' || !/^[a-f0-9]{32}$/i.test(saved.sessionId)) return null
    if (!Number.isFinite(Date.parse(saved.expiresAt)) || Date.parse(saved.expiresAt) <= Date.now()) { localStorage.removeItem(key); return null }
    return saved
  } catch { return null }
}

export function getSavedProjectFileUploads(ownerId: string | number): SavedProjectFileUpload[] {
  const result: SavedProjectFileUpload[] = []
  try {
    const keys = Object.keys(localStorage).filter(key => key.startsWith(prefix))
    for (const key of keys) {
      const saved = readSaved(key)
      if (saved?.ownerId === String(ownerId)) result.push(saved)
    }
  } catch { /* Upload remains available when browser persistence is disabled. */ }
  return result
}

function forget(key: string): void { try { localStorage.removeItem(key) } catch { /* Optional browser persistence. */ } }

async function sampleHash(file: File): Promise<string | undefined> {
  if (!globalThis.crypto?.subtle) return undefined
  const sample = new Blob([file.slice(0, 65536), file.slice(Math.max(65536, file.size - 65536))])
  const bytes = typeof sample.arrayBuffer === 'function' ? await sample.arrayBuffer() : await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(new Error('Không đọc được tệp đã chọn.'))
    reader.readAsArrayBuffer(sample)
  })
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('')
}

function checkAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Đã tạm dừng tải tệp.', 'AbortError')
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  checkAborted(signal)
  return new Promise((resolve, reject) => {
    const onAbort = () => { clearTimeout(timer); signal?.removeEventListener('abort', onAbort); reject(new DOMException('Đã tạm dừng tải tệp.', 'AbortError')) }
    const timer = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve() }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function validateSession(session: ProjectFileUploadSession, type: FileParentType, parentId: number, file: File): void {
  if (!session || !/^[a-f0-9]{32}$/i.test(session.sessionId) || session.parentType !== type || session.parentId !== parentId
    || session.fileName !== file.name || session.totalBytes !== file.size || !Number.isSafeInteger(session.nextOffset)
    || session.nextOffset < 0 || session.nextOffset > file.size || !Number.isSafeInteger(session.chunkSizeBytes)
    || session.chunkSizeBytes <= 0 || session.chunkSizeBytes > 16 * 1024 * 1024
    || !['UPLOADING', 'PROCESSING', 'COMPLETED', 'FAILED'].includes(session.state)) {
    throw new Error('Thông tin phiên tải không khớp. Hãy tải lại trang và kiểm tra tệp đã chọn.')
  }
}

export async function cancelProjectFileUpload(sessionId: string, ownerId: string | number): Promise<void> {
  if (!/^[a-f0-9]{32}$/i.test(sessionId)) throw new Error('Phiên tải không hợp lệ.')
  await httpDelete(`${endpoint}/${sessionId}`)
  for (const saved of getSavedProjectFileUploads(ownerId)) {
    if (saved.sessionId !== sessionId) continue
    forget(prefix + JSON.stringify([String(ownerId), saved.parentType, saved.parentId, saved.fileName, saved.sizeBytes, saved.lastModified]))
  }
}

/** Only acknowledged offsets count as progress. An uncertain write is read back before continuing. */
export async function uploadProjectFileInChunks(type: FileParentType, parentId: number, file: File, options: ProjectFileUploadOptions = {}): Promise<ProjectFile> {
  const owner = options.ownerId == null ? currentUploadOwner() : String(options.ownerId)
  if (!owner) throw new HttpError('Hãy đăng nhập lại để tải tệp lớn.', 401)
  const key = keyFor(owner, type, parentId, file)
  if (activeUploads.has(key)) throw new Error('Tệp này đang được tải lên. Hãy chờ phiên hiện tại.')
  activeUploads.add(key)
  try {
    checkAborted(options.signal)
    const storedOwner = currentUploadOwner()
    if (storedOwner && storedOwner !== owner) throw new HttpError('Tài khoản đã thay đổi. Hãy mở lại kho tệp.', 401)
    const assertOwner = () => {
      checkAborted(options.signal)
      if (storedOwner && currentUploadOwner() !== storedOwner) throw new HttpError('Tài khoản đã thay đổi. Hãy mở lại kho tệp.', 401)
    }
    const fingerprint = await sampleHash(file)
    assertOwner()
    let saved = readSaved(key)
    if (saved?.sampleHash && fingerprint !== saved.sampleHash) throw new Error('Nội dung tệp đã chọn khác phiên tải trước. Hãy chọn đúng tệp gốc hoặc hủy phiên cũ trước khi tải lại.')
    let session: ProjectFileUploadSession
    if (saved) {
      try { session = await httpGet<ProjectFileUploadSession>(`${endpoint}/${saved.sessionId}`, options.signal) }
      catch (error) {
        if (error instanceof HttpError && error.status === 404) { forget(key); saved = null }
        else throw error
      }
    }
    if (!saved) {
      assertOwner()
      // Never retry creation after a lost response: the server may already have reserved a session.
      session = await httpPost<ProjectFileUploadSession>(endpoint, {
        parentType: type, parentId, fileName: file.name, contentType: file.type || 'application/octet-stream', sizeBytes: file.size,
      }, options.signal)
    }
    const accept = (next: ProjectFileUploadSession) => {
      assertOwner()
      validateSession(next, type, parentId, file)
      session = next
      try { localStorage.setItem(key, JSON.stringify({ ownerId: owner, parentType: type, parentId, fileName: file.name, sizeBytes: file.size, lastModified: file.lastModified, sessionId: next.sessionId, expiresAt: next.expiresAt, sampleHash: fingerprint } satisfies SavedProjectFileUpload)) } catch { /* Resume still works while this invocation is active. */ }
      options.onProgress?.(next)
    }
    accept(session!)
    const readBack = async () => {
      assertOwner()
      accept(await httpGet<ProjectFileUploadSession>(`${endpoint}/${session.sessionId}`, options.signal))
    }
    while (session!.state === 'UPLOADING' && session!.nextOffset < file.size) {
      assertOwner()
      const start = session!.nextOffset
      const end = Math.min(start + session!.chunkSizeBytes, file.size)
      try {
        const result = await httpPutBlob<ProjectFileUploadSession>(`${endpoint}/${session!.sessionId}/chunks?offset=${start}`, file.slice(start, end), { signal: options.signal })
        accept(result)
      } catch (error) {
        checkAborted(options.signal)
        if (error instanceof HttpError && error.status < 500 && error.status !== 409) throw error
        await readBack()
        if (session!.nextOffset === start && session!.state === 'UPLOADING') throw error
      }
      if (session!.state === 'UPLOADING' && session!.nextOffset !== end) throw new Error('Vị trí tải lên đã thay đổi. Hãy bấm tiếp tục để đồng bộ lại với máy chủ.')
    }
    // A new user invocation can retry a failed background save without resending its bytes.
    if (session!.state === 'UPLOADING' || (saved && session!.state === 'FAILED')) {
      assertOwner()
      try { accept(await httpPost<ProjectFileUploadSession>(`${endpoint}/${session!.sessionId}/complete`, undefined, options.signal)) }
      catch (error) {
        checkAborted(options.signal)
        if (error instanceof HttpError && error.status < 500 && error.status !== 409) throw error
        await readBack()
        if (session!.state === 'UPLOADING') throw error
      }
    }
    let pollDelay = 1000
    while (session!.state === 'PROCESSING') {
      await delay(pollDelay, options.signal)
      await readBack()
      pollDelay = Math.min(5000, pollDelay * 1.5)
    }
    if (session!.state === 'FAILED') throw new Error(session!.error || 'Máy chủ chưa lưu được tệp. Bạn có thể thử lưu lại hoặc hủy phiên tải.')
    if (session!.state !== 'COMPLETED' || !session!.file || session!.file!.parentType !== type || session!.file!.parentId !== parentId || session!.file!.sizeBytes !== file.size) {
      throw new Error('Chưa xác nhận được tệp đã lưu. Hãy kiểm tra lại phiên tải.')
    }
    forget(key)
    return session!.file!
  } finally { activeUploads.delete(key) }
}
