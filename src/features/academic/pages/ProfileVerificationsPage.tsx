import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { Button } from '../../../components/ui/Button'
import { Pagination } from '../../../components/ui/Pagination'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { useClientPagination } from '../../../components/ui/useClientPagination'
import type { BadgeTone } from '../../../components/ui/status-badge-tone'
import { readAllPages } from '../../../services/api/paged-read'
import { HttpError } from '../../../services/http/http-client'
import * as api from '../api/profile-verification-api'
import '../../execution/execution.css'

const academicProfileStatus = api.academicProfileStatus

function profileStatusTone(status: string): BadgeTone {
  switch (status.toUpperCase()) {
    case 'VERIFIED': return 'success'
    case 'PENDING': return 'warning'
    case 'REJECTED': return 'danger'
    default: return 'neutral'
  }
}

export function ProfileVerificationsPage() {
  const [status, setStatus] = useState('PENDING'), [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchPool, setSearchPool] = useState<{ status: string; items: api.AcademicProfile[] | null } | null>(null)
  const [resolved, setResolved] = useState<{ key: string; data: Awaited<ReturnType<typeof api.getAcademicProfiles>> | null; error: string } | null>(null)
  const [busy, setBusy] = useState(false), [actionError, setActionError] = useState(''), [notice, setNotice] = useState('')
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const requestVersion = useRef(0)
  const queryKey = `${status}:${page}`
  const readProfiles = useCallback(async (key: string, nextStatus: string, nextPage: number) => {
    try {
      const next = await api.getAcademicProfiles(nextStatus, nextPage)
      return { key, data: next, error: '' }
    } catch (reason) {
      return { key, data: null as Awaited<ReturnType<typeof api.getAcademicProfiles>> | null, error: errorText(reason) }
    }
  }, [])
  const load = useCallback(async () => {
    const version = ++requestVersion.current
    setActionError('')
    setResolved(null)
    setSearchPool(null)
    const next = await readProfiles(queryKey, status, page)
    if (version === requestVersion.current) setResolved(next)
  }, [readProfiles, queryKey, status, page])
  useEffect(() => {
    const version = ++requestVersion.current
    void readProfiles(queryKey, status, page).then(next => {
      if (version === requestVersion.current) setResolved(next)
    })
  }, [readProfiles, queryKey, status, page])
  const active = resolved?.key === queryKey ? resolved : null
  const data = active?.data ?? null
  const loading = active === null
  const error = actionError || active?.error || ''
  const isSearching = Boolean(searchQuery.trim())

  const searchingAll = Boolean(isSearching && data && data.totalPages > 1 && searchPool?.status !== status)

  useEffect(() => {
    if (!searchingAll) return
    let mounted = true
    void readAllPages(nextPage => api.getAcademicProfiles(status, nextPage))
      .then(all => { if (mounted) setSearchPool({ status, items: all }) })
      .catch(() => { if (mounted) setSearchPool({ status, items: null }) })
    return () => { mounted = false }
  }, [searchingAll, status])

  const visibleItems = useMemo(() => {
    const source = isSearching && searchPool?.status === status && searchPool.items ? searchPool.items : (data?.items ?? [])
    const needle = searchQuery.trim().toLowerCase()
    if (!needle) return source
    return source.filter(item =>
      item.fullName.toLowerCase().includes(needle)
      || (item.studentCode ?? '').toLowerCase().includes(needle)
      || (item.email ?? '').toLowerCase().includes(needle)
      || (item.departmentName ?? '').toLowerCase().includes(needle)
      || (item.majorName ?? '').toLowerCase().includes(needle),
    )
  }, [data, searchPool, status, searchQuery, isSearching])

  const searchPagination = useClientPagination(visibleItems, 20)
  const displayedItems = isSearching ? searchPagination.paginatedItems : visibleItems
  const readyScopeCount = data ? visibleItems.filter(item => Boolean(item.departmentId && item.majorId)).length : null
  const missingScopeCount = data ? visibleItems.filter(item => !item.departmentId || !item.majorId).length : null

  async function review(item: api.AcademicProfile, approve: boolean) {
    const decision = await requestConfirmation({ title: approve ? `Xác minh hồ sơ ${item.fullName}?` : `Yêu cầu ${item.fullName} bổ sung hồ sơ?`, description: approve ? 'Xác nhận bộ môn và chuyên ngành đã được kiểm tra.' : 'Ghi rõ nội dung cần bổ sung để người dùng có thể cập nhật hồ sơ.', confirmLabel: approve ? 'Xác minh' : 'Gửi yêu cầu', danger: !approve, ...(!approve ? { reasonLabel: 'Nội dung cần bổ sung' } : {}) })
    if (decision === null || busy) return
    setBusy(true); setActionError(''); setNotice('')
    try { if (approve) await api.verifyAcademicProfile(item.userId); else await api.rejectAcademicProfile(item.userId, decision); await load(); setNotice(approve ? 'Đã xác minh hồ sơ.' : 'Đã gửi yêu cầu bổ sung hồ sơ.') }
    catch (reason) { setActionError(errorText(reason)) }
    finally { setBusy(false) }
  }

  return (
    <WorkspacePage
      className="execution-page space-y-5"
      title="Xác minh hồ sơ học vụ"
      eyebrow="Quản lý học vụ"
      description="Kiểm tra thông tin bộ môn, chuyên ngành và phản hồi hồ sơ cần bổ sung."
      action={<Button variant="secondary" icon="refresh" disabled={loading || busy} onClick={() => void load()}>Tải lại</Button>}
    >
      {confirmationDialog}

      <StatTileRow tiles={[
        { icon: 'badge', label: 'Tổng hồ sơ theo bộ lọc', value: data?.totalCount ?? null, caption: status ? academicProfileStatus(status) : 'Tất cả trạng thái.', hero: true },
        { icon: 'filter_list', label: isSearching ? 'Khớp tìm kiếm' : 'Hồ sơ trang hiện tại', value: data ? visibleItems.length : null, tone: 'info', caption: isSearching ? 'Quét toàn bộ hàng đợi theo bộ lọc.' : `Trang ${page} / ${Math.max(1, data?.totalPages ?? 1)}` },
        { icon: 'verified_user', label: 'Đủ bộ môn & ngành', value: readyScopeCount, tone: 'success', caption: 'Trong kết quả đang xem · sẵn sàng xác minh.' },
        { icon: 'edit_note', label: 'Thiếu bộ môn / ngành', value: missingScopeCount, tone: missingScopeCount && missingScopeCount > 0 ? 'warning' : 'neutral', caption: 'Cần bổ sung trước khi xác minh.' },
      ]} />

      {error && <p role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-3.5 text-sm text-status-error-text">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-status-success-border bg-status-success-bg p-3.5 text-sm text-status-success-text">{notice}</p>}

      <section className="workspace-surface p-4 sm:p-5" aria-label="Lọc hồ sơ học vụ">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-56 flex-1 text-xs font-semibold text-ink-soft">
            Tìm nhanh hồ sơ
            <input
              type="search"
              value={searchQuery}
              disabled={busy}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="Tên, MSSV, email, bộ môn hoặc chuyên ngành…"
              className="mt-1 block min-h-11 w-full rounded-lg border border-hairline bg-card px-3 text-sm font-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:bg-canvas disabled:text-ink-muted"
            />
          </label>
          <label className="min-w-48 text-xs font-semibold text-ink-soft">
            Trạng thái
            <select
              className="mt-1 block min-h-11 w-full rounded-lg border border-hairline bg-card px-3 text-sm font-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:bg-canvas disabled:text-ink-muted"
              disabled={busy}
              value={status}
              onChange={e => { setStatus(e.target.value); setPage(1); setSearchPool(null) }}
            >
              <option value="PENDING">Chờ xác minh</option>
              <option value="VERIFIED">Đã xác minh</option>
              <option value="REJECTED">Cần bổ sung</option>
              <option value="">Tất cả hồ sơ</option>
            </select>
          </label>
        </div>
      </section>

      <section className="workspace-surface" aria-label="Danh sách hồ sơ học vụ">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
          <div>
            <h2 className="text-base font-bold text-ink">Danh sách hồ sơ học vụ</h2>
            <p className="text-xs text-ink-muted">Đối chiếu thông tin bộ môn, chuyên ngành và ra quyết định xác minh.</p>
          </div>
          <StatusBadge
            tone="neutral"
            label={isSearching ? `${visibleItems.length} kết quả khớp` : `${data?.totalCount ?? 0} hồ sơ`}
          />
        </header>

        {loading || searchingAll ? (
          <p role="status" className="p-5 text-sm text-ink-muted">{searchingAll ? 'Đang tìm trên toàn bộ danh sách hồ sơ…' : 'Đang tải hồ sơ…'}</p>
        ) : !data?.items.length ? (
          <p className="p-5 text-sm text-ink-muted">Chưa có hồ sơ phù hợp.</p>
        ) : visibleItems.length === 0 ? (
          <p className="p-5 text-sm text-ink-muted">Không tìm thấy hồ sơ khớp từ khóa “{searchQuery.trim()}” trong danh sách hiện tại.</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {displayedItems.map(item => (
              <li key={item.userId} className="grid items-center gap-4 px-5 py-4 transition-colors hover:bg-canvas/40 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm font-bold text-ink">{item.fullName}</strong>
                    <StatusBadge tone={profileStatusTone(item.status)} label={academicProfileStatus(item.status)} />
                  </div>
                  <p className="truncate text-xs text-ink-muted">
                    <span className="font-mono text-ink-soft">{item.studentCode || item.email}</span>
                    {' · '}
                    <span>{item.departmentName || 'Chưa có bộ môn'}</span>
                    {' · '}
                    <span>{item.majorName || 'Chưa có chuyên ngành'}</span>
                  </p>
                  {item.rejectionReason && (
                    <p className="mt-1.5 rounded-lg border border-status-warning-border bg-status-warning-bg px-3 py-1.5 text-xs text-status-warning-text">
                      Cần bổ sung: {item.rejectionReason}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  {item.status !== 'VERIFIED' && (
                    <Button size="sm" disabled={busy || !item.departmentId || !item.majorId} onClick={() => void review(item, true)}>
                      Xác minh
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => void review(item, false)}>
                    Yêu cầu bổ sung
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!loading && !searchingAll && data && (
          isSearching ? (
            searchPagination.showPagination && (
              <div className="border-t border-hairline px-5 py-3.5">
                <Pagination
                  page={searchPagination.page}
                  pages={searchPagination.totalPages}
                  total={searchPagination.total}
                  pageSize={searchPagination.pageSize}
                  busy={busy}
                  onPage={searchPagination.setPage}
                />
              </div>
            )
          ) : (data.totalPages > 1 || page > 1) ? (
            <div className="border-t border-hairline px-5 py-3.5">
              <Pagination
                page={page}
                pages={Math.max(1, data.totalPages)}
                total={data.totalCount}
                pageSize={20}
                busy={loading || busy}
                onPage={setPage}
              />
            </div>
          ) : null
        )}
      </section>
    </WorkspacePage>
  )
}
function errorText(reason: unknown) { if (reason instanceof HttpError) { if (reason.status === 403) return 'Bạn chưa có quyền xác minh hồ sơ trong phạm vi này.'; if (reason.status === 409) return 'Hồ sơ vừa thay đổi. Tải lại trước khi tiếp tục.'; if (reason.status === 400) return reason.problem?.detail || 'Kiểm tra thông tin và lý do bổ sung.' } return 'Chưa hoàn tất thao tác. Hãy thử lại.' }

