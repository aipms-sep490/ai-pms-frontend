import { httpGet, httpPost, httpPut } from '../../services/http/http-client'
import type { PagedResult } from '../../types/backend'
import type { AgreementSection, WorkingAgreement } from './working-agreement-types'

// First/successor drafts use expectedLatestVersion; editing a draft also requires its token.
export const saveWorkingAgreement = (projectId: number, body: {
  expectedLatestVersion: number; concurrencyToken?: string; sections: AgreementSection[]
}) => httpPut<WorkingAgreement>(`/projects/${projectId}/working-agreement/draft`, body)

export const publishWorkingAgreement = (projectId: number, agreementId: number, concurrencyToken: string) =>
  httpPost<WorkingAgreement>(`/projects/${projectId}/working-agreement/publish`, { agreementId, concurrencyToken })

export const getWorkingAgreementHistory = (projectId: number, page = 1, pageSize = 10, signal?: AbortSignal) =>
  httpGet<PagedResult<WorkingAgreement>>(`/projects/${projectId}/working-agreement/history?page=${page}&pageSize=${pageSize}`, signal)
export const getWorkingAgreement = (projectId: number, signal?: AbortSignal) =>
  httpGet<WorkingAgreement | null>(`/projects/${projectId}/working-agreement`, signal)

export const acceptWorkingAgreement = (projectId: number, agreementId: number, concurrencyToken: string) =>
  httpPost<WorkingAgreement, { agreementId: number; concurrencyToken: string }>(
    `/projects/${projectId}/working-agreement/acceptances`,
    { agreementId, concurrencyToken },
  )

/**
 * `content_json` is backend-owned free-form JSON. Parse it defensively into
 * display sections: accept `{ sections: [...] }`, a bare array, or plain text,
 * and never throw on malformed input.
 */
export const parseAgreementSections = (contentJson: string): AgreementSection[] => {
  const text = contentJson?.trim()
  if (!text) return []
  try {
    const parsed: unknown = JSON.parse(text)
    const list = Array.isArray(parsed)
      ? parsed
      : typeof parsed === 'object' && parsed !== null && Array.isArray((parsed as { sections?: unknown }).sections)
        ? (parsed as { sections: unknown[] }).sections
        : null
    if (list) {
      return list
        .map(item => {
          if (typeof item === 'string') return { title: '', body: item }
          if (typeof item === 'object' && item !== null) {
            const row = item as { title?: unknown; heading?: unknown; body?: unknown; text?: unknown }
            const title = typeof row.title === 'string' ? row.title : typeof row.heading === 'string' ? row.heading : ''
            const body = typeof row.body === 'string' ? row.body : typeof row.text === 'string' ? row.text : ''
            return { title, body }
          }
          return { title: '', body: '' }
        })
        .filter(section => section.title.trim() || section.body.trim())
    }
  } catch {
    // not JSON — fall through to plain text
  }
  return [{ title: '', body: text }]
}
