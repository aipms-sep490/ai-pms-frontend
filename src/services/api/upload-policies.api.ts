import { httpGet } from '../http/http-client'

/** BE-05 draft contract. All values are server-owned; absence must not block upload. */
export interface UploadPolicy {
  parentType: string
  maxBytes: number
  maxBytesLabel: string
  allowedMimeTypes: string[]
  allowedExtensions: string[]
  maxFilesPerRequest: number
  requiresVersionAnchor: boolean
}

let pending: Promise<UploadPolicy[]> | null = null

export function clearUploadPolicyCache(): void { pending = null }

export function getUploadPolicies(): Promise<UploadPolicy[]> {
  if (!pending) {
    pending = httpGet<UploadPolicy[]>('/upload-policies').catch(error => { pending = null; throw error })
  }
  return pending
}

export async function getUploadPolicy(parentType: string): Promise<UploadPolicy | null> {
  return (await getUploadPolicies()).find(policy => policy.parentType === parentType) ?? null
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
