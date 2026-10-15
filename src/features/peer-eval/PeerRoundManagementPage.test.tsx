import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PeerRoundWorkspace } from './PeerRoundManagementPage'
import { HttpError } from '../../services/http/http-client'
const api = vi.hoisted(() => ({ getPeerRounds: vi.fn(), createPeerRound: vi.fn(), closePeerRound: vi.fn(), getPeerSubmissions: vi.fn() }))
vi.mock('./peer-eval-api', () => api)
const round = { id: 4, projectId: 9, title: 'Nhìn lại tháng 10', status: 'OPEN', opensAt: '2026-10-01T00:00:00Z', closesAt: '2026-10-31T00:00:00Z', concurrencyToken: 'round-4', canManage: true, memberCount: 1, roster: [{ userId: 12, majorId: 3, fullName: 'Sinh viên trong ngành' }] }
const mount = (canCreate = true) => render(<MemoryRouter><PeerRoundWorkspace projectId={9} canCreate={canCreate} /></MemoryRouter>)
beforeEach(() => { vi.resetAllMocks(); api.getPeerRounds.mockResolvedValue({ items: [round], totalCount: 1 }); api.getPeerSubmissions.mockResolvedValue({ items: [], totalCount: 0 }) })
afterEach(cleanup)
describe('Peer round administration', () => {
  it('keeps department viewers read-only and shows only server-filtered targets', async () => {
    api.getPeerRounds.mockResolvedValue({ items: [{ ...round, canManage: false }], totalCount: 1 })
    api.getPeerSubmissions.mockResolvedValue({ items: [{ id: 1, authorId: 99, submittedAt: '2026-10-15T00:00:00Z', items: [{ targetUserId: 12, rating: 4, comment: 'Có đóng góp' }] }], totalCount: 1 })
    mount(false); await screen.findByText('Có đóng góp')
    expect(screen.queryByRole('button', { name: 'Tạo đợt đánh giá' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Đóng đợt này' })).toBeNull()
    expect(api.getPeerSubmissions).toHaveBeenCalledWith(9, 4, 1, 10, expect.any(AbortSignal))
  })
  it('closes the selected round with confirmation and its token', async () => {
    api.closePeerRound.mockResolvedValue({ ...round, status: 'CLOSED' }); mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Đóng đợt này' }))
    expect(api.closePeerRound).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: 'Đóng đợt' }))
    await waitFor(() => expect(api.closePeerRound).toHaveBeenCalledWith(9, 4, 'round-4'))
  })
  it('preserves the create form and reloads on a concurrent open round', async () => {
    api.createPeerRound.mockRejectedValue(new HttpError('PEER_ROUND_EXISTS', 409)); mount()
    await screen.findByRole('button', { name: 'Đóng đợt này' })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo đợt đánh giá' }))
    fireEvent.change(screen.getByLabelText('Tên đợt'), { target: { value: 'Đợt mới' } })
    const date = new Date(); date.setDate(date.getDate() + 1)
    const end = new Date(date); end.setDate(end.getDate() + 7)
    fireEvent.change(screen.getByLabelText('Mở lúc'), { target: { value: date.toISOString().slice(0, 16) } })
    fireEvent.change(screen.getByLabelText('Đóng lúc'), { target: { value: end.toISOString().slice(0, 16) } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu đợt đánh giá' }))
    await screen.findByRole('alert')
    expect(screen.getByDisplayValue('Đợt mới')).toBeTruthy()
    await waitFor(() => expect(api.getPeerRounds).toHaveBeenCalledTimes(2))
    expect(api.createPeerRound).toHaveBeenCalledTimes(1)
  })
})
