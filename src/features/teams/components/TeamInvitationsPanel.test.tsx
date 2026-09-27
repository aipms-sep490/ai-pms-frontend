import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TeamInvitationsPanel } from './TeamInvitationsPanel'

const candidate = {
  userId: 9, fullName: 'Nguyễn Văn A', email: 'a@example.test', studentCode: 'SE19009', majorId: 3,
  majorCode: 'SE', majorName: 'Software Engineering', invitationStatus: 'NONE', canInvite: true,
}

afterEach(cleanup)

function panel(overrides = {}) {
  const props = {
    sentInvitations: [], receivedInvitations: [], isLeader: true, rosterLocked: false,
    candidates: { items: [candidate], page: 2, pageSize: 20, totalCount: 25, totalPages: 2 },
    candidateSearch: '', candidateLoading: false, candidateError: null,
    onCandidateSearchChange: vi.fn(), onCandidatePageChange: vi.fn(), onRetryCandidates: vi.fn(),
    isMutationPending: vi.fn().mockReturnValue(false), onSendInvitation: vi.fn().mockResolvedValue(undefined),
    onCancelInvitation: vi.fn().mockResolvedValue(undefined), onAcceptInvitation: vi.fn().mockResolvedValue(undefined),
    onRejectInvitation: vi.fn().mockResolvedValue(undefined), ...overrides,
  }
  return { props, ...render(<TeamInvitationsPanel {...props} />) }
}

describe('TeamInvitationsPanel', () => {
  it('uses known member names and does not mislabel cancelled or expired invitations as rejected', () => {
    panel({ rosterLocked: true, memberNames: { 13: 'Võ Anh Duy', 9: 'Nguyễn Minh Khang' }, sentInvitations: [
      { id: 1, teamId: 2, invitedUserId: 13, invitedBy: 9, status: 'CANCELLED', createdAt: '2026-08-14T07:15:42' },
      { id: 2, teamId: 2, invitedUserId: 14, invitedBy: 9, status: 'EXPIRED', createdAt: '2026-08-15T07:15:42' },
    ] })
    expect(screen.getByText('Võ Anh Duy')).toBeTruthy()
    expect(screen.getByText('Đã hủy')).toBeTruthy()
    expect(screen.getByText('Đã hết hạn')).toBeTruthy()
    expect(screen.queryByText('Đã từ chối')).toBeNull()
    expect(screen.queryByText(/User ID|API BACKEND/)).toBeNull()
  })
  it('renders backend candidates, sends search and paging to the feature hook', () => {
    const { props } = panel()

    fireEvent.change(screen.getByPlaceholderText(/Tìm theo MSSV/), { target: { value: 'Nguyen' } })
    fireEvent.click(screen.getByText('Trước'))

    expect(screen.getByText(/Nguyễn Văn A/)).toBeTruthy()
    expect(props.onCandidateSearchChange).toHaveBeenCalledWith('Nguyen')
    expect(props.onCandidatePageChange).toHaveBeenCalledWith(1)
  })

  it('prevents duplicate invite submission while that candidate mutation is pending', () => {
    const { props } = panel({ isMutationPending: vi.fn((action: string, id?: number) => action === 'invite' && id === 9) })
    const invite = screen.getByText('Đang gửi...') as HTMLButtonElement

    expect(invite.disabled).toBe(true)
    expect(props.onSendInvitation).not.toHaveBeenCalled()
  })

  it('shows retry only for a classified candidate load error', () => {
    const { props } = panel({ candidateError: 'Bạn không có quyền xem ứng viên.' })

    fireEvent.click(screen.getByText('Thử lại'))

    expect(props.onRetryCandidates).toHaveBeenCalledOnce()
  })
})
