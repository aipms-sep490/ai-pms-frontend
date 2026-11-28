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

function sessionBadge(session: MeetingVideoSession | null): { label: string; tone: string } {
  if (!session) return { label: 'Chưa mở phòng', tone: 'idle' }
  if (session.status === 'LIVE') return { label: 'Đang diễn ra', tone: 'live' }
  if (session.status === 'CREATED') return { label: 'Đang chuẩn bị', tone: 'pending' }
  if (session.status === 'ENDED') return { label: 'Đã kết thúc', tone: 'ended' }
  return { label: 'Cần kiểm tra', tone: 'error' }
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
  const softWindowCodes = new Set(['VIDEO_JOIN_TOO_EARLY', 'VIDEO_JOIN_WINDOW_CLOSED'])
  const windowWarningMessages = (resource?.denialReasons ?? []).filter(code => softWindowCodes.has(code)).map(meetingVideoErrorCode)
  const denialMessages = (resource?.denialReasons ?? []).filter(code => !softWindowCodes.has(code)).map(meetingVideoErrorCode)
  const roomPath = `${routeBase}/meetings/${meeting.id}/video`
  const badge = sessionBadge(resource?.session ?? null)
  const hasActions = Boolean(resource && (resource.capabilities.canStart || resource.capabilities.canJoin))

  return (
    <section
      className={`mtg-video-banner ${badge.tone === 'live' ? 'mtg-video-banner--live' : ''}`}
      aria-labelledby="meeting-video-title"
    >
      <div className="mtg-video-banner__row">
        <div className="mtg-video-banner__main">
          <span className={`mtg-video-banner__icon mtg-video-banner__icon--${badge.tone}`} aria-hidden="true">
            <span className="material-symbols-outlined">
              {badge.tone === 'live' ? 'video_camera_front' : 'videocam'}
            </span>
          </span>
          <div className="mtg-video-banner__copy">
            <div className="mtg-video-banner__title-row">
              <h2 id="meeting-video-title">Phòng họp trực tuyến</h2>
              {resource && (
                <span className={`mtg-video-pill mtg-video-pill--${badge.tone}`}>
                  {badge.tone === 'live' && <span className="mtg-video-pill__dot" aria-hidden="true" />}
                  {badge.label}
                </span>
              )}
            </div>
            {state.status === 'loading' && (
              <p className="mtg-video-banner__desc" role="status">
                Đang tải quyền truy cập Video…
              </p>
            )}
            {resource && <p className="mtg-video-banner__desc">{sessionCopy(resource.session)}</p>}
          </div>
        </div>

        {hasActions && resource && (
          <div className="mtg-video-banner__actions">
            {resource.capabilities.canStart && (
              <button
                type="button"
                className="mtg-button"
                disabled={starting}
                onClick={() => void start()}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  video_call
                </span>
                {starting ? 'Đang bắt đầu…' : 'Mở phòng họp'}
              </button>
            )}
            {resource.capabilities.canJoin && (
              <Link
                className={`mtg-button ${resource.capabilities.canStart ? 'mtg-button--secondary' : ''}`}
                to={roomPath}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  login
                </span>
                Kiểm tra trước khi tham gia
              </Link>
            )}
          </div>
        )}
      </div>

      {state.status === 'error' && (
        <div className="mtg-notice mtg-notice--error mtg-video-banner__alert" role="alert">
          <p>{state.message}</p>
          <button type="button" className="mtg-button mtg-button--secondary" onClick={refresh}>
            Tải lại quyền Video
          </button>
        </div>
      )}

      {windowWarningMessages.length > 0 && (
        <ul className="mtg-notice mtg-video-banner__alert rounded-lg border border-status-warning-border bg-status-warning-bg px-3 py-2 text-sm text-status-warning-text" role="status">
          {windowWarningMessages.map((message, index) => (
            <li key={`warn-${index}`} className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base" aria-hidden="true">schedule</span>
              <span>Cảnh báo khung giờ (không chặn vào phòng): {message}</span>
            </li>
          ))}
        </ul>
      )}

      {denialMessages.length > 0 && (
        <ul className="mtg-video-banner__denials" role="alert">
          {denialMessages.map((message, index) => (
            <li key={`${message}-${index}`}>
              <span className="material-symbols-outlined" aria-hidden="true">info</span>
              <span>{message}</span>
            </li>
          ))}
        </ul>
      )}

      {actionError && (
        <p className="mtg-notice mtg-notice--error mtg-video-banner__alert" role="alert">
          {actionError}
        </p>
      )}
    </section>
  )
}
