import { useEffect, useMemo, useRef, useState } from 'react'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { FilterToolbar, type ActiveFilterChip } from '../../../components/ui/FilterToolbar'
import { ListLoading } from '../../../components/ui/ListLoading'
import { Pagination } from '../../../components/ui/Pagination'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { BadgeTone } from '../../../components/ui/status-badge-tone'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { useClientPagination } from '../../../components/ui/useClientPagination'
import { useQualificationQueue } from '../hooks/useQualificationQueue'

import { QualificationCertificateViewer } from '../components/QualificationCertificateViewer'
const statuses: Record<string, string> = { PENDING_VERIFICATION: 'Chờ xác minh', VERIFIED: 'Đã xác minh', REJECTED: 'Bị từ chối', EXPIRED: 'Đã hết hạn' }
const statusBadgeTone: Record<string, BadgeTone> = {
  PENDING_VERIFICATION: 'warning',
  VERIFIED: 'success',
  REJECTED: 'danger',
  EXPIRED: 'neutral',
}
function date(value?: string | null) {
  if (!value) return 'Chưa khai báo'
  const parsed = new Date(value)
  return Number.isNaN(parsed.valueOf()) ? 'Ngày chưa hợp lệ' : parsed.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
}

export function QualificationVerificationPage({ embedded = false }: { embedded?: boolean }) {
  const queue = useQualificationQueue()
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const filterKey = `${queue.page}:${queue.search}:${queue.status}`
  const [trainingFilter, setTrainingFilter] = useState<'ALL' | 'COMPLETED' | 'PENDING'>('ALL')
  const [sortBy, setSortBy] = useState<'default' | 'name_asc' | 'code_asc' | 'expires_asc'>('default')
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [noticeState, setNoticeState] = useState<{ key: string; text: string } | null>(null)
  const notice = noticeState?.key === filterKey ? noticeState.text : null
  const setNotice = (text: string | null) => setNoticeState(text ? { key: filterKey, text } : null)
  const lock = useRef(false), errorSummary = useRef<HTMLDivElement>(null)
  useEffect(() => { if (queue.error) errorSummary.current?.focus() }, [queue.error])

  const visibleItems = useMemo(() => {
    const filtered = trainingFilter === 'ALL'
      ? queue.items
      : queue.items.filter(item =>
          trainingFilter === 'COMPLETED'
            ? item.trainingStatus === 'TRAINING_COMPLETED'
            : item.trainingStatus !== 'TRAINING_COMPLETED',
        )
    if (sortBy === 'name_asc') return [...filtered].sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'))
    if (sortBy === 'code_asc') return [...filtered].sort((a, b) => (a.studentCode ?? '').localeCompare(b.studentCode ?? '', 'vi'))
    if (sortBy === 'expires_asc') {
      return [...filtered].sort((a, b) => {
        const at = a.expiresAt ? Date.parse(a.expiresAt) : Number.POSITIVE_INFINITY
        const bt = b.expiresAt ? Date.parse(b.expiresAt) : Number.POSITIVE_INFINITY
        return at - bt
      })
    }
    return filtered
  }, [queue.items, trainingFilter, sortBy])

  const clientPager = useClientPagination(visibleItems, 10)
  const displayedItems = queue.totalPages > 1 ? visibleItems : clientPager.paginatedItems

  async function decide(id: number, token: string, reject: boolean) {
    if (lock.current) return
    lock.current = true; setPendingId(id); setNotice(null)
    try {
      const response = await requestConfirmation(reject
        ? { title: 'Từ chối xác minh', description: 'Nêu lý do để sinh viên biết cần bổ sung hoặc điều chỉnh thông tin nào.', confirmLabel: 'Từ chối xác minh', danger: true, reasonLabel: 'Lý do từ chối' }
        : { title: 'Xác minh điều kiện tham gia', description: 'Xác nhận đã kiểm tra thông tin đào tạo và chứng chỉ của sinh viên.', confirmLabel: 'Xác nhận đủ điều kiện' })
      if (response === null) return
      if (await queue.decide(id, token, reject ? response.trim() : undefined)) setNotice(reject ? 'Đã ghi nhận từ chối xác minh.' : 'Đã xác minh hồ sơ sinh viên.')
    } finally { lock.current = false; setPendingId(null) }
  }

  const hasActiveFilters = Boolean(queue.search.trim() || trainingFilter !== 'ALL' || sortBy !== 'default')
  const activeChips: ActiveFilterChip[] = []
  if (trainingFilter !== 'ALL') {
    activeChips.push({
      id: 'training',
      label: 'Đào tạo',
      value: trainingFilter === 'COMPLETED' ? 'Đã hoàn thành' : 'Chưa hoàn thành',
    })
  }

  const body = <>
    <FilterToolbar
      search={queue.search}
      onSearchChange={value => { if (pendingId === null) queue.setSearch(value) }}
      searchLabel="Tìm sinh viên"
      searchPlaceholder="Tên hoặc mã sinh viên"
      debounceMs={0}
      tabs={Object.entries(statuses).map(([code, label]) => ({ value: code, label }))}
      activeTab={queue.status}
      onTabChange={code => { if (pendingId === null) queue.setStatus(code) }}
      tabsLabel="Lọc hồ sơ chứng chỉ theo trạng thái"
      controls={
        <label className="ft-select-wrap">
          <span className="sr-only">Trạng thái đào tạo</span>
          <select
            className="ft-select"
            aria-label="Lọc theo trạng thái đào tạo"
            value={trainingFilter}
            disabled={pendingId !== null}
            onChange={event => setTrainingFilter(event.target.value as 'ALL' | 'COMPLETED' | 'PENDING')}
          >
            <option value="ALL">Tất cả trạng thái đào tạo</option>
            <option value="COMPLETED">Đã hoàn thành đào tạo</option>
            <option value="PENDING">Chưa hoàn thành đào tạo</option>
          </select>
        </label>
      }
      sort={{
        value: sortBy,
        onChange: val => setSortBy(val as 'default' | 'name_asc' | 'code_asc' | 'expires_asc'),
        options: [
          { value: 'default', label: 'Mặc định' },
          { value: 'name_asc', label: 'Họ tên A–Z' },
          { value: 'code_asc', label: 'MSSV A–Z' },
          { value: 'expires_asc', label: 'Hết hạn sớm nhất' },
        ],
      }}
      rightActions={embedded ? <Button variant="secondary" size="sm" icon="refresh" aria-label="Tải lại" onClick={() => void queue.refresh()} disabled={queue.loading || pendingId !== null} /> : undefined}
      activeChips={activeChips}
      onRemoveChip={chipId => { if (chipId === 'training') setTrainingFilter('ALL') }}
      onClearAll={() => { queue.setSearch(''); setTrainingFilter('ALL'); setSortBy('default') }}
      hasActiveFilters={hasActiveFilters}
      resultSummary={`${displayedItems.length} / ${queue.totalCount} hồ sơ`}
      pagination={
        !queue.loading && !queue.error
          ? queue.totalPages > 1
            ? { page: queue.page, pages: queue.totalPages, total: queue.totalCount, pageSize: queue.pageSize, busy: pendingId !== null, onPage: queue.setPage }
            : clientPager.showPagination
              ? { page: clientPager.page, pages: clientPager.pages, total: clientPager.total, pageSize: clientPager.pageSize, busy: pendingId !== null, onPage: clientPager.setPage }
              : undefined
          : undefined
      }
    />
    {queue.error && <div ref={errorSummary} tabIndex={-1} role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{queue.error}</div>}
    {notice && (
      <div className="flex items-center gap-2 rounded-lg border border-hairline border-l-4 border-l-status-success-text bg-card p-3 text-sm text-ink">
        <span className="material-symbols-outlined shrink-0 text-[18px] text-status-success-text" aria-hidden="true">check_circle</span>
        <p role="status">{notice}</p>
      </div>
    )}
    {queue.loading ? <ListLoading label="Đang tải hồ sơ…" /> : !queue.error && visibleItems.length === 0 ? <p className="workspace-surface p-5 text-sm text-ink-muted">Không có hồ sơ phù hợp.</p> : <ul className="space-y-3" aria-label="Hồ sơ sinh viên">{displayedItems.map(item => <li key={item.id} className="workspace-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={item.fullName} size="md" />
          <div className="min-w-0">
            <h2 className="break-words font-heading font-semibold text-ink">{item.fullName}</h2>
            <p className="mt-0.5 font-mono text-xs text-ink-muted">{item.studentCode ?? 'Chưa có MSSV'}</p>
          </div>
        </div>
        <StatusBadge tone={statusBadgeTone[item.verificationStatus] ?? 'neutral'} label={statuses[item.verificationStatus] ?? item.verificationStatus} />
      </div>
      <dl className="mt-4 grid items-stretch gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex h-full flex-col justify-between rounded-xl border border-hairline bg-canvas p-3"><dt className="text-xs text-ink-muted">Đào tạo</dt><dd className="mt-1 font-medium text-ink">{item.trainingStatus === 'TRAINING_COMPLETED' ? 'Đã hoàn thành' : 'Chưa hoàn thành'}</dd></div>
        <div className="flex h-full flex-col justify-between rounded-xl border border-hairline bg-canvas p-3"><dt className="text-xs text-ink-muted">Số chứng chỉ</dt><dd className="mt-1 break-all font-medium text-ink">{item.certificateNumber ?? 'Chưa khai báo'}</dd></div>
        <div className="flex h-full flex-col justify-between rounded-xl border border-hairline bg-canvas p-3"><dt className="text-xs text-ink-muted">Ngày cấp</dt><dd className="mt-1 font-medium text-ink">{date(item.issuedAt)}</dd></div>
        <div className="flex h-full flex-col justify-between rounded-xl border border-hairline bg-canvas p-3"><dt className="text-xs text-ink-muted">Ngày hết hạn</dt><dd className="mt-1 font-medium text-ink">{date(item.expiresAt)}</dd></div>
      </dl>
      {item.certificateFileId && <QualificationCertificateViewer key={`${item.id}:${item.concurrencyToken}:${item.certificateFileId}`} qualificationId={item.id} />}
      {item.rejectionReason && <p className="mt-3 break-words rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">Lý do từ chối: {item.rejectionReason}</p>}
      {item.verifiedAt && <p className="mt-3 text-xs text-ink-muted">Đã xử lý ngày {date(item.verifiedAt)}{item.verifiedByName ? ` · Người xác minh: ${item.verifiedByName}` : ''}</p>}
      {item.verificationStatus === 'PENDING_VERIFICATION' && <div className="mt-4 flex flex-wrap gap-3">
        <span title={item.trainingStatus !== 'TRAINING_COMPLETED' ? 'Cần hoàn thành đào tạo trước khi xác minh.' : undefined}><Button className="min-h-11" disabled={pendingId !== null || !item.concurrencyToken || item.trainingStatus !== 'TRAINING_COMPLETED'} onClick={() => void decide(item.id, item.concurrencyToken ?? '', false)}>Xác minh</Button></span>
        <Button className="min-h-11" variant="danger" disabled={pendingId !== null || !item.concurrencyToken} onClick={() => void decide(item.id, item.concurrencyToken ?? '', true)}>Từ chối</Button>
        {!item.concurrencyToken && <p className="self-center text-sm text-ink-muted">Hồ sơ chưa có phiên bản xác minh. Hãy tải lại; chưa thể quyết định.</p>}{item.trainingStatus !== 'TRAINING_COMPLETED' && <p className="self-center text-sm text-ink-muted">Cần hoàn thành đào tạo trước khi xác minh.</p>}
      </div>}
    </li>)}</ul>}
    {!queue.loading && !queue.error && (queue.totalPages > 1 ? (
      <Pagination
        page={queue.page}
        pages={queue.totalPages}
        total={queue.totalCount}
        pageSize={queue.pageSize}
        busy={pendingId !== null}
        onPage={queue.setPage}
        onPageSizeChange={queue.setPageSize}
      />
    ) : clientPager.showPagination ? (
      <Pagination
        page={clientPager.page}
        pages={clientPager.pages}
        total={clientPager.total}
        pageSize={clientPager.pageSize}
        busy={pendingId !== null}
        onPage={clientPager.setPage}
        onPageSizeChange={clientPager.setPageSize}
      />
    ) : null)}
    {confirmationDialog}
  </>
  if (embedded) return <div className="space-y-4">{body}</div>
  return <WorkspacePage title="Xác minh điều kiện tham gia đồ án" eyebrow="Điều kiện tham gia" description="Kiểm tra hồ sơ đào tạo và thông tin chứng chỉ của sinh viên thuộc bộ môn trước khi đăng ký đồ án." action={<Button variant="secondary" size="sm" icon="refresh" aria-label="Tải lại" onClick={() => void queue.refresh()} disabled={queue.loading || pendingId !== null} />}>
    {body}
  </WorkspacePage>
}
