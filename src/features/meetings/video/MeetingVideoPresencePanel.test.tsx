import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { HttpError } from '../../../services/http/http-client'
import type { MeetingDetail } from '../meeting-types'

const runtime = vi.hoisted(() => ({ env: { videoMeetingEnabled: true } }))
const api = vi.hoisted(() => ({ getMeetingVideoPresence: vi.fn() }))
vi.mock('../../../app/config/env', () => runtime)
vi.mock('./meeting-video-api', () => api)
import { MeetingVideoPresencePanel } from './MeetingVideoPresencePanel'
import { formatPresenceDuration } from './meeting-video-presence-utils'

const meeting: MeetingDetail = { id: 42, projectId: 2, title: 'Video', agenda: null, meetingNotes: null, startAt: '2026-10-03T02:00:00Z', endAt: null, location: null, onlineUrl: null, status: 'COMPLETED', createdBy: 9, createdByName: 'Khang', createdAt: '2026-10-02T02:00:00Z', updatedAt: '2026-10-02T02:00:00Z', participants: [{ id: 1, meetingId: 42, userId: 9, fullName: 'Nguyễn Văn A', email: 'a@example.test', attendanceStatus: 'INVITED', createdAt: '2026-10-02T00:00:00Z', updatedAt: '2026-10-02T00:00:00Z' }], feedbacks: [], videoChannel: 'IN_APP_VIDEO' }

afterEach(() => { cleanup(); runtime.env.videoMeetingEnabled = true; api.getMeetingVideoPresence.mockReset() })

describe('MeetingVideoPresencePanel', () => {
  it('does not call Presence until explicitly opened, or when Video is disabled/external', () => {
    render(<MeetingVideoPresencePanel meeting={meeting} />)
    expect(api.getMeetingVideoPresence).not.toHaveBeenCalled()
    runtime.env.videoMeetingEnabled = false; cleanup(); render(<MeetingVideoPresencePanel meeting={meeting} />)
    expect(screen.queryByText('Dữ liệu tham gia phòng trực tuyến')).toBeNull(); expect(api.getMeetingVideoPresence).not.toHaveBeenCalled()
    runtime.env.videoMeetingEnabled = true; cleanup(); render(<MeetingVideoPresencePanel meeting={{ ...meeting, videoChannel: 'EXTERNAL_LINK' }} />)
    expect(api.getMeetingVideoPresence).not.toHaveBeenCalled()
  })

  it('renders Backend aggregate evidence without changing official attendance', async () => {
    api.getMeetingVideoPresence.mockResolvedValue({ meetingId: 42, participants: [{ userId: 9, firstJoinedAt: '2026-10-03T02:02:00Z', lastLeftAt: '2026-10-03T02:58:00Z', totalConnectedSeconds: 3660, connectionCount: 2 }] })
    render(<MeetingVideoPresencePanel meeting={meeting} />)
    fireEvent.click(screen.getByRole('button', { name: 'Xem dữ liệu kết nối' }))
    await screen.findByText('Nguyễn Văn A')
    expect(api.getMeetingVideoPresence).toHaveBeenCalledWith(42, expect.any(AbortSignal))
    expect(screen.getByText('1 giờ 1 phút')).toBeTruthy(); expect(screen.getByText('Đã mời')).toBeTruthy()
    expect(screen.getByText(/không tự thay đổi trạng thái điểm danh/)).toBeTruthy()
  })

  it('shows an empty evidence state, never zero-attendance inference', async () => {
    api.getMeetingVideoPresence.mockResolvedValue({ meetingId: 42, participants: [] })
    render(<MeetingVideoPresencePanel meeting={meeting} />); fireEvent.click(screen.getByRole('button', { name: 'Xem dữ liệu kết nối' }))
    expect(await screen.findByText(/Chưa có bằng chứng/)).toBeTruthy(); expect(screen.queryByText(/vắng mặt/i)).toBeNull()
  })

  it('treats a null provider leave time as a connected state, not the Unix epoch', async () => {
    api.getMeetingVideoPresence.mockResolvedValue({ meetingId: 42, participants: [{ userId: 9, firstJoinedAt: '2026-10-03T02:02:00Z', lastLeftAt: null, totalConnectedSeconds: 60, connectionCount: 1 }] })
    render(<MeetingVideoPresencePanel meeting={meeting} />); fireEvent.click(screen.getByRole('button', { name: 'Xem dữ liệu kết nối' }))
    expect(await screen.findByText('Đang kết nối')).toBeTruthy()
    expect(screen.queryByText(/1970/)).toBeNull()
  })

  it.each([403, 404, 409, 503])('keeps degraded evidence separate for HTTP %s', async (status) => {
    api.getMeetingVideoPresence.mockRejectedValue(new HttpError('failure', status))
    render(<MeetingVideoPresencePanel meeting={meeting} />); fireEvent.click(screen.getByRole('button', { name: 'Xem dữ liệu kết nối' }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(screen.queryByText('Đã mời')).toBeNull()
  })

  it('formats aggregate durations without attendance thresholds', () => {
    expect(formatPresenceDuration(0)).toBe('Dưới 1 phút'); expect(formatPresenceDuration(65)).toBe('1 phút'); expect(formatPresenceDuration(3599)).toBe('59 phút')
  })
})
