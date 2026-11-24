import type { ReactNode } from 'react'
import { ListLoading } from '../../components/ui/ListLoading'
import { StatusBadge } from '../../components/ui'
import type { BadgeTone } from '../../components/ui/status-badge-tone'
import { reportStatusLabels, type ReportStatus } from './report-types'
import { ExecutionPage } from '../execution/execution-ui'
import './reports.css'

const reportStatusTone: Record<ReportStatus, BadgeTone> = {
  DRAFT: 'neutral',
  SUBMITTED: 'warning',
  REVIEWED: 'success',
}

export function ReportBadge({ status }: { status: ReportStatus }) {
  return <StatusBadge status={status} tone={reportStatusTone[status] ?? 'neutral'} label={reportStatusLabels[status] ?? status} />
}

export function ReportShell({ title, description, projectTitle, backTo, children, action }: {
  title: string; description: string; projectTitle: string; backTo: string; children: ReactNode; action?: ReactNode
}) {
  return <section className="reports"><ExecutionPage title={title} description={description} eyebrow={`Theo dõi thực hiện • ${projectTitle}`} backTo={backTo} action={action}>{children}</ExecutionPage></section>
}

export function ReportLoading() {
  return <ListLoading label="Đang tải báo cáo…" />
}

export function ReportError({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="report-notice report-notice--error" role="alert"><p>{message}</p>{retry && <button className="report-button report-button--secondary" type="button" onClick={retry}>Tải lại</button>}</div>
}
