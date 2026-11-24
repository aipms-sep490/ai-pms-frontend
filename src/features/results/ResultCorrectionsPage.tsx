import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { Button } from '../../components/ui/Button'
import { StatTileRow } from '../../components/ui/StatTileRow'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { displayLabel } from '../../components/ui/display-label'
import { Pagination } from '../../components/ui/Pagination'
import { useClientPagination } from '../../components/ui/useClientPagination'
import { useAuthSession } from '../auth/context/useAuthSession'
import { useProjectCapabilities } from '../capabilities/useProjectCapabilities'
import type { PagedResult } from '../../types/backend'
import * as api from './result-correction-api'
import { AppealManagementPanel } from './AppealManagementPanel'
import { AppealRequestDetail } from './AppealRequestDetail'
import { appealError, AppealPaging, appealTargetTypeLabel, correctionSourceLabel, correctionStatusLabel } from './appeal-ui'
import { ResultHistoryPanel } from './ResultHistoryPanel'

export function ResultCorrectionsPage() {
  const projectId = Number(useParams().projectId)
  const { session } = useAuthSession()
  return Number.isSafeInteger(projectId) && projectId > 0 ? <CorrectionsWorkspace key={`${projectId}:${session?.user.id}`} projectId={projectId} /> : <WorkspacePage title="Phúc khảo và đính chính"><p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">Mã đồ án không hợp lệ.</p></WorkspacePage>
}
function CorrectionsWorkspace({ projectId }: { projectId: number }) {
  const { session } = useAuthSession(), capabilities = useProjectCapabilities(projectId)
  const [params, setParams] = useSearchParams(), selected = Number(params.get('request'))
  const [requests, setRequests] = useState<PagedResult<api.ResultCorrectionRequest> | null>(null)
  const [page, setPage] = useState(1), [revision, setRevision] = useState(0), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const lead = capabilities.data?.leadDepartmentId
  const canManage = session?.user.roles.includes('DEPARTMENT_STAFF') && lead != null && capabilities.data?.managedDepartmentIds.includes(lead) && capabilities.data.academicScopeProvenance === 'FROZEN_REGISTRATION_SNAPSHOT'
  useEffect(() => {
    const abort = new AbortController(); setLoading(true); setRequests(null); setError('')
    api.getResultCorrectionRequests(projectId, page, abort.signal).then(value => { if (!abort.signal.aborted) setRequests(value) }).catch(cause => { if (!abort.signal.aborted) setError(appealError(cause)) }).finally(() => { if (!abort.signal.aborted) setLoading(false) })
    return () => abort.abort()
  }, [projectId, page, revision])
  const select = (id: number) => setParams({ request: String(id) })

  const items = useMemo(() => requests?.items ?? [], [requests])
  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return items.filter(item => {
      if (statusFilter && item.status !== statusFilter) return false
      if (!keyword) return true
      return `#${item.id} ${correctionSourceLabel(item.source)} ${appealTargetTypeLabel(item.targetType, item.studentId)} ${displayLabel(item.scope)} ${correctionStatusLabel(item.status)} ${item.source} ${item.targetType} ${item.scope} ${item.status}`.toLowerCase().includes(keyword)
    })
  }, [items, search, statusFilter])
  const listPagination = useClientPagination(filteredItems, 8)
  const displayedItems = (requests?.totalCount ?? 0) > 20 ? filteredItems : listPagination.paginatedItems

  const pendingCount = items.filter(i => i.status === 'PENDING' || i.status === 'UNDER_REVIEW').length
  const acceptedCount = items.filter(i => i.status === 'ACCEPTED').length
  const rejectedCount = items.filter(i => i.status === 'REJECTED').length
  const statusTone = (status: string) => status === 'ACCEPTED' ? 'success' : status === 'REJECTED' ? 'danger' : status === 'PENDING' || status === 'UNDER_REVIEW' ? 'warning' : 'neutral'

  return <WorkspacePage className="space-y-5 pb-10" title="Phúc khảo và đính chính" eyebrow={`Đồ án #${projectId}`} description="Xử lý yêu cầu theo phạm vi, phiên bản kết quả và thao tác được hệ thống cấp." action={<Button variant="secondary" icon="refresh" disabled={loading} onClick={() => { capabilities.retry(); setRevision(value => value + 1) }}>Tải lại danh sách</Button>}>
    <StatTileRow tiles={[
      { icon: 'gavel', label: 'Tổng yêu cầu', value: requests ? requests.totalCount : null, hero: true, caption: 'Phúc khảo & đính chính điểm' },
      { icon: 'pending_actions', label: 'Đang chờ / xem xét', value: requests ? pendingCount : null, tone: pendingCount > 0 ? 'warning' : 'neutral' },
      { icon: 'check_circle', label: 'Đã chấp nhận', value: requests ? acceptedCount : null, tone: 'success' },
      { icon: 'cancel', label: 'Đã từ chối', value: requests ? rejectedCount : null, tone: 'neutral' },
    ]} />

    <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-hairline bg-card px-4 py-3 shadow-xs">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold text-ink-soft">Trạng thái yêu cầu
          <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="mt-1 block min-h-11 rounded-lg border border-hairline bg-card px-3 text-sm font-normal text-ink">
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">Đang chờ xử lý</option>
            <option value="UNDER_REVIEW">Đang xem xét</option>
            <option value="ACCEPTED">Đã chấp nhận</option>
            <option value="REJECTED">Đã từ chối</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-ink-soft">Tìm yêu cầu
          <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Mã yêu cầu, đối tượng, phạm vi…" className="mt-1 block min-h-11 w-64 max-w-full rounded-lg border border-hairline bg-card px-3 text-sm font-normal text-ink placeholder:text-ink-muted" />
        </label>
      </div>
      <span className="text-xs text-ink-muted"><strong className="tabular-nums text-ink">{filteredItems.length}</strong> yêu cầu khớp bộ lọc</span>
    </div>

    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
      <div className={`space-y-5 ${canManage ? 'xl:col-span-7' : 'xl:col-span-12'}`}>
        <section className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-ink">Yêu cầu trong phạm vi của bạn</h2>
              {requests && <span className="rounded-full bg-primary-subtle px-2.5 py-0.5 text-xs font-semibold tabular-nums text-primary">{requests.totalCount}</span>}
            </div>
          </div>
          <div className="space-y-4 p-5">
            {error && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{error}</p>}
            {loading && <p role="status" className="text-sm text-ink-muted">Đang tải danh sách yêu cầu…</p>}
            {requests && <>
              {requests.items.length === 0 && <p className="text-sm text-ink-muted">Chưa có yêu cầu trong phạm vi hiện tại.</p>}
              {requests.items.length > 0 && filteredItems.length === 0 && <p className="text-sm text-ink-muted">Không có yêu cầu nào khớp bộ lọc hiện tại.</p>}
              {displayedItems.length > 0 && (
                <ul className="divide-y divide-hairline">
                  {displayedItems.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                    <button type="button" className={`min-h-11 text-left text-sm font-medium underline ${selected === item.id ? 'text-primary font-bold' : 'text-primary'}`} onClick={() => select(item.id)}>
                      #{item.id} · {correctionSourceLabel(item.source)} · {appealTargetTypeLabel(item.targetType, item.studentId)} · v{item.resultVersion} · {displayLabel(item.scope)}
                    </button>
                    <StatusBadge tone={statusTone(item.status)} label={correctionStatusLabel(item.status)} />
                  </li>)}
                </ul>
              )}
              {requests.totalCount > 20 ? (
                <AppealPaging page={page} totalCount={requests.totalCount} busy={loading} onChange={setPage} />
              ) : listPagination.showPagination ? (
                <Pagination
                  page={listPagination.page}
                  pages={listPagination.totalPages}
                  total={listPagination.total}
                  pageSize={listPagination.pageSize}
                  pageSizeOptions={[8, 16, 30]}
                  busy={loading}
                  onPage={listPagination.setPage}
                  onPageSizeChange={listPagination.setPageSize}
                />
              ) : null}
            </>}
          </div>
        </section>

        {Number.isSafeInteger(selected) && selected > 0 && <AppealRequestDetail key={`${projectId}:${selected}`} projectId={projectId} requestId={selected} onChanged={() => setRevision(value => value + 1)} />}
      </div>

      {canManage && (
        <div className="space-y-5 xl:col-span-5">
          <AppealManagementPanel projectId={projectId} onCreated={id => { select(id); setRevision(value => value + 1) }} />
          <ResultHistoryPanel key={revision} projectId={projectId} />
        </div>
      )}
    </div>
  </WorkspacePage>
}
