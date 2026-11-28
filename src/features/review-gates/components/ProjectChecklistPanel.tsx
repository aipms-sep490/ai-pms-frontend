import { useCallback, useEffect, useState } from 'react'
import { HttpError } from '../../../services/http/http-client'
import * as api from '../api/project-checklists-api'

interface ProjectChecklistPanelProps {
  projectId: number
  gateCode: string
  canTailor?: boolean
  hideOnNotFound?: boolean
}

const CONSENSUS_LABELS: Record<api.ProjectGateChecklistDto['review3ConsensusStatus'], string> = {
  PENDING_RECOMMENDATIONS: 'Chờ đủ xác nhận GVHD & Phản biện',
  AGREE: 'Đồng thuận Bảo vệ',
  DISAGREE: 'Không đồng thuận',
}

export function ProjectChecklistPanel({ projectId, gateCode, canTailor = false, hideOnNotFound = false }: ProjectChecklistPanelProps) {
  const [checklist, setChecklist] = useState<api.ProjectGateChecklistDto | null>(null)
  const [diff, setDiff] = useState<api.ChecklistDiffPreviewDto | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await api.getProjectGateChecklist(projectId, gateCode)
      setChecklist(data)
      setNotFound(false)
      setError(null)
    } catch (reason) {
      if (hideOnNotFound && reason instanceof HttpError && (reason.status === 404 || reason.status === 403)) {
        setNotFound(true)
        setError(null)
        return
      }
      setError(reason instanceof Error ? reason.message : 'Không thể tải Project Checklist.')
    }
  }, [projectId, gateCode, hideOnNotFound])

  useEffect(() => {
    void load()
  }, [load])

  const previewDiff = async () => {
    if (!checklist) return
    setBusy(true)
    try {
      setDiff(await api.getChecklistDiffPreview(projectId, checklist.id))
      setError(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể xem Diff.')
    } finally {
      setBusy(false)
    }
  }

  const publish = async () => {
    if (!checklist) return
    setBusy(true)
    try {
      setChecklist(await api.publishProjectChecklist(projectId, checklist.id))
      setDiff(null)
      setError(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể phát hành Checklist.')
    } finally {
      setBusy(false)
    }
  }

  if (notFound && hideOnNotFound) {
    return null
  }
  if (error) {
    return <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</div>
  }
  if (!checklist) {
    return <div className="text-xs text-slate-500">Đang tải Review Checklist...</div>
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4" aria-label="Project Gate Review Checklist">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Review Checklist {checklist.gateCode} · v{checklist.version} ({checklist.status})
          </h3>
          <p className="text-xs text-slate-600">
            Khuyến nghị Review 3: <strong>{CONSENSUS_LABELS[checklist.review3ConsensusStatus]}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {checklist.scoreSummary?.normalizedScoreOutOf10 != null && (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800" data-testid="checklist-normalized-score">
              Điểm chuẩn hóa: {checklist.scoreSummary.normalizedScoreOutOf10.toFixed(2)}/10 · {checklist.scoreSummary.ratingBand} (N/A: {checklist.scoreSummary.naCount})
            </span>
          )}
          {canTailor && checklist.status === 'DRAFT' && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => void previewDiff()}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Xem Diff Master vs Nhóm
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void publish()}
                className="rounded-md bg-blue-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-800"
              >
                Phát hành Checklist
              </button>
            </>
          )}
        </div>
      </div>

      {diff && (
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-xs text-teal-900" data-testid="checklist-diff-preview">
          Tổng {diff.totalItems} mục · Áp dụng: {diff.applicableItems} · N/A (Conditional): {diff.naItems} · Đã cá nhân hóa: {diff.tailoredItems}
        </div>
      )}

      <div className="divide-y divide-slate-100 text-xs">
        {checklist.items.map(item => (
          <div key={item.id} className="py-2.5 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-semibold text-slate-800">{item.itemCode}</span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">{item.trackScope}</span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">{item.priority} · w={item.weight}</span>
              {!item.isApplicable && <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">N/A: {item.naReason}</span>}
            </div>
            <div className="text-slate-900">{item.coreQuestion}</div>
            {item.tailoredCheckpoints && <div className="text-teal-800">Gợi ý kiểm tra: {item.tailoredCheckpoints}</div>}
            {item.tailoredEvidence && <div className="text-blue-800">Minh chứng mong đợi: {item.tailoredEvidence}</div>}
          </div>
        ))}
      </div>
    </section>
  )
}
