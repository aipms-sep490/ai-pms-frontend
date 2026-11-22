import { useMemo, useState } from 'react'
import type { AssistantDiagnosticItem, AssistantStructuredReport } from '../academic-ai-api'

const categoryLabels: Record<AssistantDiagnosticItem['category'], { label: string; icon: string }> = {
  DOCUMENT: { label: 'Tài liệu & Bàn giao', icon: 'description' },
  COLD_REPORT: { label: 'Chấm nguội', icon: 'fact_check' },
  REVIEW_GATE: { label: 'Review Gates', icon: 'flag_circle' },
  TASK: { label: 'Công việc', icon: 'checklist' },
  MILESTONE: { label: 'Mốc tiến độ', icon: 'flag' },
  EVIDENCE: { label: 'Minh chứng', icon: 'verified' },
}

const statusMeta: Record<AssistantDiagnosticItem['status'], { label: string; tone: string }> = {
  DONE: { label: 'Đã xong', tone: 'is-success' },
  IN_PROGRESS: { label: 'Đang làm', tone: 'is-info' },
  PENDING_REVIEW: { label: 'Chờ duyệt', tone: 'is-info' },
  NEEDS_REVISION: { label: 'Cần sửa', tone: 'is-warning' },
  OVERDUE: { label: 'Quá hạn', tone: 'is-danger' },
  BLOCKED: { label: 'Bị chặn', tone: 'is-danger' },
  MISSING: { label: 'Còn thiếu', tone: 'is-warning' },
}

const stageLabel = (stage?: string | null) => {
  switch ((stage ?? '').toUpperCase()) {
    case 'ACTIVE': return 'Đang thực hiện'
    case 'FINAL_SUBMISSION': return 'Bàn giao cuối kỳ'
    case 'COMPLETED': return 'Đã hoàn thành'
    case 'ARCHIVED': return 'Đã lưu trữ'
    default: return stage || ''
  }
}

const formatDue = (value?: string | null) => {
  if (!value) return null
  const normalized = value.endsWith('Z') || /[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })
}

export function AssistantStructuredReportView({
  report,
  onOpenTarget,
}: {
  report: AssistantStructuredReport
  onOpenTarget?: (target: string, resourceId?: number | null) => void
}) {
  const [filter, setFilter] = useState<'ALL' | AssistantDiagnosticItem['category']>('ALL')
  const categories = useMemo(
    () => [...new Set(report.items.map(item => item.category))],
    [report.items],
  )
  const visible = filter === 'ALL' ? report.items : report.items.filter(item => item.category === filter)
  const { coverage } = report

  return (
    <section className="assistant-structured" aria-label={report.summaryTitle || 'Chi tiết ngữ cảnh đồ án'}>
      <header className="assistant-structured-header">
        <div>
          <p className="assistant-structured-kicker">
            <span className="material-symbols-outlined" aria-hidden="true">analytics</span>
            {report.summaryTitle}
          </p>
          {coverage.projectTitle && (
            <p className="assistant-structured-project">
              <strong>{coverage.projectTitle}</strong>
              {coverage.projectStage ? ` · ${stageLabel(coverage.projectStage)}` : ''}
            </p>
          )}
        </div>
        <div className="assistant-coverage-pills" aria-label="Phạm vi dữ liệu đã đọc">
          <span>Công việc {coverage.tasksScanned}/{coverage.tasksTotal}</span>
          <span>Tài liệu {coverage.deliverablesCount}</span>
          {coverage.coldItemsCount > 0 && <span>Chấm nguội {coverage.coldItemsCount}</span>}
          {coverage.reviewGatesCount > 0 && <span>Gates {coverage.reviewGatesCount}</span>}
        </div>
      </header>

      {categories.length > 1 && report.items.length > 3 && (
        <div className="assistant-structured-filters" role="tablist" aria-label="Lọc theo nhóm đối tượng">
          <button type="button" role="tab" aria-selected={filter === 'ALL'} onClick={() => setFilter('ALL')}>
            Tất cả ({report.items.length})
          </button>
          {categories.map(cat => (
            <button key={cat} type="button" role="tab" aria-selected={filter === cat} onClick={() => setFilter(cat)}>
              {categoryLabels[cat]?.label ?? cat} ({report.items.filter(i => i.category === cat).length})
            </button>
          ))}
        </div>
      )}

      <ul className="assistant-diagnostic-list">
        {visible.map((item, idx) => {
          const cat = categoryLabels[item.category] ?? { label: item.category, icon: 'info' }
          const st = statusMeta[item.status] ?? { label: item.status, tone: 'is-info' }
          const due = formatDue(item.dueAt)
          return (
            <li key={`${item.category}-${item.title}-${idx}`} className="assistant-diagnostic-card">
              <div className="assistant-diagnostic-top">
                <span className="assistant-diagnostic-cat">
                  <span className="material-symbols-outlined" aria-hidden="true">{cat.icon}</span>
                  {cat.label}
                </span>
                <span className={`assistant-status-pill ${st.tone}`}>{st.label}</span>
              </div>

              <h4 className="assistant-diagnostic-title">{item.title}</h4>

              <dl className="assistant-diagnostic-meta">
                <div>
                  <dt>Vị trí</dt>
                  <dd>{item.location}</dd>
                </div>
                <div>
                  <dt>Tiến độ</dt>
                  <dd>{item.progressText}</dd>
                </div>
                {item.owner && (
                  <div>
                    <dt>Phụ trách</dt>
                    <dd>{item.owner}</dd>
                  </div>
                )}
                {due && (
                  <div>
                    <dt>Hạn</dt>
                    <dd>{due}</dd>
                  </div>
                )}
              </dl>

              {item.issueDetail && (
                <p className="assistant-diagnostic-issue">
                  <span className="material-symbols-outlined" aria-hidden="true">error_outline</span>
                  <span>{item.issueDetail}</span>
                </p>
              )}

              {onOpenTarget && item.target && (
                <div className="assistant-diagnostic-actions">
                  <button
                    type="button"
                    className="assistant-diagnostic-link"
                    onClick={() => onOpenTarget(item.target!, item.resourceId)}
                  >
                    Mở đúng vị trí
                    <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
