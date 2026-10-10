import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProjectGatesPage } from './ProjectGatesPage'
import { HttpError } from '../../services/http/http-client'

const mocks = vi.hoisted(() => ({ journey: { project: { id: 9 } as { id: number } | null }, getProjectCheckpoints: vi.fn() }))
vi.mock('../../app/context', () => ({ useStudentJourney: () => mocks.journey }))
vi.mock('./gates-api', () => ({ getProjectCheckpoints: mocks.getProjectCheckpoints }))

const render_ = () => render(<MemoryRouter><ProjectGatesPage /></MemoryRouter>)

beforeEach(() => { mocks.journey.project = { id: 9 } })
afterEach(() => { cleanup(); vi.resetAllMocks() })

describe('ProjectGatesPage', () => {
  it('lists gates with status, required flag and review history', async () => {
    mocks.getProjectCheckpoints.mockResolvedValue([
      { id: 1, projectId: 9, gateCode: 'G1', title: 'Chốt đề cương', isRequired: true, dueAt: '2026-10-20T00:00:00Z', status: 'PASSED', reviews: [{ id: 5, checkpointId: 1, reviewerId: 3, reviewerName: 'GV Minh', decision: 'PASSED', reason: 'Đạt yêu cầu', decidedAt: '2026-10-18T00:00:00Z' }] },
      { id: 2, projectId: 9, gateCode: 'G2', title: 'Giữa kỳ', isRequired: false, dueAt: null, status: 'MISSED' },
    ])
    render_()
    expect(await screen.findByText('Chốt đề cương')).toBeTruthy()
    expect(screen.getByText('Đạt')).toBeTruthy()
    expect(screen.getByText('Quá hạn')).toBeTruthy()
    expect(screen.getByText('Bắt buộc')).toBeTruthy()
    expect(screen.getByText('Theo dõi')).toBeTruthy()
    expect(screen.getByText('GV Minh')).toBeTruthy()
    expect(screen.getByText('Đạt yêu cầu')).toBeTruthy()
  })

  it('shows an empty state when the period declared no gates', async () => {
    mocks.getProjectCheckpoints.mockResolvedValue([])
    render_()
    expect(await screen.findByText('Kỳ đồ án chưa khai báo cổng kiểm soát nào.')).toBeTruthy()
  })

  it('surfaces an error and retries', async () => {
    mocks.getProjectCheckpoints.mockRejectedValueOnce(new HttpError('nope', 500)).mockResolvedValueOnce([])
    render_()
    expect((await screen.findByRole('alert')).textContent).toContain('Chưa tải được')
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }))
    expect(await screen.findByText('Kỳ đồ án chưa khai báo cổng kiểm soát nào.')).toBeTruthy()
  })

  it('shows a distinct message when access is denied', async () => {
    mocks.getProjectCheckpoints.mockRejectedValue(new HttpError('forbidden', 403))
    render_()
    expect((await screen.findByRole('alert')).textContent).toContain('chưa có quyền')
  })

  it('handles no active project', async () => {
    mocks.journey.project = null
    render_()
    expect(await screen.findByText(/Không tìm thấy đồ án đang hoạt động/)).toBeTruthy()
    expect(mocks.getProjectCheckpoints).not.toHaveBeenCalled()
  })
})
