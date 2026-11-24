import { readAllPages } from '../../services/api/paged-read'
import { displayLabel } from '../../components/ui/display-label'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { ListLoading } from '../../components/ui/ListLoading'
import { StatTileRow } from '../../components/ui/StatTileRow'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Pagination } from '../../components/ui/Pagination'
import { useClientPagination } from '../../components/ui/useClientPagination'
import { WorkspaceEmptyState } from '../../components/ui/WorkspaceState'
import * as api from '../../services/api/evaluations.api'
import { evaluationError, isConflict } from './evaluation-errors'
import { evaluationStageLabel, type EvaluationAssignment } from './evaluation-types'

export function EvaluatorAssignmentsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<EvaluationAssignment[]>([])
  const [stageFilter, setStageFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setItems(await api.getAllMyEvaluationAssignments()) } catch (reason) { setItems([]); setError(evaluationError(reason)) } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return items.filter(assignment => {
      if (stageFilter && (assignment.stage ?? '') !== stageFilter) return false
      if (!keyword) return true
      const title = (assignment.projectTitle ?? `Đồ án #${assignment.projectId}`).toLowerCase()
      const rubric = (assignment.rubricName ?? '').toLowerCase()
      const scope = assignmentScopeLabel(assignment).toLowerCase()
      return title.includes(keyword) || rubric.includes(keyword) || scope.includes(keyword)
    })
  }, [items, search, stageFilter])

  const pagination = useClientPagination(filteredItems, 8)
  const projectCount = new Set(items.map(item => item.projectId)).size
  const coldCount = items.filter(item => item.stage === 'COLD').length
  const defenseCount = items.filter(item => item.stage === 'DEFENSE').length

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
    <WorkspacePage title="Đánh giá được phân công" eyebrow="Đánh giá đồ án" description="Xem các đồ án được phân công, lưu bản nháp và chốt kết quả sau khi hoàn tất chấm điểm." backTo="/supervisor/workspace" className="space-y-5" action={<Button variant="outline" icon="refresh" disabled={loading} onClick={() => void load()}>Tải lại</Button>}>

      {error ? <section role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">{error}</section> : null}
      {loading ? <ListLoading label="Đang tải danh sách phân công đánh giá…" /> : null}
      {!loading && !error && items.length > 0 && (
        <>
          <StatTileRow tiles={[
            { icon: 'assignment_ind', label: 'Phân công đang hiệu lực', value: items.length, hero: true, caption: 'Thuộc phạm vi chấm của bạn' },
            { icon: 'folder_open', label: 'Đồ án tham gia chấm', value: projectCount, tone: 'info' },
            { icon: 'description', label: 'Chấm hồ sơ (Cold)', value: coldCount, tone: 'neutral' },
            { icon: 'groups', label: 'Hội đồng bảo vệ', value: defenseCount, tone: 'success' },
          ]} />
          <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-hairline bg-card px-4 py-3 shadow-xs">
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs font-semibold text-ink-soft">Giai đoạn
                <select value={stageFilter} onChange={event => setStageFilter(event.target.value)} className="mt-1 block min-h-11 rounded-lg border border-hairline bg-card px-3 text-sm font-normal text-ink">
                  <option value="">Tất cả giai đoạn</option>
                  <option value="COLD">Chấm hồ sơ đã khóa</option>
                  <option value="DEFENSE">Bảo vệ</option>
                  <option value="ON_GOING">Đánh giá quá trình</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-ink-soft">Tìm đồ án hoặc bộ tiêu chí
                <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Tên đồ án, bộ tiêu chí, ngành…" className="mt-1 block min-h-11 w-64 max-w-full rounded-lg border border-hairline bg-card px-3 text-sm font-normal text-ink placeholder:text-ink-muted" />
              </label>
            </div>
            <span className="text-xs text-ink-muted"><strong className="tabular-nums text-ink">{filteredItems.length}</strong> / <strong className="tabular-nums text-ink">{items.length}</strong> phân công</span>
          </div>
        </>
      )}
      {!loading && !error && !items.length ? <WorkspaceEmptyState title="Chưa có phân công đánh giá đang hiệu lực" message="Khi máy chủ phân công một phiếu chấm trong phạm vi này, phiếu sẽ xuất hiện ở đây." /> : null}
      {!loading && !error && items.length > 0 && !filteredItems.length ? <WorkspaceEmptyState title="Không có phân công phù hợp bộ lọc" message="Xóa từ khóa tìm kiếm hoặc chọn tất cả giai đoạn để xem lại danh sách." /> : null}

      <section className="space-y-3" aria-label="Các phân công đánh giá">
        {!loading && pagination.paginatedItems.map((assignment) => (
          <article key={assignment.id} className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3">
              <h2 className="font-bold text-ink">{assignment.projectTitle ?? `Đồ án #${assignment.projectId}`} · {displayLabel(assignment.evaluationType)}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone="info" label={evaluationStageLabel(assignment.stage)} />
                <StatusBadge tone="neutral" label={assignmentScopeLabel(assignment)} />
              </div>
            </div>
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 text-sm text-ink-muted">{assignment.rubricName ?? `Bộ tiêu chí #${assignment.rubricId}`} · Giai đoạn: {evaluationStageLabel(assignment.stage)} · Phạm vi: {assignmentScopeLabel(assignment)} · Phân công {new Date(assignment.assignedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
              <Button className="min-h-11 shrink-0" disabled={busyId !== null} onClick={() => void openWorkspace(assignment)}>
                {busyId === assignment.id ? 'Đang kiểm tra…' : 'Mở không gian đánh giá'}
              </Button>
            </div>
          </article>
        ))}
        {!loading && pagination.showPagination && (
          <Pagination
            page={pagination.page}
            pages={pagination.totalPages}
            total={pagination.total}
            pageSize={pagination.pageSize}
            pageSizeOptions={[8, 16, 30]}
            onPage={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
        )}
      </section>

    </WorkspacePage>
  )
}

function assignmentScopeLabel(assignment: EvaluationAssignment) {
  if (assignment.scope === 'COMMON') return 'Chung của đồ án'
  if (assignment.scope === 'MAJOR_SPECIFIC') return assignment.majorName ?? `Ngành #${assignment.majorId ?? '—'}`
  if (assignment.scope === 'INDIVIDUAL') return assignment.studentName ?? `Sinh viên #${assignment.studentId ?? '—'}`
  return 'Chưa xác định từ phân công'
}
