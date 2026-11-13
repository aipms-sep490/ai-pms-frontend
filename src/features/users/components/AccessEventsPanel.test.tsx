import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AccessEventsPanel } from './AccessEventsPanel'
import { HttpError } from '../../../services/http/http-client'

const mocks = vi.hoisted(() => ({ getAccessEvents: vi.fn() }))
vi.mock('../api/admin-api', () => ({ getAccessEvents: mocks.getAccessEvents }))
vi.mock('../../auth/context/useAuthSession', () => ({ useAuthSession: () => ({ session: { accessToken: 'admin-token' } }) }))

const event = { id: 11, userId: 7, fullName: 'Nguyễn Minh', email: 'minh@example.test', eventType: 'LOGIN', authenticationMethod: 'GOOGLE', outcome: 'SUCCESS', ipAddress: '192.0.2.1', occurredAt: '2026-11-13T08:30:00Z' }

beforeEach(() => {
  vi.resetAllMocks()
  mocks.getAccessEvents.mockResolvedValue({ items: [event], page: 1, pageSize: 20, totalCount: 21 })
})
afterEach(cleanup)

describe('AccessEventsPanel', () => {
  it('shows recorded access without claiming online presence or a geographic location', async () => {
    render(<MemoryRouter initialEntries={['/admin/access?tab=access']}><AccessEventsPanel /></MemoryRouter>)
    expect(await screen.findByText('Nguyễn Minh')).toBeTruthy()
    expect(screen.getByText('Google')).toBeTruthy()
    expect(screen.getByText('192.0.2.1')).toBeTruthy()
    expect(screen.getByText(/13\/11\/2026/)).toBeTruthy()
    expect(screen.getByText(/không chứng minh người dùng đang trực tuyến/)).toBeTruthy()
    expect(screen.queryByText(/đang online/i)).toBeNull()
  })

  it('converts local date filters to UTC and paginates on the server', async () => {
    render(<MemoryRouter initialEntries={['/admin/access?tab=access&accessSearch=Minh&accessEvent=LOGIN&accessOutcome=FAILURE&accessFrom=2026-11-01&accessTo=2026-11-13']}><AccessEventsPanel /></MemoryRouter>)
    await waitFor(() => expect(mocks.getAccessEvents).toHaveBeenCalledWith('admin-token', expect.objectContaining({
      search: 'Minh', eventType: 'LOGIN', outcome: 'FAILURE', fromUtc: '2026-10-31T17:00:00.000Z', toUtc: '2026-11-13T16:59:59.999Z', page: 1,
    }), expect.any(AbortSignal)))
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
    await waitFor(() => expect(mocks.getAccessEvents).toHaveBeenCalledWith('admin-token', expect.objectContaining({ page: 2 }), expect.any(AbortSignal)))
  })

  it('shows a separate failure and retry for the access region', async () => {
    mocks.getAccessEvents.mockRejectedValueOnce(new Error('unavailable'))
    render(<MemoryRouter><AccessEventsPanel /></MemoryRouter>)
    expect(await screen.findByText('Chưa tải được nhật ký truy cập.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByText('Nguyễn Minh')).toBeTruthy()
  })

  it('rejects a reversed date range before sending a request', async () => {
    render(<MemoryRouter initialEntries={['/admin/access?tab=access&accessFrom=2026-11-14&accessTo=2026-11-13']}><AccessEventsPanel /></MemoryRouter>)
    expect(await screen.findByText('Từ ngày phải trước hoặc trùng đến ngày.')).toBeTruthy()
    expect(mocks.getAccessEvents).not.toHaveBeenCalled()
  })

  it('explains a forbidden access response without showing stale entries', async () => {
    mocks.getAccessEvents.mockRejectedValue(new HttpError('Forbidden', 403))
    render(<MemoryRouter><AccessEventsPanel /></MemoryRouter>)
    expect(await screen.findByText('Bạn không có quyền xem nhật ký truy cập.')).toBeTruthy()
    expect(screen.queryByText('Nguyễn Minh')).toBeNull()
  })
})
