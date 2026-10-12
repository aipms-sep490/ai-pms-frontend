import type { ReactNode } from 'react'
import { ListLoading } from '../../components/ui/ListLoading'
import { coldStatusLabel } from './cold-types'
import type { ColdSubmissionStatus } from '../../services/api/cold.api'
import { ExecutionPage } from '../execution/execution-ui'
import './cold-reports.css'

export function ColdBadge({ status }: { status: ColdSubmissionStatus }) {
  return <span className={`cold-badge cold-badge--${status.toLowerCase()}`}>{coldStatusLabel(status)}</span>
}

export function ColdShell({ title, description, projectTitle, backTo, children, action }: {
  title: string; description: string; projectTitle: string; backTo: string; children: ReactNode; action?: ReactNode
}) {
  return <section className="cold-reports"><ExecutionPage title={title} description={description} eyebrow={`Chấm nguội • ${projectTitle}`} backTo={backTo} action={action}>{children}</ExecutionPage></section>
}

export function ColdLoading() {
  return <ListLoading label="Đang tải danh sách báo cáo…" />
}

export function ColdError({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="cold-notice cold-notice--error" role="alert"><p>{message}</p>{retry && <button className="cold-button cold-button--secondary" type="button" onClick={retry}>Tải lại</button>}</div>
}
