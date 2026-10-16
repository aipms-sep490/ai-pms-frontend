import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StudentReviewTimelinePage } from './StudentReviewTimelinePage'
import { reviewGatesMockAdapter } from '../api/review-gates-mock-adapter'

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

  it('allows leader to open submission modal and submit SDD revision', async () => {
    render(
      <MemoryRouter>
        <StudentReviewTimelinePage />
      </MemoryRouter>,
    )

    await screen.findByText('Campus Support Platform')

    // Find the "Nộp bản sửa" button for rejected SDD
    const submitRevisionBtn = screen.getByRole('button', { name: 'Nộp bản sửa' })
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
      <MemoryRouter>
        <StudentReviewTimelinePage />
      </MemoryRouter>,
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
})
