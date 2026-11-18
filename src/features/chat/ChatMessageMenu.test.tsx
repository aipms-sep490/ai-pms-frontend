import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ChatMessageMenu } from './ChatMessageMenu'

afterEach(cleanup)

it('offers replies on received messages without exposing edit/recall capabilities', () => {
  const onReply = vi.fn()
  const view = render(<ChatMessageMenu onReply={onReply} />)
  const toggle = screen.getByLabelText('Thêm thao tác với tin nhắn')
  fireEvent.click(toggle)
  expect(screen.queryByRole('button', { name: 'Sửa tin nhắn' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Thu hồi tin nhắn' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Thả cảm xúc' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Trả lời' }))
  expect(onReply).toHaveBeenCalledOnce()
  expect(view.container.querySelector('details')?.open).toBe(false)
})

it('selects a reaction through the menu, closes it and restores focus', () => {
  const onReact = vi.fn()
  const view = render(<ChatMessageMenu onReact={onReact} />)
  const toggle = screen.getByLabelText('Thêm thao tác với tin nhắn')
  fireEvent.click(toggle)
  fireEvent.click(screen.getByRole('button', { name: 'Thả cảm xúc' }))
  expect(onReact).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Thả 👍' }))
  expect(onReact).toHaveBeenCalledExactlyOnceWith('👍')
  expect(view.container.querySelector('details')?.open).toBe(false)
  expect(document.activeElement).toBe(toggle)
})
