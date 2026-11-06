import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ToggleField } from './ToggleField'

afterEach(cleanup)

describe('ToggleField', () => {
  it('always shows a textual on or off state', () => {
    const { rerender } = render(<ToggleField label="Cho phép" checked onChange={() => {}} />)
    expect(screen.getByText('ĐANG BẬT')).toBeTruthy()
    rerender(<ToggleField label="Cho phép" checked={false} onChange={() => {}} />)
    expect(screen.getByText('ĐANG TẮT')).toBeTruthy()
  })

  it('passes a toggle choice through without persisting it itself', () => {
    const onChange = vi.fn()
    render(<ToggleField label="Cho phép" description="Áp dụng cho kỳ hiện tại" checked={false} onChange={onChange} />)
    fireEvent.click(screen.getByRole('switch', { name: 'Cho phép' }))
    expect(onChange).toHaveBeenCalledWith(true)
    expect(screen.getByText('Áp dụng cho kỳ hiện tại')).toBeTruthy()
  })
})
