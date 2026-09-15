import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TeamInvitationsPanel } from './TeamInvitationsPanel'

const candidate = {
  userId: 9, fullName: 'Nguyễn Văn A', email: 'a@example.test', studentCode: 'SE19009', majorId: 3,
  majorCode: 'SE', majorName: 'Software Engineering', invitationStatus: 'NONE', canInvite: true,
}

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
