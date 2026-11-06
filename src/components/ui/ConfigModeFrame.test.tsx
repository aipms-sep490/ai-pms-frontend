import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { ConfigModeFrame } from './ConfigModeFrame'

vi.mock('./UnsavedChangesNotice', () => ({ UnsavedChangesNotice: () => <div data-testid="unsaved-notice" /> }))
afterEach(cleanup)

const handlers = { onEdit: vi.fn(), onCancel: vi.fn(), onSave: vi.fn() }

describe('ConfigModeFrame', () => {
  it('starts in view mode with its controls read-only', () => {
    render(<ConfigModeFrame mode="view" dirty={false} busy={false} {...handlers} blastRadius="Áp dụng cho kỳ hiện tại."><input aria-label="Giá trị" /></ConfigModeFrame>)
    expect(screen.getByText('Chế độ xem')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Chỉnh sửa' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Lưu/ })).toBeNull()
    expect(screen.getByRole('textbox', { name: 'Giá trị' }).closest('fieldset')?.hasAttribute('disabled')).toBe(true)
  })

  it('shows editing controls, unsaved protection, and the impact callout', () => {
    render(<ConfigModeFrame mode="edit" dirty busy={false} {...handlers} blastRadius="Áp dụng ngay cho mọi đồ án đang chạy."><p>Nội dung</p></ConfigModeFrame>)
    expect(screen.getByText('ĐANG CHỈNH SỬA')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Hủy thay đổi' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Lưu cấu hình' })).toBeTruthy()
    expect(screen.getByText('Áp dụng ngay cho mọi đồ án đang chạy.')).toBeTruthy()
    expect(screen.getByTestId('unsaved-notice')).toBeTruthy()
  })

  it('disables save while busy or when there is no change', () => {
    const { rerender } = render(<ConfigModeFrame mode="edit" dirty={false} busy={false} {...handlers} blastRadius="x">Nội dung</ConfigModeFrame>)
    expect(screen.getByRole('button', { name: 'Lưu cấu hình' }).hasAttribute('disabled')).toBe(true)
    rerender(<ConfigModeFrame mode="edit" dirty busy {...handlers} blastRadius="x">Nội dung</ConfigModeFrame>)
    expect(screen.getByRole('button', { name: 'Lưu cấu hình' }).hasAttribute('disabled')).toBe(true)
    rerender(<ConfigModeFrame mode="edit" dirty busy={false} {...handlers} blastRadius="x">Nội dung</ConfigModeFrame>)
    fireEvent.click(screen.getByRole('button', { name: 'Lưu cấu hình' }))
    expect(handlers.onSave).toHaveBeenCalledOnce()
  })

  it('asks before discarding unsaved changes', async () => {
    const onCancel = vi.fn()
    render(<ConfigModeFrame mode="edit" dirty busy={false} onEdit={() => {}} onCancel={onCancel} onSave={() => {}} blastRadius="x">Nội dung</ConfigModeFrame>)
    fireEvent.click(screen.getByRole('button', { name: 'Hủy thay đổi' }))
    expect(onCancel).not.toHaveBeenCalled()
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Hủy thay đổi' }))
    await waitFor(() => expect(onCancel).toHaveBeenCalledOnce())
  })
})
