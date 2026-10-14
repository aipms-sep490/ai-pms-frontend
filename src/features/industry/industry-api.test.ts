import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  assignIndustryExpert, downloadIndustryEvidenceFile, enrollIndustryGoogle, getIndustryEvidence,
  getIndustryFeedbackHistory, getIndustryGoogleChallenge, getIndustryInvitations, getMyIndustryAssignments,
  getProjectIndustryAssignments, inviteIndustryExpert, revokeIndustryAssignment, revokeIndustryInvitation,
  shareIndustryEvidence, submitIndustryFeedback, unshareIndustryEvidence,
} from './industry-api'

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

describe('Industry lead assignment + expert portal HTTP contract', () => {
  it('assigns, lists (lead vs mine) and revokes against the real routes', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    vi.stubGlobal('fetch', fetch); localStorage.setItem('token', 'lead-token')
    await assignIndustryExpert(9, { expertId: 3, scope: 'COMMON', startsAt: '2026-10-01T00:00:00Z', endsAt: '2026-12-01T00:00:00Z' })
    await getProjectIndustryAssignments(9)
    await getMyIndustryAssignments()
    await revokeIndustryAssignment(7, 'token-1')
    expect(fetch.mock.calls.map(([url, options]) => [url, options.method])).toEqual([
      ['/api/v1/projects/9/industry-assignments', 'POST'],
      ['/api/v1/projects/9/industry-assignments?page=1&pageSize=20', 'GET'],
      ['/api/v1/industry/assignments?page=1&pageSize=20', 'GET'],
      ['/api/v1/industry/assignments/7/revoke', 'POST'],
    ])
    expect(JSON.parse(fetch.mock.calls[3][1].body)).toEqual({ concurrencyToken: 'token-1' })
  })

  it('shares/unshares/downloads evidence and submits/reads feedback against the real routes', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}), blob: async () => new Blob() })
    vi.stubGlobal('fetch', fetch); localStorage.setItem('token', 'token')
    await shareIndustryEvidence(7, { concurrencyToken: 'a', deliverableVersionId: 2, fileId: 4 })
    await getIndustryEvidence(7)
    await unshareIndustryEvidence(7, 11, 'b')
    await downloadIndustryEvidenceFile(7, 11)
    await submitIndustryFeedback(7, { concurrencyToken: 'c', expectedVersion: 0, content: 'Góp ý.' })
    await getIndustryFeedbackHistory(7)
    expect(fetch.mock.calls.map(([url, options]) => [url, options.method])).toEqual([
      ['/api/v1/industry/assignments/7/evidence', 'POST'],
      ['/api/v1/industry/assignments/7/evidence?page=1&pageSize=20', 'GET'],
      ['/api/v1/industry/assignments/7/evidence/11/revoke', 'POST'],
      ['/api/v1/industry/assignments/7/evidence/11/download', 'GET'],
      ['/api/v1/industry/assignments/7/feedback', 'POST'],
      ['/api/v1/industry/assignments/7/feedback?page=1&pageSize=20', 'GET'],
    ])
    expect(JSON.parse(fetch.mock.calls[4][1].body)).toEqual({ concurrencyToken: 'c', expectedVersion: 0, content: 'Góp ý.' })
  })
})

describe('Industry Google enrollment HTTP contract', () => {
  it('requests the challenge and exchanges it against the real anonymous routes', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    vi.stubGlobal('fetch', fetch)
    await getIndustryGoogleChallenge()
    await enrollIndustryGoogle('challenge-1', 'id-token', 'a'.repeat(64))
    expect(fetch.mock.calls.map(([url, options]) => [url, options.method])).toEqual([
      ['/api/v1/auth/industry/google/challenge', 'POST'],
      ['/api/v1/auth/industry/google/enroll', 'POST'],
    ])
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ challengeId: 'challenge-1', idToken: 'id-token', invitationToken: 'a'.repeat(64) })
    // Anonymous endpoints must never trigger the authenticated-session refresh path.
    expect(fetch.mock.calls.every(([, options]) => !('Authorization' in options.headers))).toBe(true)
  })
})
