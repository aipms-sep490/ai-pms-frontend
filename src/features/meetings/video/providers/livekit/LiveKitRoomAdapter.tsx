import { useEffect, useRef, useState, type ReactNode } from 'react'
import '@livekit/components-styles'
import { RoomContext } from '@livekit/components-react'
import { ConnectionState, Room, RoomEvent, isBrowserSupported } from 'livekit-client'
import type { MeetingVideoJoinResponse } from '../../meeting-video.types'
import type { MeetingVideoPreflightSelection } from '../../MeetingVideoPreflight'
import { liveKitErrorMessage } from './livekit-error-map'
import { LiveKitRoomContent } from './LiveKitRoomContent'
import './livekit.css'

type AdapterState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed'
const labels: Record<AdapterState, string> = { connecting: 'Đang kết nối…', connected: 'Đã kết nối', reconnecting: 'Đang kết nối lại…', disconnected: 'Đã ngắt kết nối', failed: 'Kết nối thất bại' }

export function LiveKitRoomAdapter({ credential, preferences, title, canEnd, onLeave, onEndRequested, onTerminal, governance, governanceOpen, onGovernance }: {
  credential: MeetingVideoJoinResponse; preferences: MeetingVideoPreflightSelection; title: string; canEnd: boolean
  onLeave: () => void; onEndRequested: () => void; onTerminal: (message: string) => void; governance: ReactNode; governanceOpen: boolean; onGovernance: () => void
}) {
  const roomRef = useRef<Room | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [state, setState] = useState<AdapterState>('connecting')
  const [error, setError] = useState('')
  const [controlError, setControlError] = useState('')

  useEffect(() => {
    if (!isBrowserSupported()) { setState('failed'); setError('Trình duyệt này không hỗ trợ WebRTC cần thiết cho Video.'); return }
    const nextRoom = new Room({ adaptiveStream: true, dynacast: true })
    roomRef.current = nextRoom
    let active = true
    const onState = (next: ConnectionState) => {
      if (!active) return
      if (next === ConnectionState.Connected) setState('connected')
      else if (next === ConnectionState.Reconnecting) setState('reconnecting')
      else if (next === ConnectionState.Disconnected) setState('disconnected')
    }
    const onDisconnected = () => { if (active) onTerminal('Phiên Video đã đóng hoặc không còn khả dụng.') }
    nextRoom.on(RoomEvent.ConnectionStateChanged, onState)
    nextRoom.on(RoomEvent.Disconnected, onDisconnected)
    void (async () => {
      try {
        await nextRoom.connect(credential.serverUrl, credential.accessToken)
        if (!active) return
        await nextRoom.localParticipant.setMicrophoneEnabled(preferences.audioEnabled && credential.capabilities.publishAudio, preferences.audioInputId ? { deviceId: preferences.audioInputId } : undefined)
        await nextRoom.localParticipant.setCameraEnabled(preferences.videoEnabled && credential.capabilities.publishVideo, preferences.videoInputId ? { deviceId: preferences.videoInputId } : undefined)
        if (active) { setRoom(nextRoom); setState('connected') }
      } catch (reason) {
        if (active) { setState('failed'); setError(liveKitErrorMessage(reason)); onTerminal(liveKitErrorMessage(reason)) }
      }
    })()
    return () => { active = false; nextRoom.off(RoomEvent.ConnectionStateChanged, onState); nextRoom.off(RoomEvent.Disconnected, onDisconnected); nextRoom.disconnect(); if (roomRef.current === nextRoom) roomRef.current = null }
  // A credential defines a single attempt. Preferences are intentionally captured for that attempt only.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credential])

  if (error) return <p className="mtg-notice mtg-notice--error" role="alert">{error}</p>
  if (!room) return <p className="mtg-loading" role="status">{labels[state]}</p>
  return <RoomContext.Provider value={room}>{controlError && <div className="mtg-notice mtg-notice--error mtg-livekit-control-error" role="alert"><p>{controlError}</p><button className="mtg-text-button" onClick={() => setControlError('')}>Đóng thông báo</button></div>}<LiveKitRoomContent room={room} title={title} connectionState={labels[state]} canEnd={canEnd} mediaCapabilities={credential.capabilities} onLeave={onLeave} onEndRequested={onEndRequested} onGovernance={onGovernance} governanceOpen={governanceOpen} onProviderError={(reason) => setControlError(liveKitErrorMessage(reason))} />{governance}</RoomContext.Provider>
}
