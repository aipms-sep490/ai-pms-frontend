import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const runtime = vi.hoisted(() => ({ env: { videoMeetingEnabled: false } }))
const api = vi.hoisted(() => ({ getMeetingVideoSession: vi.fn() }))
vi.mock('../../../app/config/env', () => runtime)
vi.mock('./meeting-video-api', () => api)
import { useMeetingVideoAccess } from './useMeetingVideoAccess'

const resource = { meetingId: 42, meetingStatus: 'SCHEDULED', meetingDeliveryMode: 'REMOTE', videoChannel: 'IN_APP_VIDEO', session: null, capabilities: { canStart: false, canJoin: true, canEnd: false, canRecord: false }, joinWindow: null, denialReasons: [] } as const

afterEach(() => { runtime.env.videoMeetingEnabled = false; api.getMeetingVideoSession.mockReset() })

describe('useMeetingVideoAccess', () => {
  it('does not call the Video API while rollout is off or the channel is external', () => {
    const { rerender } = renderHook(({ meeting }) => useMeetingVideoAccess(meeting), { initialProps: { meeting: { id: 42, videoChannel: 'IN_APP_VIDEO' } } })
    expect(api.getMeetingVideoSession).not.toHaveBeenCalled()
    runtime.env.videoMeetingEnabled = true
    rerender({ meeting: { id: 42, videoChannel: 'EXTERNAL_LINK' } })
    expect(api.getMeetingVideoSession).not.toHaveBeenCalled()
  })

  it('gets only the canonical resource for an in-app meeting and exposes its backend capabilities', async () => {
    runtime.env.videoMeetingEnabled = true
    api.getMeetingVideoSession.mockResolvedValue(resource)
    const { result } = renderHook(() => useMeetingVideoAccess({ id: 42, videoChannel: 'IN_APP_VIDEO' }))
    await waitFor(() => expect(result.current.state.status).toBe('ready'))
    expect(api.getMeetingVideoSession).toHaveBeenCalledWith(42, expect.any(AbortSignal))
    expect(result.current.state).toMatchObject({ resource: { capabilities: resource.capabilities } })
  })
})
