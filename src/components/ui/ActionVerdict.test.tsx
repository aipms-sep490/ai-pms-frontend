import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ActionVerdict } from './ActionVerdict'

afterEach(cleanup)

describe('ActionVerdict', () => {
  it('shows the allowed verdict supplied by the backend', () => {
    render(<ActionVerdict actions={[{ code: 'APPROVE', allowed: true, reasons: [] }]} actionCode="APPROVE" status="ready" okLabel="Điều kiện hợp lệ" />)
    expect(screen.getByRole('status').textContent).toContain('Điều kiện hợp lệ')
  })

  it('lists every reason supplied for a denied action', () => {
    render(<ActionVerdict actions={[{ code: 'APPROVE', allowed: false, reasons: ['Gate 3 chưa PASSED', 'Hội đồng đã đủ'] }]} actionCode="APPROVE" status="ready" />)
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText('Gate 3 chưa PASSED')).toBeTruthy()
    expect(screen.getByText('Hội đồng đã đủ')).toBeTruthy()
  })

  it('still explains a denial without reasons', () => {
    render(<ActionVerdict actions={[{ code: 'APPROVE', allowed: false, reasons: [] }]} actionCode="APPROVE" status="ready" />)
    expect(screen.getByText(/không nêu lý do/i)).toBeTruthy()
  })

  it('has a neutral waiting state until backend actions load', () => {
    render(<ActionVerdict actions={null} actionCode="APPROVE" status="loading" />)
    expect(screen.getByRole('status')).toBeTruthy()
  })

  it('disables the primary decision with a visible reason while keeping the secondary action usable', () => {
    const approve = vi.fn()
    const reject = vi.fn()
    render(
      <ActionVerdict actions={[{ code: 'APPROVE', allowed: false, reasons: ['Thiếu minh chứng'] }]} actionCode="APPROVE" status="ready">
        <ActionVerdict.Decision
          primary={{ label: 'Duyệt yêu cầu', onClick: approve }}
          secondary={{ label: 'Từ chối', onClick: reject }}
          note={{ value: '', onChange: vi.fn() }}
        />
      </ActionVerdict>,
    )
    const primary = screen.getByRole('button', { name: 'Duyệt yêu cầu' })
    expect(primary.hasAttribute('disabled')).toBe(true)
    expect(primary.getAttribute('aria-describedby')).toBe(screen.getByRole('alert').id)
    fireEvent.click(screen.getByRole('button', { name: 'Từ chối' }))
    expect(reject).toHaveBeenCalledOnce()
    expect(approve).not.toHaveBeenCalled()
  })
})
