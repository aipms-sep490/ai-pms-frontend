import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AdminIndustryInvitationsPage } from './AdminIndustryInvitationsPage'
import { HttpError } from '../../services/http/http-client'

const mocks = vi.hoisted(() => ({
  getIndustryInvitations: vi.fn(),
  inviteIndustryExpert: vi.fn(),
  revokeIndustryInvitation: vi.fn(),
}))
vi.mock('./industry-api', async () => {
  const actual = await vi.importActual<typeof import('./industry-api')>('./industry-api')
  return { ...actual, getIndustryInvitations: mocks.getIndustryInvitations, inviteIndustryExpert: mocks.inviteIndustryExpert, revokeIndustryInvitation: mocks.revokeIndustryInvitation }
})

const page = (items: Record<string, unknown>[]) => ({ items, page: 1, pageSize: 100, totalCount: items.length })
const invitation = (over: Partial<Record<string, unknown>> = {}) => ({ id: 1, expertId: 10, email: 'expert@company.com', status: 'PENDING', expiresAt: '2026-12-01T00:00:00Z', ...over })

afterEach(() => { cleanup(); vi.resetAllMocks() })

describe('AdminIndustryInvitationsPage', () => {
  it('lists invitations with their status', async () => {
    mocks.getIndustryInvitations.mockResolvedValue(page([invitation()]))
    render(<AdminIndustryInvitationsPage />)
    expect(await screen.findByText('expert@company.com')).toBeTruthy()
    expect(screen.getByText('Chờ nhận lời mời')).toBeTruthy()
  })

  it('requires email, full name and organization before inviting', async () => {
    mocks.getIndustryInvitations.mockResolvedValue(page([]))
    render(<AdminIndustryInvitationsPage />)
    await screen.findByText('Chưa có lời mời nào.')
    fireEvent.click(screen.getByRole('button', { name: 'Gửi lời mời' }))
    expect(mocks.inviteIndustryExpert).not.toHaveBeenCalled()
  })

  it('invites an expert and refetches the list', async () => {
    mocks.getIndustryInvitations.mockResolvedValueOnce(page([])).mockResolvedValueOnce(page([invitation()]))
    mocks.inviteIndustryExpert.mockResolvedValue(invitation())
    render(<AdminIndustryInvitationsPage />)
    await screen.findByText('Chưa có lời mời nào.')
    fireEvent.change(screen.getByPlaceholderText('expert@company.com'), { target: { value: 'expert@company.com' } })
    fireEvent.change(screen.getByLabelText('Họ tên'), { target: { value: 'Nguyễn Văn A' } })
    fireEvent.change(screen.getByLabelText('Tổ chức'), { target: { value: 'Acme' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi lời mời' }))
    await waitFor(() => expect(mocks.inviteIndustryExpert).toHaveBeenCalledWith({ email: 'expert@company.com', fullName: 'Nguyễn Văn A', organization: 'Acme' }))
    expect(await screen.findByText('Đã gửi lời mời tới expert@company.com.')).toBeTruthy()
  })

  it('surfaces a clear message when the email already belongs to another identity (409)', async () => {
    mocks.getIndustryInvitations.mockResolvedValue(page([]))
    mocks.inviteIndustryExpert.mockRejectedValue(new HttpError('conflict', 409, { detail: 'Email belongs to an existing identity.' }))
    render(<AdminIndustryInvitationsPage />)
    await screen.findByText('Chưa có lời mời nào.')
    fireEvent.change(screen.getByPlaceholderText('expert@company.com'), { target: { value: 'taken@company.com' } })
    fireEvent.change(screen.getByLabelText('Họ tên'), { target: { value: 'A' } })
    fireEvent.change(screen.getByLabelText('Tổ chức'), { target: { value: 'B' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi lời mời' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Email belongs to an existing identity.')
  })

  it('only offers revoke for a PENDING invitation', async () => {
    mocks.getIndustryInvitations.mockResolvedValue(page([invitation({ status: 'CONSUMED' })]))
    render(<AdminIndustryInvitationsPage />)
    await screen.findByText('expert@company.com')
    expect(screen.queryByRole('button', { name: 'Thu hồi' })).toBeNull()
  })

  it('revokes a pending invitation and refetches', async () => {
    mocks.getIndustryInvitations.mockResolvedValueOnce(page([invitation()])).mockResolvedValueOnce(page([invitation({ status: 'REVOKED' })]))
    mocks.revokeIndustryInvitation.mockResolvedValue(invitation({ status: 'REVOKED' }))
    render(<AdminIndustryInvitationsPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Thu hồi' }))
    await waitFor(() => expect(mocks.revokeIndustryInvitation).toHaveBeenCalledWith(1))
    expect(await screen.findByText('Đã thu hồi lời mời của expert@company.com.')).toBeTruthy()
  })
})
