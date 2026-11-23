import { readAllPages } from '../../services/api/paged-read'
import { displayLabel } from '../../components/ui/display-label'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { FilterToolbar } from '../../components/ui/FilterToolbar'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { ListLoading } from '../../components/ui/ListLoading'
import { WorkspaceEmptyState } from '../../components/ui/WorkspaceState'
import * as api from '../../services/api/evaluations.api'
import { evaluationError, isConflict } from './evaluation-errors'
import { evaluationStageLabel, type EvaluationAssignment } from './evaluation-types'

export function EvaluatorAssignmentsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<EvaluationAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<'ALL' | 'ON_GOING' | 'COLD' | 'DEFENSE'>('ALL')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setItems(await api.getAllMyEvaluationAssignments()) } catch (reason) { setItems([]); setError(evaluationError(reason)) } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => {
      if (stageFilter !== 'ALL' && item.stage !== stageFilter) return false
      if (!q) return true
      return (item.projectTitle ?? '').toLowerCase().includes(q)
        || (item.rubricName ?? '').toLowerCase().includes(q)
        || assignmentScopeLabel(item).toLowerCase().includes(q)
    })
  }, [items, search, stageFilter])

  async function openWorkspace(assignment: EvaluationAssignment) {
    setBusyId(assignment.id); setError(null)
    try {
      const existing = (await readAllPages(page => api.getProjectEvaluations(assignment.projectId, undefined, page))).find((evaluation) => evaluation.assignmentId === assignment.id)
      const evaluation = existing ?? await api.createEvaluationDraft(assignment.id)
      navigate(`/evaluator/evaluations/${evaluation.id}`)
    } catch (reason) {
      if (isConflict(reason)) await load()
      setError(evaluationError(reason))
    } finally { setBusyId(null) }
  }

  return (
    <WorkspacePage size="wide" title="Đánh giá được phân công" eyebrow="Đánh giá đồ án" description="Xem các đồ án được phân công, lưu bản nháp và chốt kết quả sau khi hoàn tất chấm điểm." backTo="/supervisor/workspace" className="space-y-6" action={<Button variant="outline" icon="refresh" disabled={loading} onClick={() => void load()}>Tải lại</Button>}>

      {error ? <section role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">{error}</section> : null}
      {loading ? <ListLoading label="Đang tải danh sách phân công đánh giá…" /> : null}
      {!loading && !error && !items.length ? <WorkspaceEmptyState title="Chưa có phân công đánh giá đang hiệu lực" message="Khi máy chủ phân công một phiếu chấm trong phạm vi này, phiếu sẽ xuất hiện ở đây." /> : null}

      {!loading && items.length > 0 && (
        <FilterToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Tìm theo đồ án, bộ tiêu chí hoặc phạm vi…"
          searchLabel="Tìm phân công đánh giá"
          controls={
            <label className="ft-select-wrap">
              <span className="sr-only">Giai đoạn</span>
              <select aria-label="Giai đoạn đánh giá" value={stageFilter} onChange={(e) => setStageFilter(e.target.value as typeof stageFilter)} className="ft-select">
                <option value="ALL">Tất cả giai đoạn</option>
                <option value="ON_GOING">{evaluationStageLabel('ON_GOING')}</option>
                <option value="COLD">{evaluationStageLabel('COLD')}</option>
                <option value="DEFENSE">{evaluationStageLabel('DEFENSE')}</option>
              </select>
            </label>
          }
          onClearAll={() => { setSearch(''); setStageFilter('ALL') }}
          hasActiveFilters={Boolean(search.trim() || stageFilter !== 'ALL')}
          resultSummary={search.trim() || stageFilter !== 'ALL' ? `Hiển thị ${filtered.length} / ${items.length} phân công` : undefined}
        />
      )}

      <section className="space-y-3" aria-label="Các phân công đánh giá">
        {!loading && filtered.map((assignment) => (
          <article key={assignment.id} className="workspace-surface flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="font-bold text-ink">{assignment.projectTitle ?? 'Đồ án được phân công'} · {displayLabel(assignment.evaluationType)}</h2>
              <p className="mt-2 text-sm text-ink-muted">{assignment.rubricName ?? 'Chưa tải được tên bộ tiêu chí'} · Giai đoạn: {evaluationStageLabel(assignment.stage)} · Phạm vi: {assignmentScopeLabel(assignment)} · Phân công {new Date(assignment.assignedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
            </div>
            <Button className="min-h-11 shrink-0" disabled={busyId !== null} onClick={() => void openWorkspace(assignment)}>
              {busyId === assignment.id ? 'Đang kiểm tra…' : 'Mở không gian đánh giá'}
            </Button>
          </article>
        ))}
      </section>

    </WorkspacePage>
  )
}

function assignmentScopeLabel(assignment: EvaluationAssignment) {
  if (assignment.scope === 'COMMON') return 'Chung của đồ án'
  if (assignment.scope === 'MAJOR_SPECIFIC') return assignment.majorName ?? 'Chưa tải được tên ngành'
  if (assignment.scope === 'INDIVIDUAL') return assignment.studentName ?? 'Chưa tải được tên sinh viên'
  return 'Chưa xác định từ phân công'
}
