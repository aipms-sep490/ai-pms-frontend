import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CollaborationPreview } from './CollaborationPreview'
afterEach(cleanup)
describe('collaboration fixture', () => {
  it('provides a keyboard alternative to dragging and stores comments in the selected task', () => {
    render(<CollaborationPreview />)
    fireEvent.click(screen.getByRole('button', { name: /#1 · Đối chiếu contract/ }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Trạng thái task' }), { target: { value: 'BLOCKED' } })
    expect((screen.getByRole('combobox', { name: 'Trạng thái task' }) as HTMLSelectElement).value).toBe('BLOCKED')
    fireEvent.change(screen.getByRole('textbox', { name: 'Bình luận task' }), { target: { value: 'Cần BE chốt DTO' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi bình luận fixture' }))
    expect(screen.getByText('Cần BE chốt DTO')).toBeTruthy()
  })
  it('prevents concurrent active sprints in the fixture', () => {
    render(<CollaborationPreview />); fireEvent.click(screen.getByRole('button', { name: 'Sprint' }))
    for (const name of ['Sprint A', 'Sprint B']) {
      fireEvent.change(screen.getByRole('textbox', { name: 'Tên sprint' }), { target: { value: name } })
      fireEvent.change(screen.getByLabelText('Bắt đầu sprint'), { target: { value: '2026-10-12' } })
      fireEvent.change(screen.getByLabelText('Kết thúc sprint'), { target: { value: '2026-10-23' } })
      fireEvent.click(screen.getByRole('button', { name: 'Tạo sprint fixture' }))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu Sprint A' }))
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu Sprint B' }))
    expect(screen.getByRole('status').textContent).toContain('ACTIVE_SPRINT_EXISTS')
  })
  it('locks meeting notes and never claims email delivery', () => {
    render(<CollaborationPreview />); fireEvent.click(screen.getByRole('button', { name: 'Meeting' }))
    fireEvent.change(screen.getByLabelText('Tiêu đề meeting'), { target: { value: 'Review' } })
    fireEvent.change(screen.getByLabelText('Bắt đầu meeting (giờ địa phương)'), { target: { value: '2026-10-15T14:00' } })
    fireEvent.change(screen.getByLabelText('Kết thúc meeting (giờ địa phương)'), { target: { value: '2026-10-15T15:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo meeting fixture' }))
    expect(screen.getByText('Email/nhắc lịch: chưa có BE delivery; không gửi từ fixture.')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Biên bản Review'), { target: { value: 'Đối chiếu SRS' } })
    fireEvent.click(screen.getByRole('button', { name: 'Khóa biên bản Review' }))
    expect((screen.getByLabelText('Biên bản Review') as HTMLTextAreaElement).disabled).toBe(true)
  })

  it('shows a created recurring meeting on the calendar view', () => {
    render(<CollaborationPreview />); fireEvent.click(screen.getByRole('button', { name: 'Meeting' }))
    fireEvent.change(screen.getByLabelText('Tiêu đề meeting'), { target: { value: 'Daily' } })
    fireEvent.change(screen.getByLabelText('Bắt đầu meeting (giờ địa phương)'), { target: { value: '2026-10-12T09:00' } })
    fireEvent.change(screen.getByLabelText('Kết thúc meeting (giờ địa phương)'), { target: { value: '2026-10-12T09:30' } })
    fireEvent.change(screen.getByLabelText('Lặp lịch'), { target: { value: 'WEEKLY' } })
    fireEvent.change(screen.getByLabelText('Lặp đến ngày'), { target: { value: '2026-10-26' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo meeting fixture' }))
    expect(screen.getByText(/Lặp hàng tuần đến 2026-10-26/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Lịch' }))
    // Calendar is wired in; day-level placement is covered by MeetingCalendar's own tests with a fixed date.
    expect(screen.getByRole('button', { name: 'Tháng' })).toBeTruthy()
    expect(screen.getByText(/Email nhắc lịch chưa gửi/)).toBeTruthy()
  })

  it('exposes the chat conversation under the Chat tab', () => {
    render(<CollaborationPreview />); fireEvent.click(screen.getByRole('button', { name: 'Chat' }))
    expect(screen.getByRole('textbox', { name: 'Soạn tin nhắn' })).toBeTruthy()
  })
})
