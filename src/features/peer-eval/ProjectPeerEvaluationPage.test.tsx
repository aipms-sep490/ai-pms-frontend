import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProjectPeerEvaluationPage } from './ProjectPeerEvaluationPage'
import { HttpError } from '../../services/http/http-client'

const mocks = vi.hoisted(() => ({
  journey: { project: { id: 9 } as { id: number } | null, profile: { id: 7 } as { id: number } | null },
  getMyPeerEvaluation: vi.fn(),
  getPeerRounds: vi.fn(),
  savePeerEvaluationDraft: vi.fn(),
  submitPeerEvaluation: vi.fn(),
}))
vi.mock('../../app/context', () => ({ useStudentJourney: () => mocks.journey }))
vi.mock('./peer-eval-api', () => ({
  getMyPeerEvaluation: mocks.getMyPeerEvaluation,
  getPeerRounds: mocks.getPeerRounds,
  savePeerEvaluationDraft: mocks.savePeerEvaluationDraft,
  submitPeerEvaluation: mocks.submitPeerEvaluation,
}))

const render_ = () => render(<MemoryRouter><ProjectPeerEvaluationPage /></MemoryRouter>)

// Mirrors PeerRoundDto (PeerEvaluationService.cs) — the roster/name source of truth is the round's
// frozen snapshot, not live team membership.
const round = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 3, projectId: 9, title: 'Review 1', status: 'OPEN', opensAt: '2026-10-01T00:00:00Z', closesAt: '2026-12-01T00:00:00Z',
  concurrencyToken: 'round-token', memberCount: 3, canManage: false, canSubmit: true, reasons: [],
  roster: [{ userId: 7, majorId: 1, fullName: 'Tôi' }, { userId: 8, majorId: 1, fullName: 'Bạn B' }, { userId: 9, majorId: 1, fullName: 'Bạn C' }],
  ...over,
})

const roundsPage = (items: Record<string, unknown>[]) => ({ items, page: 1, pageSize: 50, totalCount: items.length })

beforeEach(() => { mocks.journey.project = { id: 9 }; mocks.journey.profile = { id: 7 } })
afterEach(() => { cleanup(); vi.resetAllMocks() })

describe('ProjectPeerEvaluationPage', () => {
  it('resolves the open round and shows a form for the roster excluding the current user', async () => {
    mocks.getMyPeerEvaluation.mockResolvedValue({ roundId: 3, status: 'NOT_STARTED', submission: null })
    mocks.getPeerRounds.mockResolvedValue(roundsPage([round()]))
    render_()
    expect(await screen.findByText('Bạn B')).toBeTruthy()
    expect(screen.getByText('Bạn C')).toBeTruthy()
    expect(screen.queryByText('Tôi')).toBeNull()
  })

  it('shows an explicit empty state when there is no open round, without guessing one', async () => {
    mocks.getMyPeerEvaluation.mockResolvedValue({ roundId: null, status: 'NO_OPEN_ROUND', submission: null })
    render_()
    expect(await screen.findByText('Hiện không có đợt đánh giá đồng đội nào đang mở.')).toBeTruthy()
    expect(mocks.getPeerRounds).not.toHaveBeenCalled()
  })

  it('resumes a saved draft, pre-filling existing ratings', async () => {
    mocks.getMyPeerEvaluation.mockResolvedValue({
      roundId: 3, status: 'DRAFT',
      submission: { id: 1, roundId: 3, authorId: 7, status: 'DRAFT', concurrencyToken: 'draft-token', updatedAt: '2026-10-05T00:00:00Z', submittedAt: null,
        items: [{ targetUserId: 8, rating: 4, comment: 'Tốt' }] },
    })
    mocks.getPeerRounds.mockResolvedValue(roundsPage([round()]))
    render_()
    await screen.findByText('Bạn B')
    const activeButtons = screen.getAllByRole('button', { pressed: true })
    expect(activeButtons.some(button => button.textContent === '4 · Tốt')).toBe(true)
  })

  it('requires every roster member rated before submitting', async () => {
    mocks.getMyPeerEvaluation.mockResolvedValue({ roundId: 3, status: 'NOT_STARTED', submission: null })
    mocks.getPeerRounds.mockResolvedValue(roundsPage([round()]))
    render_()
    await screen.findByText('Bạn B')
    fireEvent.click(screen.getByRole('button', { name: 'Gửi đánh giá' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(mocks.savePeerEvaluationDraft).not.toHaveBeenCalled()
  })

  it('submits by saving the draft then submitting with the returned token, and refetches', async () => {
    mocks.getMyPeerEvaluation
      .mockResolvedValueOnce({ roundId: 3, status: 'NOT_STARTED', submission: null })
      .mockResolvedValueOnce({
        roundId: 3, status: 'SUBMITTED',
        submission: { id: 1, roundId: 3, authorId: 7, status: 'SUBMITTED', concurrencyToken: 'final-token', updatedAt: '2026-10-05T00:00:00Z', submittedAt: '2026-10-05T00:00:00Z',
          items: [{ targetUserId: 8, rating: 4 }, { targetUserId: 9, rating: 5 }] },
      })
    mocks.getPeerRounds.mockResolvedValue(roundsPage([round()]))
    mocks.savePeerEvaluationDraft.mockResolvedValue({ id: 1, roundId: 3, authorId: 7, status: 'DRAFT', concurrencyToken: 'draft-token-2', updatedAt: '', submittedAt: null, items: [] })
    mocks.submitPeerEvaluation.mockResolvedValue({ id: 1, roundId: 3, authorId: 7, status: 'SUBMITTED', concurrencyToken: 'final-token', updatedAt: '', submittedAt: '', items: [] })
    render_()
    await screen.findByText('Bạn B')
    fireEvent.click(screen.getAllByRole('button', { name: '4 · Tốt' })[0])
    fireEvent.click(screen.getAllByRole('button', { name: '5 · Rất tốt' })[1])
    fireEvent.click(screen.getByRole('button', { name: 'Gửi đánh giá' }))
    await waitFor(() => expect(mocks.savePeerEvaluationDraft).toHaveBeenCalledWith(9, 3, [
      { targetUserId: 8, rating: 4, comment: undefined },
      { targetUserId: 9, rating: 5, comment: undefined },
    ], undefined))
    await waitFor(() => expect(mocks.submitPeerEvaluation).toHaveBeenCalledWith(9, 3, 'draft-token-2'))
    expect(await screen.findByText(/Bạn đã gửi đánh giá đồng đội/)).toBeTruthy()
  })

  it('saves a partial draft without requiring every member rated', async () => {
    mocks.getMyPeerEvaluation.mockResolvedValue({ roundId: 3, status: 'NOT_STARTED', submission: null })
    mocks.getPeerRounds.mockResolvedValue(roundsPage([round()]))
    mocks.savePeerEvaluationDraft.mockResolvedValue({ id: 1, roundId: 3, authorId: 7, status: 'DRAFT', concurrencyToken: 'draft-token', updatedAt: '', submittedAt: null, items: [] })
    render_()
    await screen.findByText('Bạn B')
    fireEvent.click(screen.getAllByRole('button', { name: '4 · Tốt' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Lưu nháp' }))
    await waitFor(() => expect(mocks.savePeerEvaluationDraft).toHaveBeenCalledWith(9, 3, [{ targetUserId: 8, rating: 4, comment: undefined }], undefined))
    expect(mocks.submitPeerEvaluation).not.toHaveBeenCalled()
  })

  it('shows the backend reason and disables the form when the round blocks submission', async () => {
    mocks.getMyPeerEvaluation.mockResolvedValue({ roundId: 3, status: 'NOT_STARTED', submission: null })
    mocks.getPeerRounds.mockResolvedValue(roundsPage([round({ canSubmit: false, reasons: ['PEER_ROSTER_CHANGED'] })]))
    render_()
    expect(await screen.findByText(/Danh sách nhóm vừa thay đổi/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Gửi đánh giá' })).toBeNull()
  })

  it('shows a distinct message when access is denied', async () => {
    mocks.getMyPeerEvaluation.mockRejectedValue(new HttpError('forbidden', 403))
    render_()
    expect((await screen.findByRole('alert')).textContent).toContain('chưa có quyền')
  })

  it('handles no active project', async () => {
    mocks.journey.project = null
    render_()
    expect(await screen.findByText(/Không tìm thấy đồ án đang hoạt động/)).toBeTruthy()
    expect(mocks.getMyPeerEvaluation).not.toHaveBeenCalled()
  })
})
