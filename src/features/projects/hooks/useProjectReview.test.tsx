import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  getReviewQueue: vi.fn(), getProjectForReview: vi.fn(), getReviewDetail: vi.fn(), getReviewHistory: vi.fn(), getReviewActions: vi.fn(),
  startReview: vi.fn(), decideProjectReview: vi.fn(), decideDepartment: vi.fn(),
}))
const session = { accessToken: 'token' }
vi.mock('../api/project-review-api', () => api)
vi.mock('../../auth/context/useAuthSession', () => ({ useAuthSession: () => ({ session }) }))

import { useProjectReview } from './useProjectReview'

const detail = (token = 'TOKEN_A') => ({
  concurrencyToken: token,
  academicScope: null,
  latestSubmission: { id: 8, evidence: { scope: {}, policy: {}, members: [] }, decisions: [] },
})

describe('useProjectReview', () => {
  beforeEach(() => {
    api.getReviewQueue.mockReset().mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 })
    api.getProjectForReview.mockReset().mockResolvedValue({ id: 1, code: 'P-1', title: 'Project' })
    api.getReviewDetail.mockReset().mockResolvedValue(detail())
    api.getReviewHistory.mockReset().mockResolvedValue([])
    api.getReviewActions.mockReset().mockResolvedValue({ status: 'UnderReview', actions: [
      { code: 'start_review', allowed: true, reasons: [] },
      { code: 'approve_department', allowed: true, reasons: [] },
      { code: 'approve_project', allowed: false, reasons: ['Other departments pending'] },
    ] })
    api.startReview.mockReset().mockResolvedValue({})
    api.decideProjectReview.mockReset().mockResolvedValue({})
    api.decideDepartment.mockReset().mockResolvedValue({})
  })

  it('uses backend workflow actions rather than local status to expose review controls', async () => {
    const { result } = renderHook(() => useProjectReview(1))
    await waitFor(() => expect(result.current.workflow?.status).toBe('UnderReview'))
    expect(result.current.canStart).toBe(true)
    expect(result.current.canApproveDepartment).toBe(true)
    expect(result.current.canApprove).toBe(false)
  })

  it('uses the current snapshot and concurrency token for a participating department decision', async () => {
    const { result } = renderHook(() => useProjectReview(1))
    await waitFor(() => expect(result.current.detail?.concurrencyToken).toBe('TOKEN_A'))
    await act(async () => { await result.current.decideParticipatingDepartment('APPROVED') })
    expect(api.decideDepartment).toHaveBeenCalledWith(1, {
      snapshotId: 8, concurrencyToken: 'TOKEN_A', decision: 'APPROVED', reason: undefined,
    }, 'token')
  })

  it('does not retry a 409; it refreshes authoritative state once and waits for a new user action', async () => {
    api.decideProjectReview.mockRejectedValueOnce({ status: 409 })
    const { result } = renderHook(() => useProjectReview(1))
    await waitFor(() => expect(result.current.detail?.concurrencyToken).toBe('TOKEN_A'))
    await act(async () => { expect(await result.current.decide('approve')).toBe(false) })
    expect(api.decideProjectReview).toHaveBeenCalledTimes(1)
    expect(api.getReviewDetail).toHaveBeenCalledTimes(2)
    expect(result.current.error?.kind).toBe('conflict')
  })
})
