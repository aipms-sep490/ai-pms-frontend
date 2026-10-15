import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { InlineAlert } from './InlineAlert'
afterEach(cleanup)

describe('InlineAlert', () => {
  it('announces an error tone as alert and a success tone as status', () => {
    const { rerender } = render(<InlineAlert tone="danger">Lỗi</InlineAlert>)
    expect(screen.getByRole('alert')).toBeTruthy()
    rerender(<InlineAlert tone="success">Thành công</InlineAlert>)
    expect(screen.getByRole('status')).toBeTruthy()
  })

  it('renders an optional title and retry action', () => {
    const onRetry = vi.fn()
    render(<InlineAlert tone="danger" title="Không thể tải danh mục đề tài" onRetry={onRetry}>Chi tiết lỗi</InlineAlert>)
    expect(screen.getByText('Không thể tải danh mục đề tài')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('disables the retry action and relabels it while pending', () => {
    render(<InlineAlert tone="warning" onRetry={() => {}} retryPending>Đang tải lại</InlineAlert>)
    const button = screen.getByRole('button', { name: 'Đang tải lại…' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('accepts a ref so a freshly-appeared error can be moved into focus', () => {
    const ref = createRef<HTMLElement>()
    render(<InlineAlert ref={ref} tone="danger">Lỗi</InlineAlert>)
    ref.current?.focus()
    expect(document.activeElement).toBe(ref.current)
  })
})
