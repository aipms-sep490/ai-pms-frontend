import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { MeetingDetail } from './meeting-types'

const runtime = vi.hoisted(() => ({ env: { videoMeetingEnabled: false } }))
vi.mock('../../app/config/env', () => runtime)
import { MeetingScheduleForm } from './MeetingScheduleForm'

const legacyMeeting: MeetingDetail = {
  id: 42, projectId: 2, title: 'Lịch cũ', agenda: null, meetingNotes: null, startAt: '2026-10-03T02:00:00Z', endAt: null,
  location: 'Phòng 302', onlineUrl: 'https://meet.example/legacy', status: 'SCHEDULED', createdBy: 9, createdByName: 'Khang',
  createdAt: '2026-10-02T02:00:00Z', updatedAt: '2026-10-02T02:00:00Z', participants: [], feedbacks: [],
}

afterEach(() => { cleanup(); runtime.env.videoMeetingEnabled = false })

function renderForm(meeting?: MeetingDetail) {
  const onSave = vi.fn().mockResolvedValue(undefined)
  render(<MeetingScheduleForm meeting={meeting} busy={false} onDirty={vi.fn()} onSave={onSave} />)
  fireEvent.change(screen.getByLabelText('Tiêu đề cuộc họp'), { target: { value: 'Họp Video' } })
  fireEvent.change(screen.getByLabelText(/Bắt đầu/), { target: { value: '2026-10-03T09:00' } })
  return onSave
}

async function submit(onSave: ReturnType<typeof vi.fn>) {
  fireEvent.submit(screen.getByRole('button', { name: 'Tạo cuộc họp' }).closest('form')!)
  await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
  return onSave.mock.calls[0][0]
}

describe('MeetingScheduleForm Video Meeting rollout', () => {
  it('keeps the legacy form unchanged while the rollout is disabled', () => {
    const onSave = renderForm()
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.queryByText('Hình thức tham gia')).toBeNull()
    expect(screen.getByLabelText('Địa điểm')).toBeTruthy()
    expect(screen.getByLabelText('Liên kết họp trực tuyến')).toBeTruthy()
  })

  it.each([
    { mode: 'Tại chỗ', channel: undefined, location: 'Phòng 302', url: undefined, expectedMode: 'ONSITE', expectedChannel: 'NONE' },
    { mode: 'Từ xa', channel: 'Liên kết ngoài', location: undefined, url: 'https://meet.example/remote', expectedMode: 'REMOTE', expectedChannel: 'EXTERNAL_LINK' },
    { mode: 'Từ xa', channel: 'Video trong AI-PMS', location: undefined, url: undefined, expectedMode: 'REMOTE', expectedChannel: 'IN_APP_VIDEO' },
    { mode: 'Kết hợp', channel: 'Liên kết ngoài', location: 'Phòng 302', url: 'https://meet.example/hybrid', expectedMode: 'HYBRID', expectedChannel: 'EXTERNAL_LINK' },
    { mode: 'Kết hợp', channel: 'Video trong AI-PMS', location: 'Phòng 302', url: undefined, expectedMode: 'HYBRID', expectedChannel: 'IN_APP_VIDEO' },
  ])('saves $mode + $channel with only compatible legacy fields', async ({ mode, channel, location, url, expectedMode, expectedChannel }) => {
    runtime.env.videoMeetingEnabled = true
    const onSave = renderForm()
    fireEvent.click(screen.getByLabelText(mode))
    if (channel) fireEvent.click(screen.getByLabelText(channel))
    if (location) fireEvent.change(screen.getByLabelText('Địa điểm'), { target: { value: location } })
    if (url) fireEvent.change(screen.getByLabelText('Liên kết họp trực tuyến'), { target: { value: url } })
    const body = await submit(onSave)
    expect(body).toMatchObject({ meetingDeliveryMode: expectedMode, videoChannel: expectedChannel, location: location ?? null, onlineUrl: url ?? null })
    if (expectedChannel === 'IN_APP_VIDEO') expect(screen.getByText(/Chưa có phòng hoặc mã truy cập nào được tạo/)).toBeTruthy()
  })

  it('requires a location when the selected delivery mode needs one', async () => {
    runtime.env.videoMeetingEnabled = true
    const onSave = renderForm()
    fireEvent.submit(screen.getByRole('button', { name: 'Tạo cuộc họp' }).closest('form')!)
    expect((await screen.findByRole('alert')).textContent).toContain('Nhập địa điểm')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('rejects an invalid external URL before saving', async () => {
    runtime.env.videoMeetingEnabled = true
    const onSave = renderForm()
    fireEvent.click(screen.getByLabelText('Từ xa'))
    fireEvent.change(screen.getByLabelText('Liên kết họp trực tuyến'), { target: { value: 'javascript:alert(1)' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Tạo cuộc họp' }).closest('form')!)
    expect((await screen.findByRole('alert')).textContent).toContain('http://')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('edits an existing legacy meeting without manufacturing a Video Meeting state', async () => {
    runtime.env.videoMeetingEnabled = true
    const onSave = renderForm(legacyMeeting)
    expect(screen.getByText(/lịch họp cũ/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Địa điểm'), { target: { value: 'Phòng 401' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Lưu lịch họp' }).closest('form')!)
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave.mock.calls[0][0]).not.toHaveProperty('meetingDeliveryMode')
    expect(onSave.mock.calls[0][0]).not.toHaveProperty('videoChannel')
    expect(onSave.mock.calls[0][0]).toMatchObject({ location: 'Phòng 401', onlineUrl: legacyMeeting.onlineUrl })
  })
})
