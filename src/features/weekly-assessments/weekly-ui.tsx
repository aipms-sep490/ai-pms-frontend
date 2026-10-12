import type { ReactNode } from 'react'
import { ListLoading } from '../../components/ui/ListLoading'
import { weeklyStatusLabel } from './weekly-types'
import type { WeeklyAssessmentStatus } from '../../services/api/weekly.api'
import { ExecutionPage } from '../execution/execution-ui'
import './weekly-assessments.css'

export function WeeklyBadge({ status }: { status: WeeklyAssessmentStatus }) {
  return <span className={`weekly-badge weekly-badge--${status.toLowerCase()}`}>{weeklyStatusLabel(status)}</span>
}

export function WeeklyShell({ title, description, projectTitle, backTo, children, action }: {
  title: string; description: string; projectTitle: string; backTo: string; children: ReactNode; action?: ReactNode
}) {
  return <section className="weekly-assessments"><ExecutionPage title={title} description={description} eyebrow={`Điểm cá nhân theo tuần • ${projectTitle}`} backTo={backTo} action={action}>{children}</ExecutionPage></section>
}

export function WeeklyLoading() {
  return <ListLoading label="Đang tải dữ liệu chấm tuần…" />
}

export function WeeklyError({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="weekly-notice weekly-notice--error" role="alert"><p>{message}</p>{retry && <button className="weekly-button weekly-button--secondary" type="button" onClick={retry}>Tải lại</button>}</div>
}
