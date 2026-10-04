import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const room = vi.hoisted(() => ({ connect: vi.fn().mockResolvedValue(undefined), disconnect: vi.fn(), on: vi.fn(), off: vi.fn(), localParticipant: { setMicrophoneEnabled: vi.fn().mockResolvedValue(undefined), setCameraEnabled: vi.fn().mockResolvedValue(undefined) } }))
vi.mock('livekit-client', () => ({ Room: class { constructor() { return room } }, RoomEvent: { ConnectionStateChanged: 'state', Disconnected: 'disconnected' }, ConnectionState: { Connected: 'connected', Reconnecting: 'reconnecting', Disconnected: 'disconnected' }, isBrowserSupported: () => true }))
vi.mock('@livekit/components-styles', () => ({}))
vi.mock('@livekit/components-react', () => ({ RoomContext: { Provider: ({ children }: { children: unknown }) => children } }))
vi.mock('../LiveKitRoomContent', () => ({ LiveKitRoomContent: () => <p>Provider room content</p> }))
import { LiveKitRoomAdapter } from '../LiveKitRoomAdapter'

describe('LiveKitRoomAdapter', () => {
  it('creates and connects one provider room only after a credential exists, applies local preferences, and cleans up', async () => {
    const view = render(<LiveKitRoomAdapter credential={{ provider: 'LIVEKIT', serverUrl: 'wss://video.example', participantIdentity: 'u1', participantName: 'Khang', accessToken: 'ephemeral', expiresAt: '2026-10-03T03:00:00Z', capabilities: { publishAudio: true, publishVideo: true, screenShare: false, moderator: false } }} preferences={{ audioInputId: 'mic-1', videoInputId: 'cam-1', audioEnabled: true, videoEnabled: false }} title="Họp" canEnd={false} onLeave={vi.fn()} onEndRequested={vi.fn()} onTerminal={vi.fn()} governance={null} governanceOpen={false} onGovernance={vi.fn()} />)
    expect(await screen.findByText('Provider room content')).toBeTruthy()
    expect(room.connect).toHaveBeenCalledWith('wss://video.example', 'ephemeral')
    expect(room.localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(true, { deviceId: 'mic-1' })
    expect(room.localParticipant.setCameraEnabled).toHaveBeenCalledWith(false, { deviceId: 'cam-1' })
    view.unmount()
    expect(room.disconnect).toHaveBeenCalled()
  })
})
