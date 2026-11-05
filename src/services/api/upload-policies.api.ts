import { HttpError, httpGet } from '../http/http-client'

/** BE-05 contract. All values are server-owned; absence must not block upload. */
export interface UploadPolicy {
  parentType: string
  maxBytes: number
  maxBytesLabel: string
  allowedMimeTypes: string[]
  allowedExtensions: string[]
  maxFilesPerRequest: number
  requiresVersionAnchor: boolean
}

const pending = new Map<string, Promise<UploadPolicy | null>>()

export function clearUploadPolicyCache(): void { pending.clear() }

export function getUploadPolicy(parentType: string): Promise<UploadPolicy | null> {
  const key = parentType.trim().toUpperCase()
  const existing = pending.get(key)
  if (existing) return existing
  // The single-policy endpoint resolves BE-owned aliases such as TASK -> PROJECT_FILE.
  const request = httpGet<UploadPolicy>(`/v1/upload-policies/${encodeURIComponent(key)}`).catch(error => {
    pending.delete(key)
    if (error instanceof HttpError && error.status === 404) return null
    throw error
  })
  pending.set(key, request)
  return request
}

export function uploadPolicyLabel(policy: UploadPolicy): string {
  const formats = policy.allowedExtensions.map(ext => ext.replace(/^\./, '').toUpperCase()).join(', ')
  return [formats || 'Loại tệp theo chính sách máy chủ', policy.maxBytesLabel ? `tối đa ${policy.maxBytesLabel}` : 'Giới hạn do máy chủ xác nhận'].join(' · ')
}

export function validateUploadFile(file: File, policy: UploadPolicy | null): string | null {
  if (!policy) return null
  if (Number.isFinite(policy.maxBytes) && file.size > policy.maxBytes) return `Tệp vượt giới hạn ${policy.maxBytesLabel} do máy chủ công bố.`
  const allowed = policy.allowedExtensions.map(ext => ext.toLowerCase())
  if (allowed.length && !allowed.some(ext => file.name.toLowerCase().endsWith(ext))) return `Loại tệp không được chấp nhận. ${uploadPolicyLabel(policy)}.`
  if (!allowed.length && policy.allowedMimeTypes.length && file.type && !policy.allowedMimeTypes.includes(file.type)) return `Loại tệp không được chấp nhận. ${uploadPolicyLabel(policy)}.`
  return null
}
