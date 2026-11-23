import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { KanbanBlockerPopover, UndoableToast } from './ExecutionControls'

describe('ExecutionControls (PR-P1-C)', () => {
  it('enforces >= 15 character blocker reason before enabling confirm', () => {
    const onConfirm = vi.fn()
    render(<KanbanBlockerPopover taskTitle="API Auth" onConfirm={onConfirm} onCancel={vi.fn()} />)

    const confirmBtn = screen.getByRole('button', { name: 'Xác nhận BLOCKED' }) as HTMLButtonElement
    expect(confirmBtn.disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('Lý do bị chặn'), { target: { value: 'Quá ngắn' } })
    expect(confirmBtn.disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('Lý do bị chặn'), { target: { value: 'Đang chờ Mentor duyệt schema OAuth2 mới' } })
    expect(confirmBtn.disabled).toBe(false)

    fireEvent.click(confirmBtn)
    expect(onConfirm).toHaveBeenCalledWith('Đang chờ Mentor duyệt schema OAuth2 mới')
  })

  it('triggers Undo callback within 5s toast window', () => {
    const onUndo = vi.fn()
    render(<UndoableToast message="Đã xóa công việc tạm." onUndo={onUndo} />)

    fireEvent.click(screen.getByRole('button', { name: 'Hoàn tác (5s)' }))
    expect(onUndo).toHaveBeenCalledTimes(1)
  })
})
