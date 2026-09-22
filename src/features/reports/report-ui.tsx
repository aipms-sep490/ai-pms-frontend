import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { reportStatusLabels, type ReportStatus } from './report-types'
import './reports.css'

export function ReportBadge({ status }: { status: ReportStatus }) {
  return <span className={`report-badge report-badge--${status.toLowerCase()}`}>{reportStatusLabels[status] ?? status}</span>
}

export function ReportShell({ title, description, projectTitle, backTo, children, action }: {
  title: string; description: string; projectTitle: string; backTo: string; children: ReactNode; action?: ReactNode
}) {
  return <section className="reports">
    <Link className="report-back" to={backTo}>← Quay lại không gian đồ án</Link>
    <header className="report-header">
      <div><p className="report-eyebrow">Theo dõi thực hiện • {projectTitle}</p><h1>{title}</h1><p className="report-description">{description}</p></div>
      {action}
    </header>
    {children}
  </section>
}

export function ReportLoading() {
  return <div className="report-loading" role="status"><span>Đang tải báo cáo…</span><div /><div /><div /></div>
}

export function ReportError({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="report-notice report-notice--error" role="alert"><p>{message}</p>{retry && <button className="report-button report-button--secondary" type="button" onClick={retry}>Tải lại</button>}</div>
}
