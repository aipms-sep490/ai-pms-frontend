import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StudentReviewTimelinePage } from './StudentReviewTimelinePage'
import { reviewGatesMockAdapter } from '../api/review-gates-mock-adapter'
import { AuthSessionContext } from '../../auth/context/auth-session-context'

const mockLeaderContext = {
  session: {
    user: {
      id: 'stu-1',
      fullName: 'Nguyen Van A (Leader)',
      email: 'leader@university.edu.vn',
      roles: ['STUDENT_LEADER'],
    },
    token: 'test-token',
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  },
  status: 'authenticated' as const,
  error: null,
  login: vi.fn(),
  logout: vi.fn(),
  refreshProfile: vi.fn(),
  restoreSession: vi.fn(),
}

describe('StudentReviewTimelinePage (Cross-Role ST-01 & ST-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    reviewGatesMockAdapter.reset()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders student timeline with R1..R4 gates and active R2 details', async () => {
    render(
      <MemoryRouter>
        <StudentReviewTimelinePage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Campus Support Platform')).toBeTruthy()
    expect(screen.getByText('Chính sách: v1.0 (Đã ban hành)')).toBeTruthy()
    expect(screen.getAllByText(/Requirement & Analysis/)[0]).toBeTruthy()
    expect(screen.getAllByText(/System Design & Prototype/)[0]).toBeTruthy()
    expect(screen.getByText('Architecture & Database ERD')).toBeTruthy()
    expect(screen.getByText('Software Design Document (SDD)')).toBeTruthy()
  })

  it('denies submission capability by default when unauthenticated (deny-by-default)', async () => {
    render(
      <MemoryRouter>
        <StudentReviewTimelinePage />
      </MemoryRouter>,
    )

    await screen.findByText('Campus Support Platform')

    // Deny by default: actions are disabled for non-leaders without session
    const actionBtns = screen.getAllByRole('button', { name: /Nộp bản sửa|Nộp lại|Nộp tài liệu/ })
    actionBtns.forEach((btn) => {
      expect((btn as HTMLButtonElement).disabled).toBe(true)
    })
    expect(screen.getByText(/Chưa phát hiện phiên làm việc sinh viên hợp lệ/)).toBeTruthy()
  })

  it('allows leader to open submission modal and submit SDD revision', async () => {
    render(
      <AuthSessionContext.Provider value={mockLeaderContext as any}>
        <MemoryRouter>
          <StudentReviewTimelinePage />
        </MemoryRouter>
      </AuthSessionContext.Provider>,
    )

    await screen.findByText('Campus Support Platform')

    // Find the "Nộp bản sửa" button for rejected SDD
    const submitRevisionBtn = within(screen.getByRole('row', { name: /Software Design Document \(SDD\)/ })).getByRole('button', { name: 'Nộp bản sửa' })
    fireEvent.click(submitRevisionBtn)

    // Modal opens
    expect(await screen.findByText(/Nộp bản sửa đổi · R2-SDD/)).toBeTruthy()
    expect(screen.getByText(/v3 \(Bản mới\)/)).toBeTruthy()

    // Fill form
    const artifactInput = screen.getByPlaceholderText(/Ví dụ: SDD_v3.pdf/)
    const notesInput = screen.getByPlaceholderText(/Mô tả cụ thể những điểm đã chỉnh sửa/)

    fireEvent.change(artifactInput, { target: { value: 'SDD_v3_Final.pdf' } })
    fireEvent.change(notesInput, { target: { value: 'Đã bổ sung component boundaries và sequence diagrams' } })

    const confirmBtn = screen.getByRole('button', { name: 'Xác nhận nộp bản sửa' })
    fireEvent.click(confirmBtn)

    // Modal closes and table reflects SUBMITTED
    await waitFor(() => {
      expect(screen.getByText(/SDD_v3_Final.pdf/)).toBeTruthy()
    })
  })

  it('blocks member from submitting project-level gate review', async () => {
    render(
      <AuthSessionContext.Provider value={mockLeaderContext as any}>
        <MemoryRouter>
          <StudentReviewTimelinePage />
        </MemoryRouter>
      </AuthSessionContext.Provider>,
    )

    await screen.findByText('Campus Support Platform')

    // Toggle role to member
    const toggleRoleBtn = screen.getByRole('button', { name: '⇄ Đổi vai trò kiểm thử' })
    fireEvent.click(toggleRoleBtn)

    expect(screen.getByText(/Bạn đang xem với vai trò Thành viên \(Student Member\)/)).toBeTruthy()

    // Action button is disabled for member
    const actionBtns = screen.getAllByRole('button', { name: /Nộp bản sửa|Nộp lại|Nộp tài liệu/ })
    actionBtns.forEach((btn) => {
      expect((btn as HTMLButtonElement).disabled).toBe(true)
    })
  })

  it('displays error alert when revision submission encounters concurrency conflict (409)', async () => {
    vi.spyOn(reviewGatesMockAdapter, 'submitRevision').mockRejectedValueOnce(
      new Error('409: Phiên bản minh chứng đã thay đổi bởi thành viên khác. Vui lòng tải lại trang.'),
    )

    render(
      <AuthSessionContext.Provider value={mockLeaderContext as any}>
        <MemoryRouter>
          <StudentReviewTimelinePage />
        </MemoryRouter>
      </AuthSessionContext.Provider>,
    )

    await screen.findByText('Campus Support Platform')

    const submitRevisionBtn = within(screen.getByRole('row', { name: /Software Design Document \(SDD\)/ })).getByRole('button', { name: 'Nộp bản sửa' })
    fireEvent.click(submitRevisionBtn)

    const artifactInput = screen.getByPlaceholderText(/Ví dụ: SDD_v3.pdf/)
    const notesInput = screen.getByPlaceholderText(/Mô tả cụ thể những điểm đã chỉnh sửa/)
    fireEvent.change(artifactInput, { target: { value: 'SDD_v3_Conflict.pdf' } })
    fireEvent.change(notesInput, { target: { value: 'Ghi chú thử nghiệm conflict' } })

    const confirmBtn = screen.getByRole('button', { name: 'Xác nhận nộp bản sửa' })
    fireEvent.click(confirmBtn)

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByText(/409: Phiên bản minh chứng đã thay đổi/)).toBeTruthy()
  })

  it('allows supervisor to submit guidance feedback for active gate', async () => {
    const mockLecturerContext = {
      session: {
        user: {
          id: 'lec-1',
          fullName: 'Dr. Nguyen Van Giang',
          email: 'giang@university.edu.vn',
          roles: ['LECTURER'],
        },
        token: 'test-token',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      },
      status: 'authenticated' as const,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
      restoreSession: vi.fn(),
    }

    render(
      <AuthSessionContext.Provider value={mockLecturerContext as any}>
        <MemoryRouter>
          <StudentReviewTimelinePage />
        </MemoryRouter>
      </AuthSessionContext.Provider>,
    )

    await screen.findByText('Campus Support Platform')

    expect(screen.getByText('Giám sát Học vụ (Supervision)')).toBeTruthy()

    const feedbackInput = screen.getByPlaceholderText(/Ví dụ: Cần rà soát tính nhất quán/)
    fireEvent.change(feedbackInput, { target: { value: 'Nhóm cần hoàn thiện sơ đồ luồng dữ liệu trước thứ 6.' } })

    const sendBtn = screen.getByRole('button', { name: 'Gửi nhận xét hướng dẫn' })
    const form = sendBtn.closest('form')!
    fireEvent.submit(form)

    expect(await screen.findByText(/Đã gửi nhận xét hướng dẫn cho nhóm sinh viên thành công/)).toBeTruthy()
  })

  it('rejects files larger than 20MB in submission modal', async () => {
    render(
      <AuthSessionContext.Provider value={mockLeaderContext as any}>
        <MemoryRouter>
          <StudentReviewTimelinePage />
        </MemoryRouter>
      </AuthSessionContext.Provider>,
    )

    await screen.findByText('Campus Support Platform')

    const submitRevisionBtn = within(screen.getByRole('row', { name: /Software Design Document \(SDD\)/ })).getByRole('button', { name: 'Nộp bản sửa' })
    fireEvent.click(submitRevisionBtn)

    const dropArea = screen.getByText(/Kéo thả tệp minh chứng vào đây/)
    const oversizedFile = new File(['x'.repeat(100)], 'huge-file.pdf', { type: 'application/pdf' })
    Object.defineProperty(oversizedFile, 'size', { value: 25 * 1024 * 1024 })

    fireEvent.drop(dropArea, { dataTransfer: { files: [oversizedFile] } })

    expect(await screen.findByText(/Tệp vượt quá dung lượng tối đa cho phép \(20MB\)/)).toBeTruthy()
  })
})
