import { afterEach, describe, expect, it, vi } from 'vitest'
import * as api from './deliverables.api'

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })

describe('Deliverables HTTP contract', () => {
  it('uses the BE-08 routes, authorization and multipart version boundary', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ items: [] }) })
    vi.stubGlobal('fetch', fetch); localStorage.setItem('token', 'deliverable-token')
    const body = { milestoneId: null, title: 'Demo', description: null, deliverableType: 'REPORT', dueAt: null }
    await api.getDeliverables(9, { status: 'OPEN', page: 2 })
    await api.createDeliverable(9, body); await api.updateDeliverable(4, body); await api.deleteDeliverable(4)
    await api.getDeliverableVersions(4); await api.submitDeliverableVersion(4, 2, new File(['v3'], 'demo.pdf', { type: 'application/pdf' }), 'V3')
    await api.reviewDeliverableVersion(7, 'ACCEPTED', 'Đạt yêu cầu'); await api.getDeliverableFeedback(7)
    expect(fetch.mock.calls.map(([url, options]) => [url, options.method])).toEqual([
      ['/api/v1/projects/9/deliverables?page=2&pageSize=20&status=OPEN', 'GET'], ['/api/v1/projects/9/deliverables', 'POST'],
      ['/api/v1/deliverables/4', 'PUT'], ['/api/v1/deliverables/4', 'DELETE'], ['/api/v1/deliverables/4/versions?page=1&pageSize=20', 'GET'],
      ['/api/v1/deliverables/4/versions', 'POST'], ['/api/v1/deliverable-versions/7/review', 'POST'], ['/api/v1/deliverable-versions/7/feedback?page=1&pageSize=20', 'GET'],
    ])
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual(body)
    expect(fetch.mock.calls[5][1].body).toBeInstanceOf(FormData)
    expect(fetch.mock.calls[5][1].headers).not.toHaveProperty('Content-Type')
    expect(fetch.mock.calls[5][1].body.get('expectedLatestVersion')).toBe('2')
    expect(fetch.mock.calls.every(([, options]) => options.headers.Authorization === 'Bearer deliverable-token')).toBe(true)
  })
})
