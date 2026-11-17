import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { PageLoading } from './PageLoading'

afterEach(cleanup)

describe('PageLoading Component', () => {
  it('renders with accessible role status and aria-label', () => {
    render(<PageLoading label="Đang kiểm tra bảo mật…" />)
    const status = screen.getByRole('status')
    expect(status).toBeTruthy()
    expect(status.getAttribute('aria-label')).toBe('Đang kiểm tra bảo mật…')
    expect(status.getAttribute('aria-live')).toBe('polite')
    expect(screen.getAllByText('Đang kiểm tra bảo mật…').length).toBeGreaterThanOrEqual(1)
  })

  it('renders the energetic AIPMS fox mascot asset', () => {
    const { container } = render(<PageLoading />)
    const img = container.querySelector('img.aipms-loading-mascot') as HTMLImageElement
    expect(img).toBeTruthy()
    expect(img.getAttribute('src')).toBe('/aipms-mascot.png')
  })

  it('renders the 3 animated energy dots (blue, orange, green)', () => {
    const { container } = render(<PageLoading />)
    expect(container.querySelector('.aipms-loading-dot--blue')).toBeTruthy()
    expect(container.querySelector('.aipms-loading-dot--orange')).toBeTruthy()
    expect(container.querySelector('.aipms-loading-dot--green')).toBeTruthy()
  })

  it('renders full-page bootstrap mode with default system copy', () => {
    render(<PageLoading fullPage />)
    expect(screen.getByText('Đang khởi tạo hệ thống AIPMS')).toBeTruthy()
    expect(screen.getByText('Chuẩn bị môi trường quản lý đồ án học thuật…')).toBeTruthy()
  })

  it('renders custom title and description when provided', () => {
    render(
      <PageLoading
        title="Đợi F-Research một xíu nhé!"
        description="Đang chuẩn bị không gian làm việc"
      />
    )
    expect(screen.getByText('Đợi F-Research một xíu nhé!')).toBeTruthy()
    expect(screen.getByText('Đang chuẩn bị không gian làm việc')).toBeTruthy()
  })

  it('supports inline mode with compact wrapper class', () => {
    const { container } = render(<PageLoading variant="inline" />)
    expect(container.querySelector('.aipms-loading-wrapper--inline')).toBeTruthy()
  })
})
