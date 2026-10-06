import { RoomAudioRenderer, useParticipants } from '@livekit/components-react'
import type { Room } from 'livekit-client'
import type { MeetingVideoJoinCapabilities } from '../../meeting-video.types'
import { LiveKitMediaControls } from './LiveKitMediaControls'
import { LiveKitParticipantGrid } from './LiveKitParticipantGrid'

export function LiveKitRoomContent({ room, title, connectionState, canEnd, mediaCapabilities, onLeave, onEndRequested, onGovernance, onProviderError, governanceOpen }: {
  room: Room; title: string; connectionState: string; canEnd: boolean; mediaCapabilities: MeetingVideoJoinCapabilities; onLeave: () => void; onEndRequested: () => void
  onGovernance: () => void; onProviderError: (reason: unknown) => void; governanceOpen: boolean
}) {
  const participants = useParticipants()
  return <div className="mtg-livekit-room">
    <RoomAudioRenderer room={room} />
    <header className="mtg-livekit-header"><div><p className="mtg-eyebrow">PHÒNG HỌP TRỰC TUYẾN</p><h2>{title}</h2><p role="status" className="mtg-help">{connectionState} · {participants.length} người tham gia</p></div><div className="mtg-actions"><button className="mtg-button mtg-button--secondary" onClick={onLeave}>Rời phòng</button>{canEnd && <button className="mtg-button mtg-button--danger" onClick={onEndRequested}>Kết thúc phòng</button>}</div></header>
    <LiveKitParticipantGrid />
    <div className="mtg-livekit-footer"><LiveKitMediaControls room={room} capabilities={mediaCapabilities} onError={onProviderError} /><button className="mtg-button mtg-button--secondary" aria-expanded={governanceOpen} onClick={onGovernance}>Quản trị cuộc họp</button></div>
  </div>
}
