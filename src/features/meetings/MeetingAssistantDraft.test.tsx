import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MeetingScheduleForm } from './MeetingScheduleForm'
afterEach(cleanup)
it('prefills a meeting draft without scheduling or inventing a date', () => {
  const save = vi.fn()
  render(<MeetingScheduleForm busy={false} initialDraft={{ title: 'Rà soát tuần', description: 'Tiến độ và vướng mắc' }} onSave={save} onDirty={vi.fn()} />)
  expect((screen.getByLabelText('Tiêu đề cuộc họp') as HTMLInputElement).value).toBe('Rà soát tuần')
  expect((screen.getByLabelText('Bắt đầu (giờ Việt Nam)') as HTMLInputElement).value).toBe('')
  expect(save).not.toHaveBeenCalled()
  fireEvent.submit(screen.getByRole('button', { name: 'Tạo cuộc họp' }).closest('form')!)
  expect(save).not.toHaveBeenCalled()
})
