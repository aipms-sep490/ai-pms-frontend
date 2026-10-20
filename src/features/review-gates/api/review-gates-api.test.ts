import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from './review-gates-api'
import type { ReviewGateTemplate } from '../types/review-gates.types'

vi.mock('../../../app/config/env', () => ({
  env: { reviewGatesMockEnabled: false, apiBaseUrl: '/api/v1' },
}))

const fetchMock = vi.fn<typeof fetch>()
const token = '7f251708420a4d7f9e16e0196a0edcee'
const template: ReviewGateTemplate = {
  id: 'tmpl-draft-new', code: 'T1', name: 'Template', mode: 'SINGLE_MAJOR', major: '',
  status: 'DRAFT', version: '1.0', concurrencyToken: '', gatesCount: 1,
  gates: [{
    id: 'draft-gate', code: 'R1', title: 'Review', objective: '', required: true,
    blockNextGate: true, start: '', end: '', reviewerPolicy: 'Assigned Reviewer', reviewScope: 'COMMON',
    requirements: [{ id: 'draft-req', code: 'DOC', title: 'Report', type: 'DOCUMENT', scope: 'COMMON', verification: 'HUMAN', required: true }],
  }],
}

describe('Review Gates transport against BE a1f510b (mock disabled)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset().mockResolvedValue(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }))
    localStorage.setItem('token', 'test-access-token')
  })
  afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })

  it('uploads actual bytes to evidence/file with expected version and gate token', async () => {
    const file = new File(['actual document bytes'], 'report.pdf', { type: 'application/pdf' })
    await api.submitRevision({ projectId: '9007199254740993', gateCode: 'R1', requirementId: '21', artifactName: file.name, notes: 'Updated', expectedVersion: 2, concurrencyToken: token, mode: 'file', file }, true)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/v1/projects/9007199254740993/review-gates/R1/evidence/file')
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer test-access-token' })
    expect(init?.headers).not.toHaveProperty('Content-Type')
    const body = init?.body as FormData
    expect(body.get('file')).toBe(file)
    expect(body.get('requirementId')).toBe('21')
    expect(body.get('expectedVersion')).toBe('2')
    expect(body.get('concurrencyToken')).toBe(token)
  })

  it('rejects metadata-only FILE submissions before sending a request', async () => {
    await expect(api.submitRevision({ projectId: '1', gateCode: 'R1', requirementId: '21', artifactName: 'name-only.pdf', notes: '', expectedVersion: 0, concurrencyToken: token, mode: 'file' }, true)).rejects.toThrow(/tệp/i)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not pretend unsupported external links are persisted evidence', async () => {
    await expect(api.submitRevision({ projectId: '1', gateCode: 'R1', requirementId: '21', artifactName: 'https://example.com', linkUrl: 'https://example.com', notes: '', expectedVersion: 0, concurrencyToken: token, mode: 'link' }, true)).rejects.toThrow(/liên kết/i)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('requires the gate token for real upload', async () => {
    await expect(api.submitRevision({ projectId: '1', gateCode: 'R1', requirementId: '21', artifactName: 'report.pdf', notes: '', expectedVersion: 0, mode: 'file', file: new File(['bytes'], 'report.pdf') }, true)).rejects.toThrow(/tải lại/i)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reads a server-paginated reviewer queue without dropping envelope or IDs', async () => {
    const page = { items: [{ id: '9007199254740993' }], page: 2, pageSize: 10, totalCount: 11, totalPages: 2 }
    fetchMock.mockResolvedValueOnce(Response.json(page))
    expect(await api.getAssignedReviewPage(2, 10)).toEqual(page)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/reviewers/me/gate-assignments?page=2&pageSize=10')
  })

  it('sends submit-for-review with the gate token, without route IDs in body', async () => {
    await api.submitGateForReview({ projectId: '1', gateCode: 'R1', concurrencyToken: token, notes: 'Ready' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/v1/projects/1/review-gates/R1/submit-for-review')
    expect(JSON.parse(init?.body as string)).toEqual({ concurrencyToken: token, notes: 'Ready' })
  })

  it('maps a draft to the BE write DTO, assigns sequence and nullable dates', async () => {
    await api.saveReviewGateTemplate(template)
    const [url, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(init?.body as string)
    expect(url).toBe('/api/v1/academic/gate-templates')
    expect(body).not.toHaveProperty('id')
    expect(body).not.toHaveProperty('gatesCount')
    expect(body.gates[0]).toMatchObject({ sequence: 1, start: null, end: null })
    expect(body.gates[0]).not.toHaveProperty('id')
    expect(body.gates[0].requirements[0]).toMatchObject({ code: 'DOC', majorId: null, targetStudentId: null })
    expect(body.gates[0].requirements[0]).not.toHaveProperty('id')
  })

  it('downloads the exact protected version with the existing authenticated HTTP client', async () => {
    fetchMock.mockResolvedValueOnce(new Response('exact-version-bytes', { headers: { 'Content-Type': 'application/pdf' } }))
    const blob = await api.downloadReviewGateEvidence('1', 'R1', '21', 2)
    expect(blob.size).toBe(19)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/projects/1/review-gates/R1/requirements/21/evidence/2/download')
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ Authorization: 'Bearer test-access-token' })
  })

  it('does not call a supervisor-feedback endpoint absent from the BE contract', async () => {
    await expect(api.submitSupervisorFeedback({ projectId: '1', gateCode: 'R1', feedback: 'Advice' })).rejects.toThrow(/chưa hỗ trợ/i)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
