import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { MeetingDetail } from '../meeting-types'
import type { MeetingVideoResource } from './meeting-video.types'

const runtime = vi.hoisted(() => ({ env: { videoMeetingEnabled: true } }))
const access = vi.hoisted(() => ({ state: { status: 'ready', resource: { meetingId: 42, meetingStatus: 'SCHEDULED', meetingDeliveryMode: 'REMOTE', videoChannel: 'IN_APP_VIDEO', session: null, capabilities: { canStart: false, canJoin: false, canEnd: true, canRecord: true }, joinWindow: null, denialReasons: [] } }, refresh: vi.fn(), enabled: true }))
const api = vi.hoisted(() => ({ startMeetingVideo: vi.fn() }))
vi.mock('../../../app/config/env', () => runtime)
vi.mock('./useMeetingVideoAccess', () => ({ useMeetingVideoAccess: () => access }))
vi.mock('./meeting-video-api', () => api)
import { MeetingVideoSection } from './MeetingVideoSection'

const meeting: MeetingDetail = { id: 42, projectId: 2, title: 'Video', agenda: null, meetingNotes: null, startAt: '2026-10-03T02:00:00Z', endAt: null, location: 'A', onlineUrl: null, status: 'SCHEDULED', createdBy: 9, createdByName: 'Khang', createdAt: '2026-10-02T02:00:00Z', updatedAt: '2026-10-02T02:00:00Z', participants: [], feedbacks: [], videoChannel: 'IN_APP_VIDEO' }

afterEach(() => { cleanup(); runtime.env.videoMeetingEnabled = true; api.startMeetingVideo.mockReset(); access.refresh.mockReset(); access.state.resource.capabilities = { canStart: false, canJoin: false, canEnd: true, canRecord: true }; (access.state.resource as { session: MeetingVideoResource['session'] }).session = null })

describe('MeetingVideoSection', () => {
  it('uses capability flags rather than role-like controls and omits end/record actions', () => {
    render(<MemoryRouter><MeetingVideoSection meeting={meeting} routeBase="/project" /></MemoryRouter>)
    expect(screen.queryByRole('button', { name: 'Bắt đầu Video' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Kiểm tra trước khi tham gia' })).toBeNull()
    expect(screen.queryByText(/Kết thúc Video|Ghi hình/)).toBeNull()
  })

  it('starts once from an explicit action then refreshes the canonical resource', async () => {
    access.state.resource.capabilities = { canStart: true, canJoin: true, canEnd: false, canRecord: false }
    api.startMeetingVideo.mockResolvedValue(undefined)
    render(<MemoryRouter><MeetingVideoSection meeting={meeting} routeBase="/project" /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu Video' }))
    fireEvent.click(screen.getByRole('button', { name: /Đang bắt đầu/ }))
    await waitFor(() => expect(api.startMeetingVideo).toHaveBeenCalledTimes(1))
    expect(api.startMeetingVideo).toHaveBeenCalledWith(42)
    await waitFor(() => expect(access.refresh).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('link', { name: 'Kiểm tra trước khi tham gia' }).getAttribute('href')).toBe('/project/meetings/42/video')
  })

  it('shows the join CTA for a CREATED session when the Backend grants canJoin', () => {
    ;(access.state.resource as { session: MeetingVideoResource['session'] }).session = { id: 91, status: 'CREATED', startedAt: null, endedAt: null, activeParticipantCount: null }
    access.state.resource.capabilities = { canStart: false, canJoin: true, canEnd: false, canRecord: false }
    render(<MemoryRouter><MeetingVideoSection meeting={meeting} routeBase="/project" /></MemoryRouter>)
    expect(screen.getByText('Phòng họp đang được chuẩn bị.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Kiểm tra trước khi tham gia' }).getAttribute('href')).toBe('/project/meetings/42/video')
  })
})
