import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProjectPeerEvaluationPage } from './ProjectPeerEvaluationPage'
import { HttpError } from '../../services/http/http-client'

const mocks = vi.hoisted(() => ({
  journey: {
    project: { id: 9 } as { id: number } | null,
    profile: { id: 7 } as { id: number } | null,
    team: { members: [
      { userId: 7, fullName: 'Tôi' },
      { userId: 8, fullName: 'Bạn B' },
      { userId: 9, fullName: 'Bạn C' },
    ] } as { members: { userId: number; fullName: string }[] } | null,
  },
  getMyPeerEvaluations: vi.fn(),
  submitPeerEvaluations: vi.fn(),
}))
vi.mock('../../app/context', () => ({ useStudentJourney: () => mocks.journey }))
vi.mock('./peer-eval-api', () => ({ getMyPeerEvaluations: mocks.getMyPeerEvaluations, submitPeerEvaluations: mocks.submitPeerEvaluations }))

const render_ = () => render(<MemoryRouter><ProjectPeerEvaluationPage /></MemoryRouter>)

beforeEach(() => {
  mocks.journey.project = { id: 9 }; mocks.journey.profile = { id: 7 }
  mocks.journey.team = { members: [{ userId: 7, fullName: 'Tôi' }, { userId: 8, fullName: 'Bạn B' }, { userId: 9, fullName: 'Bạn C' }] }
})
afterEach(() => { cleanup(); vi.resetAllMocks() })

describe('ProjectPeerEvaluationPage', () => {
  it('shows a form for teammates excluding the current user', async () => {
    mocks.getMyPeerEvaluations.mockResolvedValue({ submitted: false, items: [] })
    render_()
    expect(await screen.findByText('Bạn B')).toBeTruthy()
    expect(screen.getByText('Bạn C')).toBeTruthy()
    expect(screen.queryByText('Tôi')).toBeNull()
  })

  it('requires every teammate rated before submitting', async () => {
    mocks.getMyPeerEvaluations.mockResolvedValue({ submitted: false, items: [] })
    render_()
    await screen.findByText('Bạn B')
    fireEvent.click(screen.getByRole('button', { name: 'Gửi đánh giá' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(mocks.submitPeerEvaluations).not.toHaveBeenCalled()
  })

  it('submits ratings for all teammates and refetches', async () => {
    mocks.getMyPeerEvaluations
      .mockResolvedValueOnce({ submitted: false, items: [] })
      .mockResolvedValueOnce({ submitted: true, items: [
        { evaluateeUserId: 8, evaluateeName: 'Bạn B', rating: 4 },
        { evaluateeUserId: 9, evaluateeName: 'Bạn C', rating: 5 },
      ] })
    mocks.submitPeerEvaluations.mockResolvedValue({ submitted: true, items: [] })
    render_()
    await screen.findByText('Bạn B')
    fireEvent.click(screen.getAllByRole('button', { name: '4 · Tốt' })[0])
    fireEvent.click(screen.getAllByRole('button', { name: '5 · Rất tốt' })[1])
    fireEvent.click(screen.getByRole('button', { name: 'Gửi đánh giá' }))
    await waitFor(() => expect(mocks.submitPeerEvaluations).toHaveBeenCalledWith(9, [
      { evaluateeUserId: 8, rating: 4, comment: undefined },
      { evaluateeUserId: 9, rating: 5, comment: undefined },
    ]))
    expect(await screen.findByText('Bạn đã gửi đánh giá đồng đội.')).toBeTruthy()
  })

  it('treats a 404 as not submitted', async () => {
    mocks.getMyPeerEvaluations.mockRejectedValue(new HttpError('none', 404))
    render_()
    expect(await screen.findByText('Bạn B')).toBeTruthy()
  })

  it('handles no active project', async () => {
    mocks.journey.project = null
    render_()
    expect(await screen.findByText(/Không tìm thấy đồ án đang hoạt động/)).toBeTruthy()
    expect(mocks.getMyPeerEvaluations).not.toHaveBeenCalled()
  })
})
