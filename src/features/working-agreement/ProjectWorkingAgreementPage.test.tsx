import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProjectWorkingAgreementPage } from './ProjectWorkingAgreementPage'
import { HttpError } from '../../services/http/http-client'

const mocks = vi.hoisted(() => ({
  journey: { project: { id: 9 } as { id: number } | null, profile: { id: 7 } as { id: number } | null },
  getWorkingAgreement: vi.fn(),
  acceptWorkingAgreement: vi.fn(),
}))
vi.mock('../../app/context', () => ({ useStudentJourney: () => mocks.journey }))
vi.mock('./working-agreement-api', async () => {
  const actual = await vi.importActual<typeof import('./working-agreement-api')>('./working-agreement-api')
  return { ...actual, getWorkingAgreement: mocks.getWorkingAgreement, acceptWorkingAgreement: mocks.acceptWorkingAgreement }
})

const render_ = () => render(<MemoryRouter><ProjectWorkingAgreementPage /></MemoryRouter>)

const agreement = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 3, projectId: 9, version: 2, status: 'ACTIVE',
  contentJson: JSON.stringify({ sections: [{ title: 'Họp nhóm', body: 'Mỗi tuần một lần.' }] }),
  createdAt: '2026-10-05T03:00:00Z', createdByName: 'Nhóm trưởng',
  acceptances: [{ userId: 5, userName: 'Bạn A', acceptedAt: '2026-10-06T03:00:00Z' }],
  memberCount: 3, required: true, ...over,
})

beforeEach(() => { mocks.journey.project = { id: 9 }; mocks.journey.profile = { id: 7 } })
afterEach(() => { cleanup(); vi.resetAllMocks() })

describe('ProjectWorkingAgreementPage', () => {
  it('renders parsed sections, acceptances and the incomplete banner', async () => {
    mocks.getWorkingAgreement.mockResolvedValue(agreement())
    render_()
    expect(await screen.findByText('Họp nhóm')).toBeTruthy()
    expect(screen.getByText('Mỗi tuần một lần.')).toBeTruthy()
    expect(screen.getByText('Bạn A')).toBeTruthy()
    expect(screen.getByText(/Đã xác nhận 1\/3/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Tôi đồng ý với cam kết' })).toBeTruthy()
  })

  it('accepts the agreement and refetches', async () => {
    mocks.getWorkingAgreement
      .mockResolvedValueOnce(agreement())
      .mockResolvedValueOnce(agreement({ acceptances: [
        { userId: 5, userName: 'Bạn A', acceptedAt: '2026-10-06T03:00:00Z' },
        { userId: 7, userName: 'Tôi', acceptedAt: '2026-10-07T03:00:00Z' },
      ] }))
    mocks.acceptWorkingAgreement.mockResolvedValue({})
    render_()
    fireEvent.click(await screen.findByRole('button', { name: 'Tôi đồng ý với cam kết' }))
    await waitFor(() => expect(mocks.acceptWorkingAgreement).toHaveBeenCalledWith(9, 3))
    expect(await screen.findByText('Bạn đã xác nhận bản cam kết này.')).toBeTruthy()
  })

  it('shows accepted state when the viewer already accepted', async () => {
    mocks.getWorkingAgreement.mockResolvedValue(agreement({ acceptedByMe: true }))
    render_()
    expect(await screen.findByText('Bạn đã xác nhận bản cam kết này.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Tôi đồng ý với cam kết' })).toBeNull()
  })

  it('treats a 404 as no agreement yet', async () => {
    mocks.getWorkingAgreement.mockRejectedValue(new HttpError('none', 404))
    render_()
    expect(await screen.findByText('Nhóm chưa có bản cam kết làm việc nào.')).toBeTruthy()
  })

  it('shows a distinct message when access is denied', async () => {
    mocks.getWorkingAgreement.mockRejectedValue(new HttpError('forbidden', 403))
    render_()
    expect((await screen.findByRole('alert')).textContent).toContain('chưa có quyền')
  })

  it('handles no active project', async () => {
    mocks.journey.project = null
    render_()
    expect(await screen.findByText(/Không tìm thấy đồ án đang hoạt động/)).toBeTruthy()
    expect(mocks.getWorkingAgreement).not.toHaveBeenCalled()
  })
})
