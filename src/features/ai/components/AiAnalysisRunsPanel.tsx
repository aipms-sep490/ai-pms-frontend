import { useEffect, useState } from 'react'
import { HttpError } from '../../../services/http/http-client'
import { getAiRun, getProjectAiRuns, type AiAnalysisRun, type AiRunKind } from '../ai-api'

const kindLabel: Record<string, string> = { RISK: 'Rủi ro & tiến độ', SUMMARY: 'Tóm tắt báo cáo', CONTRIBUTION: 'Đóng góp cá nhân' }
const engineLabel: Record<string, string> = { rule: 'Luật', llm: 'Mô hình ngôn ngữ' }
const describeKind = (kind: AiRunKind) => kindLabel[kind] ?? kind
const formatDateTime = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

function RunDetail({ runId }: { runId: number }) {
  const [run, setRun] = useState<AiAnalysisRun | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    void getAiRun(runId, controller.signal)
      .then(data => { if (!controller.signal.aborted) setRun(data) })
      .catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [runId])
  if (error) return <p className="mt-2 text-sm text-status-error-text">Chưa tải được chi tiết lần phân tích.</p>
  if (!run) return <p className="mt-2 text-sm text-slate-500">Đang tải chi tiết…</p>
  const factors = run.riskFactors ?? []
  return <div className="mt-2 space-y-2">
    {factors.length === 0 && <p className="text-sm text-slate-500">Lần phân tích này không ghi nhận yếu tố rủi ro cụ thể.</p>}
    {factors.map((factor, index) => <div key={index} className="rounded-lg border border-hairline bg-canvas p-3 text-sm">
      <div className="flex items-center justify-between gap-2"><span className="font-semibold text-slate-900">{factor.code}</span>{typeof factor.weight === 'number' && <span className="text-xs text-slate-500">trọng số {factor.weight}</span>}</div>
      <p className="mt-1 leading-6 text-slate-700">{factor.explanation}</p>
    </div>)}
  </div>
}

/** BE-15: history of saved AI analysis runs for a project. Read-only; AI never
 * changes state or assigns people, and INSUFFICIENT runs are shown as such. */
export function AiAnalysisRunsPanel({ projectId }: { projectId: number }) {
  const [runs, setRuns] = useState<AiAnalysisRun[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [revision, setRevision] = useState(0)
  const [openId, setOpenId] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void getProjectAiRuns(projectId, controller.signal)
      .then(data => { if (!controller.signal.aborted) { setRuns(data); setError(false) } })
      .catch(reason => {
        if (controller.signal.aborted) return
        if (reason instanceof HttpError && reason.status === 404) { setRuns([]); setError(false) }
        else setError(true)
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [projectId, revision])

  const retry = () => { setLoading(true); setError(false); setRuns(null); setRevision(value => value + 1) }

  return <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs">
    <h2 className="font-heading text-lg font-semibold text-slate-950">Lịch sử phân tích AI</h2>
    <p className="mt-1 text-sm text-slate-600">Các lần phân tích đã lưu của đồ án. Kết quả mang tính tham khảo; AI không đổi trạng thái hay phân công.</p>
    {loading && <p role="status" className="mt-4 text-sm text-slate-500">Đang tải lịch sử…</p>}
    {!loading && error && <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text"><span>Chưa tải được lịch sử phân tích AI.</span><button type="button" className="min-h-11 font-semibold underline" onClick={retry}>Tải lại</button></div>}
    {!loading && !error && runs && runs.length === 0 && <p className="mt-4 text-sm text-slate-500">Chưa có lần phân tích nào được lưu.</p>}
    {!loading && !error && runs && runs.length > 0 && <ul className="mt-4 space-y-2">
      {runs.map(run => {
        const insufficient = run.sufficiency === 'INSUFFICIENT'
        const open = openId === run.id
        return <li key={run.id} className="rounded-lg border border-hairline bg-card">
          <button type="button" aria-expanded={open} onClick={() => setOpenId(open ? null : run.id)} className="flex w-full flex-wrap items-center justify-between gap-2 p-3 text-left">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-900">{describeKind(run.kind)}</span>
              <span className="rounded-full border border-hairline bg-slate-50 px-2 py-0.5 text-xs text-slate-600">{engineLabel[run.engine] ?? run.engine}{run.engineVersion ? ` · ${run.engineVersion}` : ''}</span>
              {insufficient && <span className="rounded-full border border-status-warning-border bg-status-warning-bg px-2 py-0.5 text-xs font-semibold text-status-warning-text">Chưa đủ dữ liệu</span>}
            </span>
            <span className="text-xs text-slate-500">{formatDateTime(run.createdAt)}</span>
          </button>
          {open && run.kind === 'RISK' && <div className="px-3 pb-3"><RunDetail runId={run.id} /></div>}
          {open && run.kind !== 'RISK' && <div className="px-3 pb-3 text-sm text-slate-500">Nội dung chi tiết hiển thị ở màn phân tích tương ứng.</div>}
        </li>
      })}
    </ul>}
  </section>
}
