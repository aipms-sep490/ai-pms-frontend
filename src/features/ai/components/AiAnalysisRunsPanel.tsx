import { useEffect, useState } from 'react'
import { HttpError } from '../../../services/http/http-client'
import { getAiRun, getProjectAiRuns, type AiRunDto, type AiRunKind } from '../ai-api'
import { EvidenceReferences } from './EvidenceReferences'

const kindLabel: Record<string, string> = { PROJECT_ASK: 'Hỏi trợ lý', REPORT_SUMMARY: 'Tóm tắt báo cáo', PROGRESS_ANALYSIS: 'Phân tích tiến độ' }
const statusLabel: Record<string, string> = { RUNNING: 'Đang xử lý', COMPLETED: 'Hoàn tất', FAILED: 'Lỗi', INSUFFICIENT_EVIDENCE: 'Chưa đủ chứng cứ' }
const describeKind = (kind: AiRunKind) => kindLabel[kind] ?? kind
const describeStatus = (status: string) => statusLabel[status] ?? status
const formatDateTime = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

function RunDetail({ projectId, runId }: { projectId: number; runId: number }) {
  const [run, setRun] = useState<AiRunDto | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    void getAiRun(projectId, runId, controller.signal)
      .then(data => { if (!controller.signal.aborted) setRun(data) })
      .catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [projectId, runId])
  if (error) return <p className="mt-2 text-sm text-status-error-text">Chưa tải được chi tiết lần phân tích.</p>
  if (!run) return <p className="mt-2 text-sm text-ink-muted">Đang tải chi tiết…</p>
  // The backend re-scopes evidence on every read: a run saved under a scope the actor no
  // longer holds comes back with this errorCode and emptied evidence/result, not a hard failure.
  if (run.errorCode === 'AI_HISTORY_SCOPE_CHANGED') return <p className="mt-2 text-sm text-ink-muted">Minh chứng của lần phân tích này không còn hiển thị trong phạm vi hiện tại của bạn.</p>
  if (run.answer) return <div className="mt-2 space-y-2"><p className="whitespace-pre-wrap text-sm leading-6 text-ink-soft">{run.answer.answer}</p>{run.answer.limitationNote && <p className="text-sm text-ink-soft"><span className="font-semibold">Giới hạn:</span> {run.answer.limitationNote}</p>}<EvidenceReferences items={run.answer.evidence} /></div>
  if (run.reportSummary) return <dl className="mt-2 space-y-2 text-sm">{([['Đã hoàn thành', run.reportSummary.summary.completed], ['Đang thực hiện', run.reportSummary.summary.inProgress], ['Vướng mắc', run.reportSummary.summary.blockers], ['Rủi ro', run.reportSummary.summary.risks], ['Việc tiếp theo', run.reportSummary.summary.nextActions]] as const).map(([label, value]) => <div key={label}><dt className="font-semibold text-ink">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-ink-soft">{value || 'Không có nội dung.'}</dd></div>)}</dl>
  if (run.progressAnalysis) {
    const analysis = run.progressAnalysis
    return <div className="mt-2 space-y-2 text-sm">
      {analysis.contextScope === 'MAJOR' && <p className="rounded-lg border border-status-warning-border bg-status-warning-bg p-2 text-status-warning-text">Phạm vi ngành: rủi ro toàn đồ án không khả dụng. Không có dữ liệu cho: {analysis.unavailableMetrics.join(', ')}.</p>}
      <p className="text-ink-soft">Tiến độ: {analysis.progressSummary.progressPercentage}% · Quá hạn: {analysis.progressSummary.overdueTasks} · Vướng mắc: {analysis.progressSummary.blockedTasks}</p>
      {analysis.limitations && <p className="text-ink-soft"><span className="font-semibold">Giới hạn:</span> {analysis.limitations}</p>}
    </div>
  }
  return <p className="mt-2 text-sm text-ink-muted">Không có nội dung chi tiết cho lần phân tích này.</p>
}

/** BE-15: history of saved AI runs for a project. Read-only; AI never changes
 * state or assigns people, and runs are shown exactly as the backend returns them. */
export function AiAnalysisRunsPanel({ projectId }: { projectId: number }) {
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<{ items: AiRunDto[]; totalPages: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [revision, setRevision] = useState(0)
  const [openId, setOpenId] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    void getProjectAiRuns(projectId, page, 20, controller.signal)
      .then(data => { if (!controller.signal.aborted) { setResult({ items: data.items, totalPages: data.totalPages }); setError(false) } })
      .catch(reason => {
        if (controller.signal.aborted) return
        if (reason instanceof HttpError && reason.status === 404) { setResult({ items: [], totalPages: 0 }); setError(false) }
        else setError(true)
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [projectId, page, revision])

  const retry = () => { setLoading(true); setError(false); setResult(null); setRevision(value => value + 1) }

  return <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs">
    <h2 className="font-heading text-lg font-semibold text-ink">Lịch sử phân tích AI</h2>
    <p className="mt-1 text-sm text-ink-muted">Các lần phân tích đã lưu của đồ án. Kết quả mang tính tham khảo; AI không đổi trạng thái hay phân công.</p>
    {loading && <p role="status" className="mt-4 text-sm text-ink-muted">Đang tải lịch sử…</p>}
    {!loading && error && <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text"><span>Chưa tải được lịch sử phân tích AI.</span><button type="button" className="min-h-11 font-semibold underline" onClick={retry}>Tải lại</button></div>}
    {!loading && !error && result && result.items.length === 0 && <p className="mt-4 text-sm text-ink-muted">Chưa có lần phân tích nào được lưu.</p>}
    {!loading && !error && result && result.items.length > 0 && <ul className="mt-4 space-y-2">
      {result.items.map(run => {
        const open = openId === run.id
        const scopeChanged = run.errorCode === 'AI_HISTORY_SCOPE_CHANGED'
        return <li key={run.id} className="rounded-lg border border-hairline bg-card">
          <button type="button" aria-expanded={open} onClick={() => setOpenId(open ? null : run.id)} className="flex w-full flex-wrap items-center justify-between gap-2 p-3 text-left">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-ink">{describeKind(run.kind)}</span>
              <span className="rounded-full border border-hairline bg-canvas px-2 py-0.5 text-xs text-ink-muted">{run.modelVersion} · {run.configVersion}</span>
              <span className="rounded-full border border-hairline bg-canvas px-2 py-0.5 text-xs text-ink-muted">{describeStatus(run.status)}</span>
              {run.status === 'FAILED' && <span className="rounded-full border border-status-error-border bg-status-error-bg px-2 py-0.5 text-xs font-semibold text-status-error-text">Lỗi</span>}
              {scopeChanged && <span className="rounded-full border border-status-warning-border bg-status-warning-bg px-2 py-0.5 text-xs font-semibold text-status-warning-text">Ngoài phạm vi hiện tại</span>}
            </span>
            <span className="text-xs text-ink-muted">{formatDateTime(run.startedAt)}</span>
          </button>
          {open && <div className="px-3 pb-3"><RunDetail projectId={projectId} runId={run.id} /></div>}
        </li>
      })}
    </ul>}
    {!loading && !error && result && result.totalPages > 1 && <nav className="mt-4 flex items-center justify-between gap-3 text-sm" aria-label="Trang lịch sử phân tích">
      <button type="button" className="min-h-11 font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Trang trước</button>
      <span className="tabular-nums text-ink-muted">Trang {page} / {result.totalPages}</span>
      <button type="button" className="min-h-11 font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={page >= result.totalPages} onClick={() => setPage(value => value + 1)}>Trang sau</button>
    </nav>}
  </section>
}
