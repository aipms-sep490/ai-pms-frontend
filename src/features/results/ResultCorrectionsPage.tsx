import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { Button } from '../../components/ui/Button'
import { displayLabel } from '../../components/ui/display-label'
import { FilterToolbar, type ActiveFilterChip } from '../../components/ui/FilterToolbar'
import { ListLoading } from '../../components/ui/ListLoading'
import { Pagination } from '../../components/ui/Pagination'
import { useClientPagination } from '../../components/ui/useClientPagination'
import { StatusBadge } from '../../components/ui/StatusBadge'
import type { BadgeTone } from '../../components/ui/status-badge-tone'
import { useAuthSession } from '../auth/context/useAuthSession'
import { useProjectCapabilities } from '../capabilities/useProjectCapabilities'
import { getProject } from '../../services/api/projects.api'
import type { PagedResult } from '../../types/backend'
import * as api from './result-correction-api'
import { AppealManagementPanel } from './AppealManagementPanel'
import { AppealRequestDetail } from './AppealRequestDetail'
import { appealError, AppealPaging } from './appeal-ui'
import { ResultHistoryPanel } from './ResultHistoryPanel'

function appealStatusTone(status: string): BadgeTone {
  if (status === 'ACCEPTED') return 'success'
  if (status === 'REJECTED') return 'danger'
  if (status === 'UNDER_REVIEW') return 'info'
  return 'warning'
}

export function ResultCorrectionsPage() {
  const projectId = Number(useParams().projectId)
  const { session } = useAuthSession()
  return Number.isSafeInteger(projectId) && projectId > 0 ? <CorrectionsWorkspace key={`${projectId}:${session?.user.id}`} projectId={projectId} /> : <WorkspacePage size="wide" title="Phúc khảo và đính chính" backTo="/department/portfolio" backLabel="Danh mục đồ án"><p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">Mã đồ án không hợp lệ.</p></WorkspacePage>
}
function CorrectionsWorkspace({ projectId }: { projectId: number }) {
  const { session } = useAuthSession(), capabilities = useProjectCapabilities(projectId)
  const [params, setParams] = useSearchParams(), selected = Number(params.get('request'))
  const [requests, setRequests] = useState<PagedResult<api.ResultCorrectionRequest> | null>(null)
  const [projectLabel, setProjectLabel] = useState<string | null>(null)
  const [page, setPage] = useState(1), [revision, setRevision] = useState(0), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const lead = capabilities.data?.leadDepartmentId
  const canManage = session?.user.roles.includes('DEPARTMENT_STAFF') && lead != null && capabilities.data?.managedDepartmentIds.includes(lead) && capabilities.data.academicScopeProvenance === 'FROZEN_REGISTRATION_SNAPSHOT'
  useEffect(() => {
    const abort = new AbortController(); setLoading(true); setRequests(null); setError('')
    api.getResultCorrectionRequests(projectId, page, abort.signal).then(value => { if (!abort.signal.aborted) setRequests(value) }).catch(cause => { if (!abort.signal.aborted) setError(appealError(cause)) }).finally(() => { if (!abort.signal.aborted) setLoading(false) })
    return () => abort.abort()
  }, [projectId, page, revision])
  useEffect(() => {
    let active = true
    void getProject(projectId).then(project => { if (active && project) setProjectLabel([project.code, project.title].filter(Boolean).join(' · ')) }).catch(() => undefined)
    return () => { active = false }
  }, [projectId])

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (requests?.items ?? []).filter(item => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false
      if (q) {
        const hay = `${item.studentName ?? ''} ${displayLabel(item.targetType)} ${item.componentName ?? ''} ${displayLabel(item.scope)} ${displayLabel(item.source)} ${displayLabel(item.status)}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [requests, search, statusFilter])

  const requestPager = useClientPagination(filteredRequests, 10)
  const useServerPaging = Boolean(requests && requests.totalCount > requests.items.length)
  const displayedRequests = useServerPaging ? filteredRequests : requestPager.paginatedItems

  const hasFilters = Boolean(search.trim() || statusFilter !== 'ALL')
  const chips: ActiveFilterChip[] = []
  if (statusFilter !== 'ALL') chips.push({ id: 'status', label: 'Trạng thái', value: displayLabel(statusFilter) })

  const select = (id: number) => setParams({ request: String(id) })
  return <WorkspacePage size="wide" title="Phúc khảo và đính chính" eyebrow={projectLabel ?? 'Hồ sơ đồ án'} backTo={`/department/projects/${projectId}/result`} backLabel="Kết quả đồ án" description="Xử lý yêu cầu theo phạm vi, phiên bản kết quả và thao tác được hệ thống cấp." action={<Button variant="secondary" size="sm" icon="refresh" aria-label="Tải lại danh sách" disabled={loading} onClick={() => { capabilities.retry(); setRevision(value => value + 1) }} />}>
    <div className="space-y-5">
      {canManage && <AppealManagementPanel projectId={projectId} onCreated={id => { select(id); setRevision(value => value + 1) }} />}
      <section className="workspace-surface space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-ink">Yêu cầu trong phạm vi của bạn</h2>
          {requests && <span className="text-xs text-ink-muted">{requests.totalCount} yêu cầu</span>}
        </div>
        {error && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{error}</p>}
        {requests && requests.items.length > 0 && (
          <FilterToolbar
            embedded
            search={search}
            onSearchChange={setSearch}
            searchLabel="Tìm yêu cầu phúc khảo"
            searchPlaceholder="Tìm theo sinh viên, thành phần hoặc nguồn yêu cầu..."
            debounceMs={0}
            tabs={[
              { value: 'ALL', label: 'Tất cả' },
              { value: 'PENDING', label: 'Chờ xử lý' },
              { value: 'UNDER_REVIEW', label: 'Đang thẩm định' },
              { value: 'ACCEPTED', label: 'Đã chấp nhận' },
              { value: 'REJECTED', label: 'Đã từ chối' },
            ]}
            activeTab={statusFilter}
            onTabChange={setStatusFilter}
            tabsLabel="Lọc yêu cầu phúc khảo theo trạng thái"
            activeChips={chips}
            onRemoveChip={id => { if (id === 'status') setStatusFilter('ALL') }}
            onClearAll={() => { setSearch(''); setStatusFilter('ALL') }}
            hasActiveFilters={hasFilters}
            resultSummary={`${filteredRequests.length} / ${requests.totalCount} yêu cầu`}
          />
        )}
        {loading && <ListLoading label="Đang tải danh sách yêu cầu…" />}
        {requests && <>
          {filteredRequests.length === 0 ? (
            <p className="text-sm text-ink-muted">{hasFilters ? 'Không có yêu cầu khớp bộ lọc hiện tại.' : 'Chưa có yêu cầu trong phạm vi hiện tại.'}</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {displayedRequests.map(item => (
                <li key={item.id} className="py-3">
                  <button
                    type="button"
                    className={`flex min-h-11 w-full flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors ${selected === item.id ? 'border-primary bg-primary-subtle/50' : 'border-hairline hover:bg-canvas'}`}
                    onClick={() => select(item.id)}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-primary">{item.studentName ?? displayLabel(item.targetType)} · {item.componentName ?? displayLabel(item.scope)}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">{displayLabel(item.source)} · Phiên bản kết quả v{item.resultVersion}</p>
                    </div>
                    <StatusBadge tone={appealStatusTone(item.status)} label={displayLabel(item.status)} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {useServerPaging ? (
            <AppealPaging page={page} totalCount={requests.totalCount} busy={loading} onChange={setPage} />
          ) : requestPager.showPagination ? (
            <Pagination
              page={requestPager.page}
              pages={requestPager.pages}
              total={requestPager.total}
              pageSize={requestPager.pageSize}
              onPage={requestPager.setPage}
              onPageSizeChange={requestPager.setPageSize}
            />
          ) : null}
        </>}
      </section>
      {Number.isSafeInteger(selected) && selected > 0 && <AppealRequestDetail key={`${projectId}:${selected}`} projectId={projectId} requestId={selected} onChanged={() => setRevision(value => value + 1)} />}
      {canManage && <ResultHistoryPanel key={revision} projectId={projectId} />}
    </div>
  </WorkspacePage>
}
