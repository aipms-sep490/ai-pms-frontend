import { useEffect, useState, type ReactNode } from 'react'
import { RoomAudioRenderer, useParticipants } from '@livekit/components-react'
import type { Room } from 'livekit-client'
import type { MeetingVideoJoinCapabilities } from '../../meeting-video.types'
import { LiveKitMediaControls } from './LiveKitMediaControls'
import { LiveKitParticipantGrid } from './LiveKitParticipantGrid'

function formatClock(): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date())
}

export function LiveKitRoomContent({
  room,
  title,
  connectionState,
  canEnd,
  mediaCapabilities,
  onLeave,
  onEndRequested,
  onGovernance,
  onProviderError,
  governanceOpen,
  captionsOverlay,
  centerExtras,
  rightExtras,
  sidePanel,
  sidePanelVisible,
}: {
  room: Room
  title: string
  connectionState: string
  canEnd: boolean
  mediaCapabilities: MeetingVideoJoinCapabilities
  onLeave: () => void
  onEndRequested: () => void
  onGovernance: () => void
  onProviderError: (reason: unknown) => void
  governanceOpen: boolean
  captionsOverlay?: ReactNode
  centerExtras?: ReactNode
  rightExtras?: ReactNode
  sidePanel?: ReactNode
  sidePanelVisible?: boolean
}) {
  const isSideVisible = sidePanelVisible ?? Boolean(sidePanel)
  const participants = useParticipants()
  const [clock, setClock] = useState(formatClock)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const timer = window.setInterval(() => setClock(formatClock()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  function toggleFullscreen() {
    if (typeof document === 'undefined') return
    if (document.fullscreenElement) {
      void document.exitFullscreen?.().catch(() => undefined)
    } else {
      void document.documentElement.requestFullscreen?.().catch(() => undefined)
    }
  }

  return (
    <div className="mtg-livekit-room">
      <RoomAudioRenderer room={room} />

      {/* Minimal Google Meet-style dark top status strip */}
      <header className="mtg-livekit-header">
        <div className="mtg-livekit-header__left">
          <span className="mtg-livekit-live-dot" aria-hidden="true" />
          <h2 className="mtg-livekit-header__title" title={title}>
            {title}
          </h2>
          <span role="status" className="mtg-livekit-header__meta">
            {connectionState} · {participants.length} người tham gia
          </span>
        </div>
        <div className="mtg-livekit-header__right">
          {typeof document !== 'undefined' && document.fullscreenEnabled && (
            <button
              type="button"
              className="mtg-meet-top-btn"
              aria-label={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
              title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
              onClick={toggleFullscreen}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
              </span>
            </button>
          )}
          {canEnd && (
            <button
              type="button"
              className="mtg-meet-end-btn"
              onClick={onEndRequested}
            >
              <span className="material-symbols-outlined" aria-hidden="true">power_settings_new</span>
              <span>Kết thúc phòng</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Theater Body: Full-height Video Stage + In-Room Side Panel (AI / Governance) */}
      <div className={`mtg-livekit-body ${isSideVisible ? 'has-side-panel' : ''}`}>
        <div className="mtg-livekit-stage-wrap">
          <LiveKitParticipantGrid />
          {captionsOverlay}
        </div>
        {sidePanel && (
          <div className="mtg-livekit-side-slot" hidden={!isSideVisible}>
            {sidePanel}
          </div>
        )}
      </div>

      {/* Google Meet Bottom Control Dock */}
      <footer className="mtg-livekit-footer">
        <div className="mtg-livekit-dock__left">
          <span className="mtg-livekit-clock">{clock}</span>
          <span className="mtg-livekit-dock__sep" aria-hidden="true">|</span>
          <span className="mtg-livekit-dock__title" title={title}>
            {title}
          </span>
        </div>

        <div className="mtg-livekit-dock__center">
          <LiveKitMediaControls room={room} capabilities={mediaCapabilities} onError={onProviderError} />
          {centerExtras}
          <button
            type="button"
            className="mtg-meet-leave-btn"
            aria-label="Rời phòng"
            title="Rời phòng"
            onClick={onLeave}
          >
            <span className="material-symbols-outlined" aria-hidden="true">call_end</span>
            <span>Rời phòng</span>
          </button>
        </div>

        <div className="mtg-livekit-dock__right">
          {rightExtras}
          <button
            type="button"
            className={`mtg-meet-tool-btn ${governanceOpen ? 'is-active' : ''}`}
            aria-label="Quản trị cuộc họp"
            aria-expanded={governanceOpen}
            title="Quản trị cuộc họp & biên bản"
            onClick={onGovernance}
          >
            <span className="material-symbols-outlined" aria-hidden="true">assignment</span>
            <span>Quản trị</span>
          </button>
        </div>
      </footer>
    </div>
  )
}
