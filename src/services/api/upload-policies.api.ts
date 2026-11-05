import { httpGet } from '../http/http-client'

export interface UploadPolicy {
  parentType: string
  maxBytes: number
  maxBytesLabel: string
  allowedMimeTypes: string[]
  allowedExtensions: string[]
  maxFilesPerRequest: number
  requiresVersionAnchor: boolean
}

export const getUploadPolicies = (signal?: AbortSignal) =>
  httpGet<UploadPolicy[]>('/upload-policies', signal)

export const getUploadPolicy = (parentType: string, signal?: AbortSignal) =>
  httpGet<UploadPolicy>(`/upload-policies/${encodeURIComponent(parentType)}`, signal)
