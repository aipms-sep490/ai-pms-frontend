import { useEffect, useState } from 'react'
import type { Room } from 'livekit-client'
import type { MeetingVideoJoinCapabilities } from '../../meeting-video.types'

export function LiveKitMediaControls({
  room,
  capabilities,
  onError,
}: {
  room: Room
  capabilities: MeetingVideoJoinCapabilities
  onError: (reason: unknown) => void
}) {
  const [microphone, setMicrophone] = useState(room.localParticipant.isMicrophoneEnabled)
  const [camera, setCamera] = useState(room.localParticipant.isCameraEnabled)
  const [screenShare, setScreenShare] = useState(room.localParticipant.isScreenShareEnabled)

  useEffect(() => {
    setMicrophone(room.localParticipant.isMicrophoneEnabled)
    setCamera(room.localParticipant.isCameraEnabled)
    setScreenShare(room.localParticipant.isScreenShareEnabled)
  }, [room])

  async function toggle(kind: 'microphone' | 'camera' | 'screen') {
    try {
      if (kind === 'microphone') {
        const value = !microphone
        await room.localParticipant.setMicrophoneEnabled(value)
        setMicrophone(value)
      }
      if (kind === 'camera') {
        const value = !camera
        await room.localParticipant.setCameraEnabled(value)
        setCamera(value)
      }
      if (kind === 'screen') {
        const value = !screenShare
        await room.localParticipant.setScreenShareEnabled(value)
        setScreenShare(value)
      }
    } catch (reason) {
      onError(reason)
    }
  }

  const micLabel = `Micrô: ${microphone ? 'Bật' : 'Tắt'}`
  const camLabel = `Camera: ${camera ? 'Bật' : 'Tắt'}`
  const screenLabel = `Chia sẻ màn hình: ${screenShare ? 'Đang chia sẻ' : 'Tắt'}`

  return (
    <div className="mtg-livekit-controls" aria-label="Điều khiển âm thanh và hình ảnh">
      {capabilities.publishAudio && (
        <button
          type="button"
          className={`mtg-meet-dock-btn ${microphone ? 'is-neutral' : 'is-muted'}`}
          aria-label={micLabel}
          aria-pressed={microphone}
          title={micLabel}
          onClick={() => void toggle('microphone')}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {microphone ? 'mic' : 'mic_off'}
          </span>
        </button>
      )}
      {capabilities.publishVideo && (
        <button
          type="button"
          className={`mtg-meet-dock-btn ${camera ? 'is-neutral' : 'is-muted'}`}
          aria-label={camLabel}
          aria-pressed={camera}
          title={camLabel}
          onClick={() => void toggle('camera')}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {camera ? 'videocam' : 'videocam_off'}
          </span>
        </button>
      )}
      {capabilities.screenShare && (
        <button
          type="button"
          className={`mtg-meet-dock-btn ${screenShare ? 'is-accent' : 'is-neutral'}`}
          aria-label={screenLabel}
          aria-pressed={screenShare}
          title={screenLabel}
          onClick={() => void toggle('screen')}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {screenShare ? 'stop_screen_share' : 'present_to_all'}
          </span>
        </button>
      )}
    </div>
  )
}
