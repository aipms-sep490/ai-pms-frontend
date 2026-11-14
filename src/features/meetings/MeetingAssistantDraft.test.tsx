import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MeetingScheduleForm } from './MeetingScheduleForm'
import { readAssistantMeetingDraft } from './assistant-meeting-draft'

vi.mock('../../app/config/env', () => ({ env: { videoMeetingEnabled: true } }))
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

it('prefills noon Vietnam time, in-app video and late-loading authorized participants without auto-saving', () => {
  const save = vi.fn()
  const initialDraft = readAssistantMeetingDraft({ kind: 'MEETING', projectId: 9, title: 'Họp nhóm', description: 'Tiến độ', meeting: {
    startAt: '2030-11-04T05:00:00Z', meetingDeliveryMode: 'REMOTE', videoChannel: 'IN_APP_VIDEO', inviteAll: true,
  } }, 9)!
  const candidates = [{ userId: 1, fullName: 'Leader', role: 'Leader' }, { userId: 2, fullName: 'Member', role: 'Student' }, { userId: 3, fullName: 'Mentor', role: 'Lecturer' }]
  const props = { initialDraft, currentUserId: 1, busy: false, onSave: save, onDirty: vi.fn() }
  const view = render(<MeetingScheduleForm {...props} />)
  expect((screen.getByLabelText('Bắt đầu (giờ Việt Nam)') as HTMLInputElement).value).toBe('2030-11-04T12:00')
  expect((screen.getByLabelText('Kết thúc (không bắt buộc)') as HTMLInputElement).value).toBe('')
  expect((screen.getByLabelText('Từ xa') as HTMLInputElement).checked).toBe(true)
  expect((screen.getByLabelText('Video trong PMS') as HTMLInputElement).checked).toBe(true)
  expect(screen.queryByLabelText('Liên kết họp trực tuyến')).toBeNull()
  view.rerender(<MeetingScheduleForm {...props} candidates={candidates} />)
  expect((screen.getByRole('checkbox', { name: /Member/ }) as HTMLInputElement).checked).toBe(true)
  expect((screen.getByRole('checkbox', { name: /Mentor/ }) as HTMLInputElement).checked).toBe(true)
  fireEvent.click(screen.getByRole('checkbox', { name: /Member/ }))
  view.rerender(<MeetingScheduleForm {...props} candidates={[...candidates]} />)
  expect((screen.getByRole('checkbox', { name: /Member/ }) as HTMLInputElement).checked).toBe(false)
  expect(save).not.toHaveBeenCalled()
  fireEvent.submit(screen.getByRole('button', { name: 'Tạo cuộc họp' }).closest('form')!)
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ startAt: '2030-11-04T05:00:00.000Z', endAt: null, participantUserIds: [3], meetingDeliveryMode: 'REMOTE', videoChannel: 'IN_APP_VIDEO' }))
})

it('rejects a past start for a new meeting while keeping the draft visible', () => {
  const save = vi.fn()
  render(<MeetingScheduleForm busy={false} initialDraft={{ title: 'Lịch cũ', description: '', meeting: { startAt: '2020-01-01T02:00:00Z' } }} onSave={save} onDirty={vi.fn()} />)
  fireEvent.submit(screen.getByRole('button', { name: 'Tạo cuộc họp' }).closest('form')!)
  expect(screen.getByRole('alert').textContent).toContain('phải bắt đầu trong tương lai')
  expect((screen.getByLabelText('Bắt đầu (giờ Việt Nam)') as HTMLInputElement).value).toBe('2020-01-01T09:00')
  expect(save).not.toHaveBeenCalled()
})

it('rejects another project and ignores invalid structured values', () => {
  const draft = { kind: 'MEETING', projectId: 9, title: 'Draft', description: '', meeting: { startAt: 'tomorrow', inviteAll: 'true', meetingDeliveryMode: 'OTHER', onlineUrl: 'javascript:alert(1)' } }
  expect(readAssistantMeetingDraft(draft, 10)).toBeUndefined()
  expect(readAssistantMeetingDraft(draft, 9)?.meeting).toMatchObject({ startAt: null, inviteAll: false, meetingDeliveryMode: null, onlineUrl: null })
})
