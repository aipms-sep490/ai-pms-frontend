import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Toast } from './Toast'
afterEach(cleanup)

describe('Toast', () => {
  it('announces the message as a status region', () => {
    render(<Toast message="Đã lưu thay đổi." />)
    expect(screen.getByRole('status').textContent).toContain('Đã lưu thay đổi.')
  })

  it('defaults to the success tone', () => {
    render(<Toast message="OK" />)
    expect(screen.getByRole('status').className).toContain('bg-status-success-text')
  })

  it('switches to the error tone', () => {
    render(<Toast message="Thất bại" tone="error" />)
    expect(screen.getByRole('status').className).toContain('bg-status-error-text')
  })
})
