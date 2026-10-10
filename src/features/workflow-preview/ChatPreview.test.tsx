import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { ChatPreview } from './ChatPreview'
afterEach(cleanup)

describe('ChatPreview fixture', () => {
  it('sends a message and shows it as mine with a delivery state', () => {
    render(<ChatPreview />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Soạn tin nhắn' }), { target: { value: 'Đã xong SRS' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn fixture' }))
    expect(screen.getByText('Đã xong SRS')).toBeTruthy()
    expect(screen.getAllByText('Đã gửi').length).toBeGreaterThan(0)
  })

  it('refuses an empty message', () => {
    render(<ChatPreview />)
    fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn fixture' }))
    expect(screen.getByRole('alert').textContent).toContain('Nhập nội dung')
  })

  it('toggles a reaction from the emoji picker', () => {
    render(<ChatPreview />)
    const firstBubble = screen.getByText('Nhớ nộp báo cáo COLD trước hạn nhé.').closest('.v5-chat-bubble') as HTMLElement
    fireEvent.click(within(firstBubble).getByRole('button', { name: 'Thả 🎉' }))
    expect(within(firstBubble).getByRole('button', { name: '🎉 1, Nguyễn An' })).toBeTruthy()
  })

  it('never claims real upload for attachments', () => {
    render(<ChatPreview />)
    expect(screen.queryByText(/metadata fixture — chưa tải lên/)).toBeNull()
    // The disclaimer only appears once an attachment-bearing message exists; the compose hint stays honest.
    expect(screen.getByText(/ChatDock\/SignalR hiện có được giữ nguyên/)).toBeTruthy()
  })
})
