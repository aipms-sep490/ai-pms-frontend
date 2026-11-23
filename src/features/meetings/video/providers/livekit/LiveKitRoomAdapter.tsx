import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import '@livekit/components-styles'
import { RoomContext } from '@livekit/components-react'
import { ConnectionState, Room, RoomEvent, isBrowserSupported } from 'livekit-client'
import type { MeetingDetail } from '../../../meeting-types'
import type { MeetingVideoJoinResponse } from '../../meeting-video.types'
import type { MeetingVideoPreflightSelection } from '../../MeetingVideoPreflight'
import { LiveCaptionsOverlay } from '../../ai/LiveCaptionsOverlay'
import { MeetingAiCopilotPanel } from '../../ai/MeetingAiCopilotPanel'
import type { MeetingAiActionItem, MeetingTranscriptSegment } from '../../ai/meeting-video-ai.types'
import { useMeetingLiveTranscription } from '../../ai/useMeetingLiveTranscription'
import { liveKitErrorMessage } from './livekit-error-map'
import { LiveKitRoomContent } from './LiveKitRoomContent'
import './livekit.css'
import '../../ai/meeting-video-ai.css'

type AdapterState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed'
const labels: Record<AdapterState, string> = {
  connecting: 'Đang kết nối…',
  connected: 'Đã kết nối',
  reconnecting: 'Đang kết nối lại…',
  disconnected: 'Đã ngắt kết nối',
  failed: 'Kết nối thất bại',
}

export interface LiveKitRoomAiOptions {
  meeting: MeetingDetail
  canManage: boolean
  isSupervisor: boolean
  currentUserId: number | null
  milestones: Array<{ id: number; title: string }>
  aiOpen: boolean
  onAiToggle: () => void
  onAiClose: () => void
  onApplyMinutesToNotes?: (minutes: string) => void
  onApplyDecision?: (decision: string) => Promise<void>
  onCreateActionItem?: (item: MeetingAiActionItem, milestoneId: number | null) => Promise<void>
}

export function LiveKitRoomAdapter({
  credential,
  preferences,
  title,
  canEnd,
  onLeave,
  onEndRequested,
  onTerminal,
  governance,
  governanceOpen,
  onGovernance,
  ai,
}: {
  credential: MeetingVideoJoinResponse
  preferences: MeetingVideoPreflightSelection
  title: string
  canEnd: boolean
  onLeave: () => void
  onEndRequested: () => void
  onTerminal: (message: string) => void
  governance: ReactNode
  governanceOpen: boolean
  onGovernance: () => void
  ai?: LiveKitRoomAiOptions
}) {
  const roomRef = useRef<Room | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [state, setState] = useState<AdapterState>('connecting')
  const [error, setError] = useState('')
  const [controlError, setControlError] = useState('')

  useEffect(() => {
    if (!isBrowserSupported()) {
      setState('failed')
      setError('Trình duyệt này không hỗ trợ WebRTC cần thiết cho Video.')
      return
    }
    const nextRoom = new Room({ adaptiveStream: true, dynacast: true })
    roomRef.current = nextRoom
    let active = true
    const onState = (next: ConnectionState) => {
      if (!active) return
      if (next === ConnectionState.Connected) setState('connected')
      else if (next === ConnectionState.Reconnecting) setState('reconnecting')
      else if (next === ConnectionState.Disconnected) setState('disconnected')
    }
    const onDisconnected = () => {
      if (active) onTerminal('Phiên Video đã đóng hoặc không còn khả dụng.')
    }
    nextRoom.on(RoomEvent.ConnectionStateChanged, onState)
    nextRoom.on(RoomEvent.Disconnected, onDisconnected)
    void (async () => {
      try {
        await nextRoom.connect(credential.serverUrl, credential.accessToken)
        if (!active) return
        await nextRoom.localParticipant.setMicrophoneEnabled(
          preferences.audioEnabled && credential.capabilities.publishAudio,
          preferences.audioInputId ? { deviceId: preferences.audioInputId } : undefined,
        )
        await nextRoom.localParticipant.setCameraEnabled(
          preferences.videoEnabled && credential.capabilities.publishVideo,
          preferences.videoInputId ? { deviceId: preferences.videoInputId } : undefined,
        )
        if (active) {
          setRoom(nextRoom)
          setState('connected')
        }
      } catch (reason) {
        if (active) {
          setState('failed')
          setError(liveKitErrorMessage(reason))
          onTerminal(liveKitErrorMessage(reason))
        }
      }
    })()
    return () => {
      active = false
      nextRoom.off(RoomEvent.ConnectionStateChanged, onState)
      nextRoom.off(RoomEvent.Disconnected, onDisconnected)
      nextRoom.disconnect()
      if (roomRef.current === nextRoom) roomRef.current = null
    }
    // A credential defines a single attempt. Preferences are intentionally captured for that attempt only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credential])

  if (error) return <p className="mtg-notice mtg-notice--error" role="alert">{error}</p>
  if (!room) return <p className="mtg-loading" role="status">{labels[state]}</p>

  if (!ai) {
    return (
      <RoomContext.Provider value={room}>
        {controlError && (
          <div className="mtg-notice mtg-notice--error mtg-livekit-control-error" role="alert">
            <p>{controlError}</p>
            <button type="button" className="mtg-text-button" onClick={() => setControlError('')}>
              Đóng thông báo
            </button>
          </div>
        )}
        <LiveKitRoomContent
          room={room}
          title={title}
          connectionState={labels[state]}
          canEnd={canEnd}
          mediaCapabilities={credential.capabilities}
          onLeave={onLeave}
          onEndRequested={onEndRequested}
          onGovernance={onGovernance}
          governanceOpen={governanceOpen}
          onProviderError={(reason) => setControlError(liveKitErrorMessage(reason))}
          sidePanel={governanceOpen ? governance : null}
        />
      </RoomContext.Provider>
    )
  }

  return (
    <RoomContext.Provider value={room}>
      {controlError && (
        <div className="mtg-notice mtg-notice--error mtg-livekit-control-error" role="alert">
          <p>{controlError}</p>
          <button className="mtg-text-button" onClick={() => setControlError('')}>
            Đóng thông báo
          </button>
        </div>
      )}
      <LiveKitRoomWithAi
        room={room}
        credential={credential}
        title={title}
        connectionState={labels[state]}
        canEnd={canEnd}
        onLeave={onLeave}
        onEndRequested={onEndRequested}
        governance={governance}
        governanceOpen={governanceOpen}
        onGovernance={onGovernance}
        onProviderError={(reason) => setControlError(liveKitErrorMessage(reason))}
        ai={ai}
      />
    </RoomContext.Provider>
  )
}

function LiveKitRoomWithAi({
  room,
  credential,
  title,
  connectionState,
  canEnd,
  onLeave,
  onEndRequested,
  governance,
  governanceOpen,
  onGovernance,
  onProviderError,
  ai,
}: {
  room: Room
  credential: MeetingVideoJoinResponse
  title: string
  connectionState: string
  canEnd: boolean
  onLeave: () => void
  onEndRequested: () => void
  governance: ReactNode
  governanceOpen: boolean
  onGovernance: () => void
  onProviderError: (reason: unknown) => void
  ai: LiveKitRoomAiOptions
}) {
  const [sttEnabled, setSttEnabled] = useState(false)
  const [language, setLanguage] = useState('vi-VN')
  const [captionsVisible, setCaptionsVisible] = useState(true)
  const [latestPersistedSegment, setLatestPersistedSegment] =
    useState<MeetingTranscriptSegment | null>(null)
  const [remoteRefreshNonce, setRemoteRefreshNonce] = useState(0)
  const [hasUnreadAiUpdate, setHasUnreadAiUpdate] = useState(false)

  const handleSegmentPersisted = useCallback((seg: MeetingTranscriptSegment) => {
    setLatestPersistedSegment(seg)
  }, [])

  const triggerRemoteRefresh = useCallback(() => {
    setRemoteRefreshNonce((n) => n + 1)
  }, [])

  const handleRemoteInsight = useCallback(() => {
    setRemoteRefreshNonce((n) => n + 1)
    if (!ai.aiOpen) setHasUnreadAiUpdate(true)
  }, [ai.aiOpen])

  const transcription = useMeetingLiveTranscription({
    meetingId: ai.meeting.id,
    room,
    localSpeakerName: credential.participantName,
    language,
    enabled: sttEnabled,
    onSegmentPersisted: handleSegmentPersisted,
    onRemoteCaptionFinal: triggerRemoteRefresh,
    onRemoteInsightUpdated: handleRemoteInsight,
    onRemoteTranscriptSync: triggerRemoteRefresh,
  })

  const sidePanelVisible = ai.aiOpen || governanceOpen

  // Keep MeetingAiCopilotPanel mounted while in the room so closing/reopening preserves Q&A, Coach & Auto-Pulse.
  const activeSidePanel = (
    <>
      <div className="mtg-livekit-side-slot__pane" hidden={!ai.aiOpen}>
        <MeetingAiCopilotPanel
          meeting={ai.meeting}
          variant="room"
          canManage={ai.canManage}
          isSupervisor={ai.isSupervisor}
          currentUserId={ai.currentUserId}
          milestones={ai.milestones}
          onClose={ai.onAiClose}
          onApplyMinutesToNotes={ai.onApplyMinutesToNotes}
          onApplyDecision={ai.onApplyDecision}
          onCreateActionItem={ai.onCreateActionItem}
          onInsightGenerated={() => {
            if (!ai.aiOpen) setHasUnreadAiUpdate(true)
          }}
          liveControls={{
            supported: transcription.supported,
            enabled: sttEnabled,
            onToggleEnabled: () => {
              setSttEnabled((prev) => {
                const next = !prev
                if (next) setCaptionsVisible(true)
                return next
              })
            },
            language,
            onLanguageChange: setLanguage,
            captionsVisible,
            onToggleCaptionsVisible: () => setCaptionsVisible((v) => !v),
            status: transcription.status,
            error: transcription.error,
            onClearError: transcription.clearError,
            liveCaptions: transcription.liveCaptions,
            activeSpeakers: transcription.activeSpeakers,
            latestPersistedSegment,
            remoteRefreshNonce,
            onBroadcastInsightUpdated: transcription.broadcastInsightUpdated,
            onBroadcastTranscriptSync: transcription.broadcastTranscriptSync,
          }}
        />
      </div>
      {governanceOpen && !ai.aiOpen && (
        <div className="mtg-livekit-side-slot__pane">{governance}</div>
      )}
    </>
  )

  return (
    <LiveKitRoomContent
      room={room}
      title={title}
      connectionState={connectionState}
      canEnd={canEnd}
      mediaCapabilities={credential.capabilities}
      onLeave={onLeave}
      onEndRequested={onEndRequested}
      onGovernance={onGovernance}
      governanceOpen={governanceOpen}
      onProviderError={onProviderError}
      captionsOverlay={
        <LiveCaptionsOverlay
          captions={transcription.liveCaptions}
          visible={captionsVisible}
          listening={transcription.status === 'listening'}
          status={transcription.status}
          onHide={() => setCaptionsVisible(false)}
        />
      }
      centerExtras={
        <button
          type="button"
          className={`mtg-meet-dock-btn ${sttEnabled ? 'is-accent' : 'is-neutral'}`}
          aria-label={sttEnabled ? 'Đang đọc lời nói' : 'Phụ đề AI'}
          aria-pressed={sttEnabled}
          disabled={!transcription.supported || ai.meeting.status === 'CANCELLED'}
          title={
            transcription.supported
              ? 'Bật/tắt nhận diện giọng nói & phụ đề AI trực tiếp'
              : 'Trình duyệt không hỗ trợ nhận diện giọng nói trực tiếp'
          }
          onClick={() => {
            setSttEnabled((prev) => {
              const next = !prev
              if (next) setCaptionsVisible(true)
              return next
            })
          }}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {sttEnabled ? 'subtitles' : 'subtitles_off'}
          </span>
        </button>
      }
      rightExtras={
        <button
          type="button"
          className={`mtg-meet-tool-btn mtg-meet-tool-btn--ai ${ai.aiOpen ? 'is-active' : ''}`}
          aria-expanded={ai.aiOpen}
          title="Mở Trợ lý AI Cuộc họp (Lời nói, Tóm tắt, Hỏi AI & Điều phối)"
          onClick={() => {
            setHasUnreadAiUpdate(false)
            ai.onAiToggle()
          }}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            auto_awesome
          </span>
          <span>Trợ lý AI</span>
          {!ai.aiOpen && (hasUnreadAiUpdate || sttEnabled) && (
            <span className="mtg-meet-tool-dot" aria-hidden="true" />
          )}
        </button>
      }
      sidePanel={activeSidePanel}
      sidePanelVisible={sidePanelVisible}
    />
  )
}
