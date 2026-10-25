import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TeamInvitationsPanel } from './TeamInvitationsPanel'

const candidate = {
  userId: 9, fullName: 'Nguyễn Văn A', email: 'a@example.test', studentCode: 'SE19009', majorId: 3,
  majorCode: 'SE', majorName: 'Software Engineering', invitationStatus: 'NONE', canInvite: true,
}
const marketingCandidate = {
  userId: 10, fullName: 'Trần Thị B', email: 'b@example.test', studentCode: 'MK19010', majorId: 7,
  majorCode: 'MKT', majorName: 'Marketing', invitationStatus: 'NONE', canInvite: true,
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

  it('shows no major chips when nothing is unfilled, same as before this feature', () => {
    panel()
    expect(screen.queryByText('Tất cả ngành')).toBeNull()
  })

  it('filters the current page of candidates by the selected unfilled major without changing the server query', () => {
    const { props } = panel({
      candidates: { items: [candidate, marketingCandidate], page: 1, pageSize: 20, totalCount: 2, totalPages: 1 },
      unfilledMajors: [{ majorId: 7, majorName: 'Marketing', remaining: 2 }],
    })
    expect(screen.getByText(/Nguyễn Văn A/)).toBeTruthy()
    expect(screen.getByText(/Trần Thị B/)).toBeTruthy()

    fireEvent.click(screen.getByText('Marketing (còn thiếu 2)'))
    expect(screen.queryByText(/Nguyễn Văn A/)).toBeNull()
    expect(screen.getByText(/Trần Thị B/)).toBeTruthy()
    expect(props.onCandidateSearchChange).not.toHaveBeenCalled()
    expect(props.onCandidatePageChange).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('Tất cả ngành'))
    expect(screen.getByText(/Nguyễn Văn A/)).toBeTruthy()
  })

  it('shows a page-local empty message distinct from the no-candidates message when a major filter matches nothing on this page', () => {
    panel({ unfilledMajors: [{ majorId: 99, majorName: 'Thiết kế', remaining: 1 }] })
    fireEvent.click(screen.getByText('Thiết kế (còn thiếu 1)'))
    expect(screen.getByText('Không có ứng viên ngành này trong trang hiện tại.')).toBeTruthy()
  })

  it('displays team name, inviter name, message and formatted expiry in received invitations (FE1-F6 UX-02)', () => {
    panel({
      receivedInvitations: [
        {
          id: 101,
          teamId: 55,
          teamName: 'EcoFlow Green Tech',
          invitedUserId: 20,
          invitedBy: 15,
          invitedByName: 'Trần Minh Quang',
          status: 'PENDING',
          message: 'Chào bạn, nhóm đang cần vị trí frontend, mời bạn tham gia cùng nhé!',
          createdAt: '2026-10-20T08:30:00Z',
          expiresAt: '2026-10-27T17:00:00Z',
        },
      ],
    })

    fireEvent.click(screen.getByRole('button', { name: /Lời mời đã nhận/ }))

    expect(screen.getByText('Lời mời từ nhóm EcoFlow Green Tech')).toBeTruthy()
    expect(screen.getByText(/Người mời: Trần Minh Quang/)).toBeTruthy()
    expect(screen.getByText(/Chào bạn, nhóm đang cần vị trí frontend, mời bạn tham gia cùng nhé!/)).toBeTruthy()
    expect(screen.getByText(/Hết hạn:/)).toBeTruthy()
  })

  it('falls back to team ID when teamName is null in received invitations', () => {
    panel({
      receivedInvitations: [
        {
          id: 102,
          teamId: 99,
          teamName: null,
          invitedUserId: 20,
          invitedBy: 16,
          status: 'PENDING',
          createdAt: '2026-10-20T08:30:00Z',
        },
      ],
    })

    fireEvent.click(screen.getByRole('button', { name: /Lời mời đã nhận/ }))

    expect(screen.getByText('Lời mời từ nhóm #99')).toBeTruthy()
  })

  it('displays invitedUserName and message in sent invitations', () => {
    panel({
      sentInvitations: [
        {
          id: 201,
          teamId: 55,
          invitedUserId: 33,
          invitedUserName: 'Phạm Hồng Nhung',
          invitedBy: 15,
          invitedByName: 'Trần Minh Quang',
          status: 'PENDING',
          message: 'Mời bạn gia nhập nhóm nghiên cứu AI',
          createdAt: '2026-10-21T09:00:00Z',
        },
      ],
    })

    expect(screen.getByText('Phạm Hồng Nhung')).toBeTruthy()
    expect(screen.getByText(/Người mời: Trần Minh Quang/)).toBeTruthy()
    expect(screen.getByText(/Mời bạn gia nhập nhóm nghiên cứu AI/)).toBeTruthy()
  })
})
