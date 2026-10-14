import { httpGet, httpPost } from '../../services/http/http-client'
import type { AgreementSection, WorkingAgreement } from './working-agreement-types'

// BE-16 endpoints — BACKEND_READY (AIPMS.Api/Controllers/WorkingAgreementsController.cs).
// GET resolves to `null` (backend 204) when no agreement exists yet. Accept/publish/draft-save
// all require the row's current `concurrencyToken`; omitting or staling it is a 409
// WORKING_AGREEMENT_STALE. Draft-save and publish are leader-only and not wired by this page yet
// — tracked as a follow-up (leader authoring UI).
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
