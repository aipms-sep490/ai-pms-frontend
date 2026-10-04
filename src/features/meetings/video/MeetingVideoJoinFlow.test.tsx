import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ExecutionAccessContext } from '../../execution/context/ExecutionAccessContext'

const runtime = vi.hoisted(() => ({ env: { videoMeetingEnabled: true } }))
const api = vi.hoisted(() => ({ getMeeting: vi.fn(), joinMeetingVideo: vi.fn(), endMeetingVideo: vi.fn(), updateMeetingNotes: vi.fn(), getMeetingDecisions: vi.fn(), getMeetingActionItems: vi.fn() }))
const access = vi.hoisted(() => ({ state: { status: 'ready', resource: { capabilities: { canStart: false, canJoin: true, canEnd: false, canRecord: false }, denialReasons: [] } }, refresh: vi.fn(), enabled: true }))
vi.mock('../../../app/config/env', () => runtime)
vi.mock('../../../services/api/meetings.api', () => api)
vi.mock('./meeting-video-api', () => api)
vi.mock('./useMeetingVideoAccess', () => ({ useMeetingVideoAccess: () => access }))
vi.mock('./MeetingVideoPreflight', () => ({ MeetingVideoPreflight: ({ onConnectRequested }: { onConnectRequested: (value: unknown) => void }) => <button onClick={() => onConnectRequested({ audioInputId: 'mic', videoInputId: 'cam', audioEnabled: true, videoEnabled: true })}>Tham gia cuộc họp</button> }))
vi.mock('./providers/livekit/LiveKitRoomAdapter', () => ({ LiveKitRoomAdapter: ({ credential, onEndRequested, onLeave }: { credential: { participantName: string }; onEndRequested: () => void; onLeave: () => void }) => <><p>Đã kết nối: {credential.participantName}</p><button onClick={onLeave}>Rời phòng mock</button><button onClick={onEndRequested}>Kết thúc phòng mock</button></> }))
import { MeetingVideoRoomPage } from './MeetingVideoRoomPage'

const meeting = { id: 42, projectId: 2, title: 'Video', agenda: null, meetingNotes: null, startAt: '2026-10-03T02:00:00Z', endAt: null, location: null, onlineUrl: null, status: 'SCHEDULED', createdBy: 9, createdByName: 'Khang', createdAt: '2026-10-02T02:00:00Z', updatedAt: '2026-10-02T02:00:00Z', participants: [], feedbacks: [], videoChannel: 'IN_APP_VIDEO', concurrencyToken: 'v1' }
function mount() { return render(<ExecutionAccessContext.Provider value={{ project: { id: 2, title: 'Đồ án' } as never, actor: 'student', canManageStructure: false, routeBase: '/project' }}><MemoryRouter initialEntries={['/project/meetings/42/video']}><Routes><Route path="/project/meetings/:meetingId/video" element={<MeetingVideoRoomPage />} /></Routes></MemoryRouter></ExecutionAccessContext.Provider>) }

afterEach(() => { cleanup(); vi.clearAllMocks(); access.state.resource.capabilities = { canStart: false, canJoin: true, canEnd: false, canRecord: false }; localStorage.clear(); sessionStorage.clear() })

describe('MeetingVideoRoomPage join boundary', () => {
  it('posts join once only after explicit action, keeps the credential out of storage and hands it to the adapter', async () => {
    api.getMeeting.mockResolvedValue(meeting)
    api.joinMeetingVideo.mockResolvedValue({ provider: 'LIVEKIT', serverUrl: 'wss://video.example', participantIdentity: 'u-9', participantName: 'Khang', accessToken: 'short-lived', expiresAt: '2026-10-03T03:00:00Z', capabilities: { publishAudio: true, publishVideo: true, screenShare: false, moderator: false } })
    mount()
    await screen.findByRole('button', { name: 'Tham gia cuộc họp' })
    fireEvent.click(screen.getByRole('button', { name: 'Tham gia cuộc họp' })); fireEvent.click(screen.getByRole('button', { name: 'Tham gia cuộc họp' }))
    await waitFor(() => expect(api.joinMeetingVideo).toHaveBeenCalledTimes(1))
    expect(api.joinMeetingVideo).toHaveBeenCalledWith(42)
    expect(await screen.findByText('Đã kết nối: Khang')).toBeTruthy()
    expect(localStorage.getItem('meetingVideoToken')).toBeNull(); expect(sessionStorage.getItem('meetingVideoToken')).toBeNull()
    expect(window.location.search).toBe('')
  })

  it.each([401, 403, 409, 503])('does not load the provider when Backend join returns %s', async (status) => {
    api.getMeeting.mockResolvedValue(meeting); api.joinMeetingVideo.mockRejectedValue(Object.assign(new Error('join'), { name: 'HttpError', status }))
    mount(); await screen.findByRole('button', { name: 'Tham gia cuộc họp' }); fireEvent.click(screen.getByRole('button', { name: 'Tham gia cuộc họp' }))
    await waitFor(() => expect(api.joinMeetingVideo).toHaveBeenCalledTimes(1))
    expect(screen.queryByText(/Đã kết nối:/)).toBeNull()
  })

  it('keeps Leave distinct from End, and ending calls only the canonical Video end endpoint once', async () => {
    access.state.resource.capabilities = { canStart: false, canJoin: true, canEnd: true, canRecord: false }
    api.getMeeting.mockResolvedValue(meeting)
    api.joinMeetingVideo.mockResolvedValue({ provider: 'LIVEKIT', serverUrl: 'wss://video.example', participantIdentity: 'u-9', participantName: 'Khang', accessToken: 'short-lived', expiresAt: '2026-10-03T03:00:00Z', capabilities: { publishAudio: true, publishVideo: true, screenShare: false, moderator: false } })
    api.endMeetingVideo.mockResolvedValue(undefined)
    mount(); await screen.findByRole('button', { name: 'Tham gia cuộc họp' }); fireEvent.click(screen.getByRole('button', { name: 'Tham gia cuộc họp' })); await screen.findByText('Đã kết nối: Khang')
    fireEvent.click(screen.getByRole('button', { name: 'Kết thúc phòng mock' })); expect(screen.getByRole('alertdialog').textContent).toContain('không hoàn tất cuộc họp')
    fireEvent.click(screen.getByRole('button', { name: 'Kết thúc phòng' })); fireEvent.click(screen.getByRole('button', { name: /Đang kết thúc/ }))
    await waitFor(() => expect(api.endMeetingVideo).toHaveBeenCalledTimes(1)); expect(api.endMeetingVideo).toHaveBeenCalledWith(42)
    expect('completeMeeting' in api).toBe(false)
  })
})
