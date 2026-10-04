import { useEffect, useState } from 'react'
import { env } from '../../../app/config/env'
import { HttpError } from '../../../services/http/http-client'
import { attendanceStatuses, type MeetingDetail } from '../meeting-types'
import { getMeetingVideoPresence } from './meeting-video-api'
import type { MeetingVideoPresenceSummary } from './meeting-video.types'
import { formatPresenceDuration, formatPresenceTime } from './meeting-video-presence-utils'

type PresenceState = { status: 'idle' | 'loading' } | { status: 'ready'; data: MeetingVideoPresenceSummary } | { status: 'error'; message: string }

function evidenceError(reason: unknown) {
  if (!(reason instanceof HttpError)) return 'Không thể tải bằng chứng kết nối. Hãy kiểm tra mạng rồi thử lại.'
  if (reason.status === 403) return 'Tài khoản hiện tại không được phép xem bằng chứng kết nối.'
  if (reason.status === 404) return 'Bằng chứng kết nối chưa được hệ thống Video cung cấp cho cuộc họp này.'
  if (reason.status === 409) return 'Trạng thái cuộc họp đã thay đổi. Hãy tải lại bằng chứng kết nối.'
  if (reason.status === 503) return 'Dịch vụ bằng chứng kết nối đang tạm thời không khả dụng. Hãy thử lại sau.'
  return 'Không thể tải bằng chứng kết nối. Hãy thử lại sau.'
}

export function MeetingVideoPresencePanel({ meeting }: { meeting: MeetingDetail }) {
  const enabled = env.videoMeetingEnabled && meeting.videoChannel === 'IN_APP_VIDEO'
  const [opened, setOpened] = useState(false)
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<PresenceState>({ status: 'idle' })

  useEffect(() => {
    if (!enabled || !opened) { setState({ status: 'idle' }); return }
    const controller = new AbortController()
    setState({ status: 'loading' })
    getMeetingVideoPresence(meeting.id, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setState({ status: 'ready', data }) })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setState({ status: 'error', message: evidenceError(reason) }) })
    return () => controller.abort()
  }, [enabled, opened, meeting.id, revision])

  if (!enabled) return null
  const participants = new Map(meeting.participants.map((participant) => [participant.userId, participant]))
  return <section className="mtg-panel mtg-padded mtg-video-presence" aria-labelledby="meeting-video-presence-title">
    <div className="mtg-section-heading"><div><p className="mtg-eyebrow">BẰNG CHỨNG HỖ TRỢ</p><h2 id="meeting-video-presence-title">Dữ liệu tham gia phòng trực tuyến</h2></div>{!opened && <button className="mtg-button mtg-button--secondary" onClick={() => setOpened(true)}>Xem dữ liệu kết nối</button>}</div>
    <p className="mtg-help">Dữ liệu kết nối là bằng chứng hỗ trợ điểm danh và không tự thay đổi trạng thái điểm danh chính thức.</p>
    {state.status === 'loading' && <p className="mtg-help" role="status">Đang tải bằng chứng kết nối…</p>}
    {state.status === 'error' && <div className="mtg-notice mtg-notice--error" role="alert"><p>{state.message}</p><button className="mtg-button mtg-button--secondary" onClick={() => setRevision((value) => value + 1)}>Thử tải lại</button></div>}
    {state.status === 'ready' && (state.data.participants.length === 0 ? <p className="mtg-help">Chưa có bằng chứng kết nối được hệ thống trả về.</p> : <ul className="mtg-presence-list">{state.data.participants.map((record) => {
      const participant = participants.get(record.userId)
      return <li key={record.userId}><h3>{participant?.fullName ?? `Người tham gia #${record.userId}`}</h3><dl><div><dt>Tham gia lần đầu</dt><dd>{formatPresenceTime(record.firstJoinedAt)}</dd></div><div><dt>Rời lần cuối</dt><dd>{formatPresenceTime(record.lastLeftAt, 'Đang kết nối')}</dd></div><div><dt>Thời gian kết nối</dt><dd>{formatPresenceDuration(record.totalConnectedSeconds)}</dd></div><div><dt>Số lần kết nối</dt><dd>{record.connectionCount}</dd></div><div><dt>Điểm danh chính thức</dt><dd>{participant?.attendanceStatus ? attendanceStatuses[participant.attendanceStatus] : 'Chưa cập nhật'}</dd></div></dl></li>
    })}</ul>)}
  </section>
}
