import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProjectWorkingAgreementPage } from './ProjectWorkingAgreementPage'
import { HttpError } from '../../services/http/http-client'

const mocks = vi.hoisted(() => ({
  journey: { project: { id: 9 } as { id: number } | null, profile: { id: 7 } as { id: number } | null },
  getWorkingAgreement: vi.fn(),
  acceptWorkingAgreement: vi.fn(),
  getMyCapabilities: vi.fn(),
}))
vi.mock('../../services/service-gateway', () => ({ services: { project: { getProject: () => Promise.resolve({ id: 9, teamId: 1, majors: [] }) }, team: { getTeam: () => Promise.resolve({ members: [{ userId: 5, fullName: 'Nguyễn Văn An' }] }) } } }))
vi.mock('../capabilities/capabilities-api', () => ({ getMyCapabilities: mocks.getMyCapabilities }))
vi.mock('../../app/context', () => ({ useStudentJourney: () => mocks.journey }))
vi.mock('./working-agreement-api', async () => {
  const actual = await vi.importActual<typeof import('./working-agreement-api')>('./working-agreement-api')
  return { ...actual, getWorkingAgreement: mocks.getWorkingAgreement, acceptWorkingAgreement: mocks.acceptWorkingAgreement }
})

const render_ = () => render(<MemoryRouter><ProjectWorkingAgreementPage /></MemoryRouter>)

const action = (code: string, allowed: boolean, reasons: string[] = []) => ({ code, allowed, reasons })

// Mirrors the real WorkingAgreementDto (AIPMS.Infrastructure/Services/Projects/WorkingAgreementService.cs):
// `actions` is backend-authoritative and always carries all three action codes.
const agreement = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 3, projectId: 9, version: 2, status: 'ACTIVE',
  contentJson: JSON.stringify({ sections: [{ title: 'Họp nhóm', body: 'Mỗi tuần một lần.' }] }),
  createdAt: '2026-10-05T03:00:00Z', concurrencyToken: 'token-v2',
  acceptances: [{ userId: 5, acceptedAt: '2026-10-06T03:00:00Z' }],
  memberCount: 3, required: true, acceptedByMe: false,
  readiness: { required: true },
  actions: [
    action('manage_working_agreement', false, ['ACTIVE_LEADER_AND_WRITABLE_PROJECT_REQUIRED']),
    action('publish_working_agreement', false, ['AGREEMENT_VERSION_NOT_ACTIONABLE']),
    action('accept_working_agreement', true),
  ],
  ...over,
})

beforeEach(() => { mocks.journey.project = { id: 9 }; mocks.journey.profile = { id: 7 }; mocks.getMyCapabilities.mockResolvedValue({ actions: [] }) })
afterEach(() => { cleanup(); vi.resetAllMocks() })

describe('ProjectWorkingAgreementPage', () => {
  it('renders parsed sections, acceptances and the incomplete banner', async () => {
    mocks.getWorkingAgreement.mockResolvedValue(agreement())
    render_()
    expect(await screen.findByText('Họp nhóm')).toBeTruthy()
    expect(screen.getByText('Mỗi tuần một lần.')).toBeTruthy()
    expect(screen.getByText('Nguyễn Văn An')).toBeTruthy()
    expect(screen.getByText(/Đã xác nhận 1\/3/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Tôi đồng ý với cam kết' })).toBeTruthy()
  })

  it('accepts the agreement with the row concurrency token and refetches', async () => {
    mocks.getWorkingAgreement
      .mockResolvedValueOnce(agreement())
      .mockResolvedValueOnce(agreement({ acceptedByMe: true, acceptances: [
        { userId: 5, acceptedAt: '2026-10-06T03:00:00Z' },
        { userId: 7, acceptedAt: '2026-10-07T03:00:00Z' },
      ] }))
    mocks.acceptWorkingAgreement.mockResolvedValue({})
    render_()
    fireEvent.click(await screen.findByRole('button', { name: 'Tôi đồng ý với cam kết' }))
    await waitFor(() => expect(mocks.acceptWorkingAgreement).toHaveBeenCalledWith(9, 3, 'token-v2'))
    expect(await screen.findByText('Bạn đã xác nhận bản cam kết này.')).toBeTruthy()
  })

  it('shows accepted state when the viewer already accepted, with no accept button', async () => {
    mocks.getWorkingAgreement.mockResolvedValue(agreement({ acceptedByMe: true }))
    render_()
    expect(await screen.findByText('Bạn đã xác nhận bản cam kết này.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Tôi đồng ý với cam kết' })).toBeNull()
  })

  it('hides the accept button and shows the backend reason when the action is not allowed', async () => {
    mocks.getWorkingAgreement.mockResolvedValue(agreement({
      acceptedByMe: false,
      actions: [action('accept_working_agreement', false, ['CURRENT_UNACCEPTED_AGREEMENT_REQUIRED'])],
    }))
    render_()
    expect(await screen.findByText(/chưa thể xác nhận cam kết này/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Tôi đồng ý với cam kết' })).toBeNull()
  })

  it('refetches on a 409 (stale token / roster changed) instead of leaving a dead retry', async () => {
    mocks.getWorkingAgreement
      .mockResolvedValueOnce(agreement())
      .mockResolvedValueOnce(agreement({ version: 3, concurrencyToken: 'token-v3' }))
    mocks.acceptWorkingAgreement.mockRejectedValue(new HttpError('stale', 409))
    render_()
    fireEvent.click(await screen.findByRole('button', { name: 'Tôi đồng ý với cam kết' }))
    expect(await screen.findByText(/vừa được cập nhật/)).toBeTruthy()
    await waitFor(() => expect(mocks.getWorkingAgreement).toHaveBeenCalledTimes(2))
  })

  it('treats a resolved null (backend 204) as no agreement yet', async () => {
    mocks.getWorkingAgreement.mockResolvedValue(null)
    render_()
    expect(await screen.findByText('Nhóm chưa có bản cam kết làm việc nào.')).toBeTruthy()
  })

  it('shows a generic retryable error on an unexpected failure (e.g. 404)', async () => {
    mocks.getWorkingAgreement.mockRejectedValue(new HttpError('not found', 404))
    render_()
    expect(await screen.findByText(/Không tìm thấy dữ liệu hoặc tính năng chưa được bật/)).toBeTruthy()
  })

  it('shows a distinct message when access is denied', async () => {
    mocks.getWorkingAgreement.mockRejectedValue(new HttpError('forbidden', 403))
    render_()
    expect((await screen.findByRole('alert')).textContent).toContain('không có quyền')
  })

  it('handles no active project', async () => {
    mocks.journey.project = null
    render_()
    expect(await screen.findByText(/Không tìm thấy đồ án để xem cam kết/)).toBeTruthy()
    expect(mocks.getWorkingAgreement).not.toHaveBeenCalled()
  })
})
