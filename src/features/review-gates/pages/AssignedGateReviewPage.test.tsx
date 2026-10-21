import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AssignedGateReviewPage } from './AssignedGateReviewPage'
import { reviewGatesMockAdapter } from '../api/review-gates-mock-adapter'

describe('AssignedGateReviewPage (Cross-Role RV-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    reviewGatesMockAdapter.reset()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders assigned review queue and project details', async () => {
    render(
      <MemoryRouter>
        <AssignedGateReviewPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Hàng đợi Thẩm định (2)')).toBeTruthy()
    expect(screen.getAllByText('Campus Support Platform')[0]).toBeTruthy()
    expect(screen.getByText('Smart Library System')).toBeTruthy()
    expect(screen.getByText('Architecture & Database ERD')).toBeTruthy()
    expect(screen.getByText('Software Design Document (SDD)')).toBeTruthy()
  })

  it('allows reviewer to verify an evidence item and update status', async () => {
    render(
      <MemoryRouter>
        <AssignedGateReviewPage />
      </MemoryRouter>,
    )

    await screen.findByText('Hàng đợi Thẩm định (2)')

    // Find "✓ Duyệt đạt" buttons
    const acceptBtns = screen.getAllByRole('button', { name: '✓ Duyệt đạt' })
    fireEvent.click(acceptBtns[1]) // Accept SDD

    await waitFor(() => {
      expect(screen.getByText(/Đã cập nhật trạng thái minh chứng thành Chấp thuận/)).toBeTruthy()
    })
  })

  it('disables Gate PASS button when mandatory evidence is not accepted', async () => {
    render(
      <MemoryRouter>
        <AssignedGateReviewPage />
      </MemoryRouter>,
    )

    await screen.findByText('Hàng đợi Thẩm định (2)')

    // PASS button should be disabled because SDD is REJECTED
    const passBtn = screen.getByRole('button', { name: 'Xác nhận Gate PASS (Đạt)' }) as HTMLButtonElement
    expect(passBtn.disabled).toBe(true)
    expect(screen.getByText(/Chưa đủ điều kiện PASS/)).toBeTruthy()
  })

  it('allows Gate PASS after all mandatory evidence items are ACCEPTED', async () => {
    render(
      <MemoryRouter>
        <AssignedGateReviewPage />
      </MemoryRouter>,
    )

    await screen.findByText('Hàng đợi Thẩm định (2)')

    // Accept the second mandatory item (SDD)
    const acceptBtns = screen.getAllByRole('button', { name: '✓ Duyệt đạt' })
    fireEvent.click(acceptBtns[1])

    await waitFor(() => {
      expect(screen.getByText(/Đủ điều kiện phê duyệt PASS/)).toBeTruthy()
    })

    const passBtn = screen.getByRole('button', { name: 'Xác nhận Gate PASS (Đạt)' }) as HTMLButtonElement
    expect(passBtn.disabled).toBe(false)

    // Fill review notes and submit PASS
    const notesArea = screen.getByPlaceholderText(/Nhập chi tiết đánh giá, căn cứ quyết định/)
    fireEvent.change(notesArea, { target: { value: 'Hồ sơ thiết kế đạt yêu cầu chuẩn mực học thuật.' } })

    const submitBtn = screen.getByRole('button', { name: 'Xác nhận Gate PASS (Đạt)' })
    fireEvent.click(submitBtn)

    expect(await screen.findByText(/Đã lưu quyết định thẩm định Gate thành công/)).toBeTruthy()
  })
})
