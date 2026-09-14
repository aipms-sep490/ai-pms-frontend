import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { RevisionAlert } from '../RevisionAlert'

afterEach(() => {
  cleanup()
})

describe('RevisionAlert', () => {
  it('renders revision reason, reviewer name and triggers onEdit callback', () => {
    const onEdit = vi.fn()
    render(
      <RevisionAlert
        reason="Cần bổ sung chi tiết ma trận RTM và phương pháp đánh giá thực nghiệm."
        reviewerName="Hội đồng Khoa CNTT"
        timestamp="2026-09-08T10:00:00Z"
        onEdit={onEdit}
      />,
    )

    expect(screen.getByText(/Hội đồng Bộ môn yêu cầu chỉnh sửa đề cương/)).toBeDefined()
    expect(screen.getByText(/Cần bổ sung chi tiết ma trận RTM/)).toBeDefined()
    expect(screen.getByText(/Hội đồng Khoa CNTT/)).toBeDefined()

    const editBtn = screen.getByRole('button', { name: /Sửa đề cương ngay/ })
    fireEvent.click(editBtn)
    expect(onEdit).toHaveBeenCalledTimes(1)
  })
})
