import type { ReactNode } from 'react'
import { ListLoading } from '../../components/ui/ListLoading'
import { meetingStatuses, type MeetingStatus } from './meeting-types'
import { ExecutionPage } from '../execution/execution-ui'
import './meetings.css'

export function MeetingStatusBadge({ status }: { status: MeetingStatus }) {
  return <span className={`mtg-status mtg-status--${status.toLowerCase()}`}>{meetingStatuses[status] ?? status}</span>
}
export function MeetingShell({ title, projectTitle, backTo, action, description = 'Sắp xếp lịch họp, ghi lại kết luận và thống nhất việc cần làm tiếp theo.', children }: {
  title: string; projectTitle: string; backTo: string; action?: ReactNode; description?: string; children: ReactNode
}) {
  return <section className="meetings mk-page-enter"><ExecutionPage title={title} description={description} eyebrow={`Trao đổi và hướng dẫn • ${projectTitle}`} backTo={backTo} action={action}>{children}</ExecutionPage></section>
}
export function MeetingError({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="mtg-notice mtg-notice--error" role="alert"><p>{message}</p>{retry && <button type="button" className="mtg-button mtg-button--secondary" onClick={retry}>Tải lại</button>}</div>
}
export function MeetingLoading() {
  return <ListLoading label="Đang tải cuộc họp…" />
}
