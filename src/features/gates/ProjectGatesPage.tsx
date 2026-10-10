import { useEffect, useState } from 'react'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { useStudentJourney } from '../../app/context'
import { HttpError } from '../../services/http/http-client'
import { getProjectCheckpoints } from './gates-api'
import type { GateStatus, ProjectCheckpoint } from './gates-types'

const statusText: Record<GateStatus, string> = {
  PLANNED: 'Chưa tới hạn', IN_REVIEW: 'Đang duyệt', PASSED: 'Đạt',
  REVISION_REQUIRED: 'Cần chỉnh sửa', MISSED: 'Quá hạn',
}
const statusTone: Record<GateStatus, string> = {
  PLANNED: 'border-hairline bg-slate-50 text-slate-600',
  IN_REVIEW: 'border-primary/20 bg-primary-subtle text-primary',
  PASSED: 'border-status-success-border bg-status-success-bg text-status-success-text',
  REVISION_REQUIRED: 'border-status-warning-border bg-status-warning-bg text-status-warning-text',
  MISSED: 'border-status-error-border bg-status-error-bg text-status-error-text',
}
const formatDue = (value: string | null) => value ? new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Chưa đặt hạn'

export function ProjectGatesPage() {
  const journey = useStudentJourney()
  const projectId = journey.project?.id
  const [checkpoints, setCheckpoints] = useState<ProjectCheckpoint[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!projectId) return
    const controller = new AbortController()
    void getProjectCheckpoints(projectId, controller.signal).then(data => {
      if (controller.signal.aborted) return
      setCheckpoints(data); setError(null)
    }).catch(reason => {
      if (controller.signal.aborted) return
      setError(reason instanceof HttpError && reason.status === 403
        ? 'Bạn chưa có quyền xem các cổng kiểm soát của đồ án này.'
        : 'Chưa tải được danh sách cổng kiểm soát. Hãy thử lại.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [projectId, revision])

  const retry = () => { setLoading(true); setError(null); setCheckpoints(null); setRevision(value => value + 1) }

  return <WorkspacePage className="space-y-5" title="Cổng kiểm soát tiến độ" eyebrow="Checkpoint · G1–G6"
    description="Theo dõi trạng thái các cổng kiểm soát của đồ án. Cổng quá hạn chỉ cảnh báo rủi ro, không làm đồ án trượt.">
    {!projectId && <p className="rounded-lg border border-hairline bg-card p-5 text-sm text-slate-600">Không tìm thấy đồ án đang hoạt động để xem cổng kiểm soát.</p>}
    {projectId && loading && <p role="status" className="rounded-lg border border-hairline bg-card p-5 text-sm text-slate-600">Đang tải cổng kiểm soát…</p>}
    {projectId && !loading && error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text"><span>{error}</span><button type="button" className="min-h-11 font-semibold underline" onClick={retry}>Tải lại</button></div>}
    {projectId && !loading && !error && checkpoints && checkpoints.length === 0 && <p className="rounded-lg border border-hairline bg-card p-5 text-sm text-slate-600">Kỳ đồ án chưa khai báo cổng kiểm soát nào.</p>}
    {projectId && !loading && !error && checkpoints && checkpoints.length > 0 && <ol className="space-y-3">
      {checkpoints.map(gate => {
        const status = (gate.status in statusText ? gate.status : 'PLANNED') as GateStatus
        return <li key={gate.id} className="rounded-xl border border-hairline bg-card p-5 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-primary px-2 py-0.5 font-mono text-xs font-bold text-white">{gate.gateCode}</span>
                {gate.isRequired
                  ? <span className="rounded-full border border-status-warning-border bg-status-warning-bg px-2 py-0.5 text-xs font-semibold text-status-warning-text">Bắt buộc</span>
                  : <span className="rounded-full border border-hairline bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-500">Theo dõi</span>}
              </div>
              <h2 className="mt-2 text-base font-bold text-slate-950">{gate.title?.trim() || `Cổng ${gate.gateCode}`}</h2>
              <p className="mt-1 text-xs text-slate-500">Hạn: {formatDue(gate.dueAt)}{typeof gate.evidenceCount === 'number' ? ` · ${gate.evidenceCount} minh chứng` : ''}</p>
            </div>
            <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone[status]}`}>{statusText[status]}</span>
          </div>
          {gate.reviews && gate.reviews.length > 0 && <ul className="mt-4 space-y-2 border-t border-hairline pt-3">
            {gate.reviews.map(review => <li key={review.id} className="text-sm">
              <div className="flex flex-wrap items-center gap-2 text-slate-700">
                <span className="font-semibold text-slate-900">{review.reviewerName?.trim() || `Người duyệt #${review.reviewerId}`}</span>
                {review.majorName && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{review.majorName}</span>}
                <span className="text-xs text-slate-500">{new Date(review.decidedAt).toLocaleDateString('vi-VN')}</span>
              </div>
              {review.reason?.trim() && <p className="mt-0.5 text-sm leading-6 text-slate-600">{review.reason}</p>}
            </li>)}
          </ul>}
        </li>
      })}
    </ol>}
  </WorkspacePage>
}
