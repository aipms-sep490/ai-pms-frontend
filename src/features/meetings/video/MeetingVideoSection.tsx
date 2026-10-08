import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { env } from '../../../app/config/env'
import type { MeetingDetail } from '../meeting-types'
import { startMeetingVideo } from './meeting-video-api'
import { meetingVideoError, meetingVideoErrorCode } from './meeting-video-errors'
import type { MeetingVideoSession } from './meeting-video.types'
import { useMeetingVideoAccess } from './useMeetingVideoAccess'

function sessionCopy(session: MeetingVideoSession | null) {
  if (!session) return 'Phòng họp chưa được bắt đầu.'
  if (session.status === 'CREATED') return 'Phòng họp đang được chuẩn bị.'
  if (session.status === 'LIVE') return 'Phiên Video đang diễn ra.'
  if (session.status === 'ENDED') return 'Phiên Video đã kết thúc. Lịch họp vẫn có thể giữ trạng thái đã lên lịch.'
  return 'Phiên Video gặp sự cố. Hãy tải lại trạng thái hoặc liên hệ người tổ chức.'
}

export function MeetingVideoSection({ meeting, routeBase }: { meeting: MeetingDetail; routeBase: string }) {
  const { state, refresh, enabled } = useMeetingVideoAccess(meeting)
  const [actionError, setActionError] = useState('')
  const [starting, setStarting] = useState(false)
  const startLock = useRef(false)
  const isInApp = enabled && meeting.videoChannel === 'IN_APP_VIDEO'

  async function start() {
    if (startLock.current || state.status !== 'ready' || !state.resource.capabilities.canStart) return
    startLock.current = true
    setStarting(true)
    setActionError('')
    try {
      await startMeetingVideo(meeting.id)
    } catch (reason) {
      setActionError(meetingVideoError(reason))
    } finally {
      startLock.current = false
      setStarting(false)
      // A successful, forbidden, or conflict response may all have changed the canonical state.
      refresh()
    }
  }

  // Feature-off and non-in-app meetings keep the existing Meeting detail exactly as-is.
  if (!env.videoMeetingEnabled || !isInApp) return null

  const resource = state.status === 'ready' ? state.resource : null
  const denialMessages = resource?.denialReasons.map(meetingVideoErrorCode) ?? []
  const roomPath = `${routeBase}/meetings/${meeting.id}/video`

  return <section className="mtg-panel mtg-padded mtg-video-section" aria-labelledby="meeting-video-title">
    <div className="mtg-section-heading"><div><p className="mtg-eyebrow">HỌP TRỰC TUYẾN</p><h2 id="meeting-video-title">Phòng họp trực tuyến</h2></div></div>
    {state.status === 'loading' && <p className="mtg-help" role="status">Đang tải quyền truy cập Video…</p>}
    {state.status === 'error' && <div className="mtg-notice mtg-notice--error" role="alert"><p>{state.message}</p><button className="mtg-button mtg-button--secondary" onClick={refresh}>Tải lại quyền Video</button></div>}
    {resource && <>
      <p className="mtg-prose">{sessionCopy(resource.session)}</p>
      {denialMessages.length > 0 && <ul className="mtg-video-denials" role="alert">{denialMessages.map((message, index) => <li key={`${message}-${index}`}>{message}</li>)}</ul>}
      {actionError && <p className="mtg-notice mtg-notice--error" role="alert">{actionError}</p>}
      <div className="mtg-actions mtg-video-actions">
        {resource.capabilities.canStart && <button className="mtg-button" disabled={starting} onClick={() => void start()}>{starting ? 'Đang bắt đầu…' : 'Mở phòng họp'}</button>}
        {resource.capabilities.canJoin && <Link className="mtg-button mtg-button--secondary" to={roomPath}>Kiểm tra trước khi tham gia</Link>}
      </div>
    </>}
  </section>
}
