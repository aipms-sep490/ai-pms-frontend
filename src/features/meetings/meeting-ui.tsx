import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { meetingStatuses, type MeetingStatus } from './meeting-types'
import './meetings.css'

export function MeetingStatusBadge({ status }: { status: MeetingStatus }) {
  return <span className={`mtg-status mtg-status--${status.toLowerCase()}`}>{meetingStatuses[status] ?? status}</span>
}
export function MeetingShell({ title, projectTitle, backTo, action, children }: {
  title: string; projectTitle: string; backTo: string; action?: ReactNode; children: ReactNode
}) {
  return <section className="meetings"><Link className="mtg-back" to={backTo}>← Không gian đồ án</Link>
    <header className="mtg-header"><div><p className="mtg-eyebrow">Trao đổi & hướng dẫn • {projectTitle}</p><h1>{title}</h1><p>Lên lịch, ghi lại kết luận và thống nhất bước tiếp theo cùng giảng viên.</p></div>{action}</header>
    {children}
  </section>
}
export function MeetingError({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="mtg-notice mtg-notice--error" role="alert"><p>{message}</p>{retry && <button type="button" className="mtg-button mtg-button--secondary" onClick={retry}>Tải lại</button>}</div>
}
export function MeetingLoading() {
  return <div className="mtg-loading" role="status"><p>Đang tải cuộc họp…</p><div /><div /><div /></div>
}
