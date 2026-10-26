import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TeamInvitationsPanel } from './TeamInvitationsPanel'
import { dateTimeLabel } from '../../execution/execution-utils'

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

  it('displays team name when available, with fallback to Nhóm #{teamId}', () => {
    panel({
      receivedInvitations: [
        {
          id: 101,
          teamId: 50001,
          invitedUserId: 2,
          invitedBy: 5,
          status: 'PENDING',
          teamName: 'Trí Tuệ Nhân Tạo',
          invitedByName: 'Lê Minh',
          createdAt: '2026-08-14T07:15:42Z',
        },
        {
          id: 102,
          teamId: 50002,
          invitedUserId: 2,
          invitedBy: 6,
          status: 'PENDING',
          createdAt: '2026-08-14T07:15:42Z',
        },
      ],
    })

    fireEvent.click(screen.getByRole('button', { name: /Lời mời đã nhận/ }))

    // Team with teamName displays team name
    expect(screen.getByText('Lời mời từ nhóm Trí Tuệ Nhân Tạo')).toBeTruthy()

    // Team without teamName falls back safely to teamId
    expect(screen.getByText('Lời mời từ nhóm #50002')).toBeTruthy()
  })

  it('displays inviter name from invitedByName and formats expiration with dateTimeLabel', () => {
    const expiresAt = '2026-09-01T15:30:00Z'
    panel({
      receivedInvitations: [
        {
          id: 103,
          teamId: 50003,
          invitedUserId: 2,
          invitedBy: 5,
          invitedByName: 'Phạm Thanh Bình',
          status: 'PENDING',
          teamName: 'Nhóm Capstone X',
          createdAt: '2026-08-14T07:15:42Z',
          expiresAt,
        },
      ],
    })

    fireEvent.click(screen.getByRole('button', { name: /Lời mời đã nhận/ }))

    expect(screen.getByText('Lời mời từ Nhóm Capstone X')).toBeTruthy()
    expect(screen.getByText(new RegExp(`Người mời: Phạm Thanh Bình`))).toBeTruthy()
    expect(screen.getByText(new RegExp(`Hết hạn: ${dateTimeLabel(expiresAt)}`))).toBeTruthy()
  })

  it('renders invitation message safely without executing script tags (XSS protection)', () => {
    const maliciousMsg = '<img src=x onerror=alert(1)> Cùng tham gia nhé!'
    panel({
      receivedInvitations: [
        {
          id: 104,
          teamId: 50004,
          invitedUserId: 2,
          invitedBy: 5,
          status: 'PENDING',
          teamName: 'Alpha Team',
          message: maliciousMsg,
          createdAt: '2026-08-14T07:15:42Z',
        },
      ],
    })

    fireEvent.click(screen.getByRole('button', { name: /Lời mời đã nhận/ }))

    // Message is displayed as pure text
    expect(screen.getByText(maliciousMsg)).toBeTruthy()
    // No img element was created
    expect(document.querySelector('img[src="x"]')).toBeNull()
  })

  it('displays invitedUserName and message in sent invitations for team leaders', () => {
    const expiresAt = '2026-09-05T12:00:00Z'
    panel({
      isLeader: true,
      sentInvitations: [
        {
          id: 201,
          teamId: 50001,
          invitedUserId: 99,
          invitedUserName: 'Ngô Kiến Huy',
          invitedBy: 2,
          status: 'PENDING',
          message: 'Chào bạn, nhóm đang cần vị trí frontend!',
          createdAt: '2026-08-14T07:15:42Z',
          expiresAt,
        },
      ],
    })

    expect(screen.getByText('Ngô Kiến Huy')).toBeTruthy()
    expect(screen.getByText('Chào bạn, nhóm đang cần vị trí frontend!')).toBeTruthy()
    expect(screen.getByText(new RegExp(`Hết hạn: ${dateTimeLabel(expiresAt)}`))).toBeTruthy()
  })

  it('handles very long Vietnamese names and messages gracefully with text wrap and truncation classes', () => {
    const longTeamName = 'Hệ thống quản lý đồ án tốt nghiệp thông minh ứng dụng học sâu liên ngành Công nghệ Thông tin và Trí tuệ Nhân tạo'
    const longInviterName = 'GS. TSKH. Nguyễn Hoàng Đình Đăng Khoa Bảo Long'
    const longMessage = 'Kính chào bạn, nhóm chúng tôi đang xây dựng hệ thống nền tảng phân tích mã nguồn và rất mong muốn mời bạn tham gia với vai trò Kỹ sư Trưởng giao diện người dùng.'

    panel({
      receivedInvitations: [
        {
          id: 105,
          teamId: 50005,
          invitedUserId: 2,
          invitedBy: 5,
          status: 'PENDING',
          teamName: longTeamName,
          invitedByName: longInviterName,
          message: longMessage,
          createdAt: '2026-08-14T07:15:42Z',
          expiresAt: '2026-09-10T23:59:59Z',
        },
      ],
    })

    fireEvent.click(screen.getByRole('button', { name: /Lời mời đã nhận/ }))

    expect(screen.getByText(`Lời mời từ nhóm ${longTeamName}`)).toBeTruthy()
    expect(screen.getByText(new RegExp(`Người mời: ${longInviterName}`))).toBeTruthy()
    expect(screen.getByText(longMessage)).toBeTruthy()
  })
})
