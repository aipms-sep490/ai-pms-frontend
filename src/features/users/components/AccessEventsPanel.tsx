import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { FilterToolbar, type ActiveFilterChip } from '../../../components/ui/FilterToolbar'
import { ListLoading } from '../../../components/ui/ListLoading'
import { Pagination } from '../../../components/ui/Pagination'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { BadgeTone } from '../../../components/ui/status-badge-tone'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../../../components/ui/Table'
import { HttpError } from '../../../services/http/http-client'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { utcTimestamp } from '../../projects/utils/collaboration-workspace'
import { getAccessEvents, type AccessEvent, type AccessEventQuery, type Page } from '../api/admin-api'

const timeFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

function dateBoundary(day: string, end = false): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return undefined
  const parsed = new Date(`${day}T${end ? '23:59:59.999' : '00:00:00.000'}+07:00`)
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : undefined
}

function outcomeTone(outcome: string): BadgeTone {
  if (outcome === 'SUCCESS') return 'success'
  if (outcome === 'DENIED' || outcome === 'FAILURE') return 'danger'
  return 'neutral'
}

function outcomeLabel(outcome: string): string {
  if (outcome === 'SUCCESS') return 'Thành công'
  if (outcome === 'DENIED') return 'Bị từ chối'
  if (outcome === 'FAILURE') return 'Thất bại'
  return outcome
}

export function AccessEventsPanel({
  userNameMap,
}: {
  userNameMap?: Record<number, { fullName: string; email?: string | null }>
}) {
  const { session } = useAuthSession()
  const [params, setParams] = useSearchParams()
  const searchInput = params.get('accessSearch') ?? ''
  const eventInput = params.get('accessEvent') ?? ''
  const outcomeInput = params.get('accessOutcome') ?? ''
  const fromInput = params.get('accessFrom') ?? ''
  const toInput = params.get('accessTo') ?? ''
  const pageInput = Number(params.get('accessPage') ?? '1')
  const page = Number.isSafeInteger(pageInput) && pageInput > 0 ? pageInput : 1
  const pageSizeInput = Number(params.get('accessPageSize') ?? '10')
  const pageSize = Number.isSafeInteger(pageSizeInput) && pageSizeInput > 0 ? pageSizeInput : 10
  const filters: AccessEventQuery = {
    search: searchInput.trim() || undefined,
    eventType: eventInput === 'LOGIN' || eventInput === 'LOGOUT' ? eventInput : undefined,
    outcome: outcomeInput === 'SUCCESS' || outcomeInput === 'FAILURE' || outcomeInput === 'DENIED' ? outcomeInput : undefined,
    fromUtc: dateBoundary(fromInput),
    toUtc: dateBoundary(toInput, true),
    page,
    pageSize,
  }
  const filterKey = JSON.stringify(filters)
  const invalidRange = Boolean(filters.fromUtc && filters.toUtc && filters.fromUtc > filters.toUtc)
  const [data, setData] = useState<Page<AccessEvent> | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)

  const accessChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = []
    if (searchInput) chips.push({ id: 'search', label: 'Người dùng', value: searchInput })
    if (eventInput) chips.push({ id: 'event', label: 'Sự kiện', value: eventInput === 'LOGIN' ? 'Đăng nhập' : 'Đăng xuất' })
    if (outcomeInput) chips.push({ id: 'outcome', label: 'Kết quả', value: outcomeLabel(outcomeInput) })
    if (fromInput) chips.push({ id: 'from', label: 'Từ ngày', value: fromInput })
    if (toInput) chips.push({ id: 'to', label: 'Đến ngày', value: toInput })
    return chips
  }, [eventInput, fromInput, outcomeInput, searchInput, toInput])

  useEffect(() => {
    const controller = new AbortController()
    setData(null)
    setError(null)
    setLoading(true)
    if (invalidRange) {
      setError(new Error('INVALID_DATE_RANGE'))
      setLoading(false)
      return () => controller.abort()
    }
    if (!session?.accessToken) {
      setError(new HttpError('Unauthenticated', 401))
      setLoading(false)
      return () => controller.abort()
    }
    void getAccessEvents(session.accessToken, JSON.parse(filterKey) as AccessEventQuery, controller.signal)
      .then(result => { if (!controller.signal.aborted) setData(result) })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason : new Error('Load failed')) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [session?.accessToken, filterKey, invalidRange, revision])

  function updateFilters(patch: Record<string, string>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    if (!('accessPage' in patch)) next.delete('accessPage')
    setParams(next)
  }

  return (
    <section id="access-events" className="admin-panel" aria-labelledby="access-events-title">
      <div className="admin-panel-heading">
        <div>
          <h2 id="access-events-title">Nhật ký truy cập</h2>
          <p>Các lượt đăng nhập và đăng xuất được máy chủ ghi nhận. Lần đăng nhập không chứng minh người dùng đang trực tuyến; IP là địa chỉ mạng, không phải vị trí địa lý.</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon="refresh"
          aria-label="Tải lại nhật ký truy cập"
          disabled={loading}
          onClick={() => setRevision(value => value + 1)}
        />
      </div>

      <div className="mt-4">
        <FilterToolbar
          embedded
          ariaLabel="Bộ lọc nhật ký truy cập"
          search={searchInput}
          onSearchChange={(value) => updateFilters({ accessSearch: value.trim() })}
          searchLabel="Người dùng"
          searchPlaceholder="Tìm theo tên hoặc email…"
          activeTab={outcomeInput}
          onTabChange={(value) => updateFilters({ accessOutcome: value })}
          tabsLabel="Lọc theo kết quả truy cập"
          tabs={[
            { value: '', label: 'Tất cả' },
            { value: 'SUCCESS', label: 'Thành công' },
            { value: 'FAILURE', label: 'Thất bại' },
            { value: 'DENIED', label: 'Bị từ chối' },
          ]}
          controls={
            <>
              <label className="ft-select-wrap">
                <span className="sr-only">Sự kiện</span>
                <select
                  aria-label="Sự kiện"
                  value={eventInput}
                  onChange={(e) => updateFilters({ accessEvent: e.target.value })}
                >
                  <option value="">Mọi sự kiện</option>
                  <option value="LOGIN">Đăng nhập</option>
                  <option value="LOGOUT">Đăng xuất</option>
                </select>
              </label>
              <label className="ft-select-wrap">
                <span className="text-xs font-semibold text-ink-soft whitespace-nowrap">Từ ngày (giờ Việt Nam)</span>
                <input
                  type="date"
                  value={fromInput}
                  onChange={(e) => updateFilters({ accessFrom: e.target.value })}
                />
              </label>
              <label className="ft-select-wrap">
                <span className="text-xs font-semibold text-ink-soft whitespace-nowrap">Đến ngày (giờ Việt Nam)</span>
                <input
                  type="date"
                  value={toInput}
                  onChange={(e) => updateFilters({ accessTo: e.target.value })}
                />
              </label>
            </>
          }
          activeChips={accessChips}
          onRemoveChip={(id) => {
            if (id === 'search') updateFilters({ accessSearch: '' })
            if (id === 'event') updateFilters({ accessEvent: '' })
            if (id === 'outcome') updateFilters({ accessOutcome: '' })
            if (id === 'from') updateFilters({ accessFrom: '' })
            if (id === 'to') updateFilters({ accessTo: '' })
          }}
          onClearAll={() => updateFilters({ accessSearch: '', accessEvent: '', accessOutcome: '', accessFrom: '', accessTo: '' })}
          hasActiveFilters={accessChips.length > 0}
          clearAllLabel="Đặt lại truy cập"
        />
      </div>

      {loading && <ListLoading label="Đang tải nhật ký truy cập…" />}
      {error && (
        <p role="alert" className="admin-error">
          {error.message === 'INVALID_DATE_RANGE'
            ? 'Từ ngày phải trước hoặc trùng đến ngày.'
            : error instanceof HttpError && error.status === 403
              ? 'Bạn không có quyền xem nhật ký truy cập.'
              : 'Chưa tải được nhật ký truy cập.'}{' '}
          {error.message !== 'INVALID_DATE_RANGE' && (
            <Button size="sm" variant="outline" onClick={() => setRevision(value => value + 1)}>Thử lại</Button>
          )}
        </p>
      )}
      {!loading && !error && data?.items.length === 0 && (
        <p role="status">Không có lượt truy cập phù hợp với bộ lọc.</p>
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <div className="mt-4">
        <Table stack>
          <TableHead>
            <TableRow head>
              <TableHeaderCell>Người dùng</TableHeaderCell>
              <TableHeaderCell>Sự kiện</TableHeaderCell>
              <TableHeaderCell>Kết quả</TableHeaderCell>
              <TableHeaderCell>Thời gian</TableHeaderCell>
              <TableHeaderCell>IP truy cập</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.items.map(item => {
              const mapped = item.userId ? userNameMap?.[item.userId] : undefined
              const displayName = item.fullName?.trim() || mapped?.fullName?.trim() || item.email?.trim() || mapped?.email?.trim() || null
              const displayEmail = item.email?.trim() || mapped?.email?.trim() || null
              return (
                <TableRow key={item.id}>
                  <TableCell label="Người dùng">
                    {item.userId ? (
                      <div className="flex items-center gap-2.5">
                        <Avatar name={displayName ?? `U${item.userId}`} size="sm" />
                        <div className="min-w-0">
                          <Link to={`/admin/access/users/${item.userId}`} className="font-semibold text-primary hover:underline">
                            {displayName ?? 'Tài khoản đã lưu'}
                          </Link>
                          {displayEmail && displayEmail !== displayName && (
                            <small className="block text-xs text-ink-muted">{displayEmail}</small>
                          )}
                        </div>
                      </div>
                    ) : 'Không xác định'}
                  </TableCell>
                  <TableCell label="Sự kiện">
                    <span className="font-medium text-ink">{item.eventType === 'LOGIN' ? 'Đăng nhập' : 'Đăng xuất'}</span>
                    {item.eventType === 'LOGIN' && (
                      <small className="block text-xs text-ink-muted">
                        {item.authenticationMethod === 'GOOGLE' ? 'Google' : item.authenticationMethod === 'PASSWORD' ? 'Mật khẩu' : 'Không xác định'}
                      </small>
                    )}
                  </TableCell>
                  <TableCell label="Kết quả">
                    <StatusBadge tone={outcomeTone(item.outcome)} label={outcomeLabel(item.outcome)} />
                  </TableCell>
                  <TableCell label="Thời gian">
                    <time dateTime={item.occurredAt}>{timeFormatter.format(utcTimestamp(item.occurredAt))}</time>
                  </TableCell>
                  <TableCell label="IP truy cập">
                    <span className="font-mono text-xs text-ink-soft">{item.ipAddress ?? 'Không ghi nhận'}</span>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        </div>
      )}

      {!loading && !error && data && data.totalCount > data.pageSize && (
        <Pagination
          page={data.page}
          pages={Math.max(1, Math.ceil(data.totalCount / data.pageSize))}
          total={data.totalCount}
          pageSize={data.pageSize}
          onPage={(next) => updateFilters({ accessPage: String(next) })}
          onPageSizeChange={(size) => updateFilters({ accessPageSize: String(size), accessPage: '1' })}
        />
      )}
    </section>
  )
}
