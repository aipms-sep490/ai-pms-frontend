import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ExecutionAccessContext } from '../../execution/context/ExecutionAccessContext'

const runtime = vi.hoisted(() => ({ env: { videoMeetingEnabled: true } }))
const api = vi.hoisted(() => ({ getMeeting: vi.fn() }))
const access = vi.hoisted(() => ({ state: { status: 'ready', resource: { capabilities: { canStart: false, canJoin: false, canEnd: false, canRecord: false }, denialReasons: ['VIDEO_JOIN_FORBIDDEN'] } }, refresh: vi.fn(), enabled: true }))
vi.mock('../../../app/config/env', () => runtime)
vi.mock('../../../services/api/meetings.api', () => api)
vi.mock('./useMeetingVideoAccess', () => ({ useMeetingVideoAccess: () => access }))
import { MeetingVideoRoomPage } from './MeetingVideoRoomPage'

const meeting = { id: 42, projectId: 2, title: 'Video', agenda: null, meetingNotes: null, startAt: '2026-10-03T02:00:00Z', endAt: null, location: null, onlineUrl: null, status: 'SCHEDULED', createdBy: 9, createdByName: 'Khang', createdAt: '2026-10-02T02:00:00Z', updatedAt: '2026-10-02T02:00:00Z', participants: [], feedbacks: [], videoChannel: 'IN_APP_VIDEO' }

function mount() {
  return render(<ExecutionAccessContext.Provider value={{ project: { id: 2, title: 'Đồ án' } as never, actor: 'student', canManageStructure: false, routeBase: '/project' }}><MemoryRouter initialEntries={['/project/meetings/42/video']}><Routes><Route path="/project/meetings/:meetingId/video" element={<MeetingVideoRoomPage />} /></Routes></MemoryRouter></ExecutionAccessContext.Provider>)
}

afterEach(() => { cleanup(); api.getMeeting.mockReset(); access.state.resource.capabilities.canJoin = false; access.state.resource.denialReasons = ['VIDEO_JOIN_FORBIDDEN'] })

describe('MeetingVideoRoomPage', () => {
  it('fails closed when the canonical meeting belongs to another project', async () => {
    api.getMeeting.mockResolvedValue({ ...meeting, projectId: 7 })
    mount()
    expect(await screen.findByText('Cuộc họp không thuộc đồ án đang mở.')).toBeTruthy()
    expect(screen.queryByText('Sẵn sàng trước khi tham gia')).toBeNull()
  })

  it('requires backend canJoin before showing preflight and maps the stable denial code', async () => {
    api.getMeeting.mockResolvedValue(meeting)
    mount()
    expect(await screen.findByText('Chưa thể tham gia Video')).toBeTruthy()
    expect(screen.getByText('Bạn không được phép tham gia Video.')).toBeTruthy()
    expect(screen.queryByText('Sẵn sàng trước khi tham gia')).toBeNull()
  })
})
