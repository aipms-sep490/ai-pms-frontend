import { httpGet, httpPost } from '../../services/http/http-client'
import type { AgreementSection, WorkingAgreement } from './working-agreement-types'

// BE-16 endpoints. FE is built ahead of the backend; until it ships these calls
// return 404/501 and the page shows its error state.
export const getWorkingAgreement = (projectId: number, signal?: AbortSignal) =>
  httpGet<WorkingAgreement>(`/projects/${projectId}/working-agreement`, signal)

export const acceptWorkingAgreement = (projectId: number, agreementId: number) =>
  httpPost<WorkingAgreement, { agreementId: number }>(
    `/projects/${projectId}/working-agreement/acceptances`,
    { agreementId },
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
