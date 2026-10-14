import { afterEach, describe, expect, it, vi } from 'vitest'
import { getIndustryInvitations, inviteIndustryExpert, revokeIndustryInvitation } from './industry-api'

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })

describe('Industry admin invitation HTTP contract', () => {
  it('lists, invites and revokes against the real IndustryController routes', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    vi.stubGlobal('fetch', fetch); localStorage.setItem('token', 'admin-token')
    await getIndustryInvitations()
    await inviteIndustryExpert({ email: 'expert@company.com', fullName: 'Nguyễn Văn A', organization: 'Acme' })
    await revokeIndustryInvitation(5)
    expect(fetch.mock.calls.map(([url, options]) => [url, options.method])).toEqual([
      ['/api/v1/admin/industry/invitations?page=1&pageSize=20', 'GET'],
      ['/api/v1/admin/industry/invitations', 'POST'],
      ['/api/v1/admin/industry/invitations/5/revoke', 'POST'],
    ])
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ email: 'expert@company.com', fullName: 'Nguyễn Văn A', organization: 'Acme' })
  })
})
