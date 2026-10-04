import { ParticipantTile, TrackLoop, useTracks } from '@livekit/components-react'
import { Track } from 'livekit-client'

export function LiveKitParticipantGrid() {
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ])
  return <section className="mtg-livekit-grid" aria-label="Người tham gia Video">
    {tracks.length === 0 ? <p className="mtg-livekit-empty">Đang chờ người tham gia hoặc camera. Âm thanh từ người tham gia từ xa vẫn được phát khi có.</p> : <TrackLoop tracks={tracks}><ParticipantTile className="mtg-livekit-tile" /></TrackLoop>}
  </section>
}
