import { useEffect, useState } from 'react'
import type { Room } from 'livekit-client'
import type { MeetingVideoJoinCapabilities } from '../../meeting-video.types'

export function LiveKitMediaControls({ room, capabilities, onError }: { room: Room; capabilities: MeetingVideoJoinCapabilities; onError: (reason: unknown) => void }) {
  const [microphone, setMicrophone] = useState(room.localParticipant.isMicrophoneEnabled)
  const [camera, setCamera] = useState(room.localParticipant.isCameraEnabled)
  const [screenShare, setScreenShare] = useState(room.localParticipant.isScreenShareEnabled)
  useEffect(() => { setMicrophone(room.localParticipant.isMicrophoneEnabled); setCamera(room.localParticipant.isCameraEnabled); setScreenShare(room.localParticipant.isScreenShareEnabled) }, [room])
  async function toggle(kind: 'microphone' | 'camera' | 'screen') {
    try {
      if (kind === 'microphone') { const value = !microphone; await room.localParticipant.setMicrophoneEnabled(value); setMicrophone(value) }
      if (kind === 'camera') { const value = !camera; await room.localParticipant.setCameraEnabled(value); setCamera(value) }
      if (kind === 'screen') { const value = !screenShare; await room.localParticipant.setScreenShareEnabled(value); setScreenShare(value) }
    } catch (reason) { onError(reason) }
  }
  return <div className="mtg-livekit-controls" aria-label="Điều khiển âm thanh và hình ảnh">
    {capabilities.publishAudio && <button className="mtg-button mtg-button--secondary" aria-pressed={microphone} onClick={() => void toggle('microphone')}>Micrô: {microphone ? 'Bật' : 'Tắt'}</button>}
    {capabilities.publishVideo && <button className="mtg-button mtg-button--secondary" aria-pressed={camera} onClick={() => void toggle('camera')}>Camera: {camera ? 'Bật' : 'Tắt'}</button>}
    {capabilities.screenShare && <button className="mtg-button mtg-button--secondary" aria-pressed={screenShare} onClick={() => void toggle('screen')}>Chia sẻ màn hình: {screenShare ? 'Đang chia sẻ' : 'Tắt'}</button>}
  </div>
}
