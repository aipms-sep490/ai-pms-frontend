import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { EligibilityBanner } from '../EligibilityBanner'

afterEach(() => {
  cleanup()
})

describe('EligibilityBanner', () => {
  it('renders eligible state when canRegister is true', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined)
    render(
      <EligibilityBanner
        eligibility={{
          canRegister: true,
          rosterLocked: false,
          reasons: [],
        }}
        onRefresh={onRefresh}
      />,
    )

    expect(screen.getByText(/Nhóm đủ điều kiện đăng ký đề tài/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /Kiểm tra lại/i })).toBeDefined()
  })

  it('renders backend rule violations when canRegister is false', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined)
    render(
      <EligibilityBanner
        eligibility={{
          canRegister: false,
          rosterLocked: false,
          reasons: ['TOO_FEW_MEMBERS', 'TEAM_MUST_BE_SINGLE_MAJOR'],
        }}
        onRefresh={onRefresh}
      />,
    )

    expect(screen.getByText(/Nhóm chưa đủ điều kiện đăng ký đề tài/i)).toBeDefined()
    expect(screen.getByText('Chưa đủ số lượng thành viên tối thiểu')).toBeDefined()
    expect(screen.getByText('Vi phạm quy chế chuyên ngành đơn ngành')).toBeDefined()

    const refreshBtn = screen.getByRole('button', { name: /Thẩm định lại/i })
    fireEvent.click(refreshBtn)
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })
})
