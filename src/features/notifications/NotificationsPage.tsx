import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { FilterToolbar, type ActiveFilterChip } from '../../components/ui/FilterToolbar'
import { InlineAlert } from '../../components/ui/InlineAlert'
import { Pagination } from '../../components/ui/Pagination'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { StatTileRow } from '../../components/ui/StatTileRow'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { HttpError } from '../../services/http/http-client'
import { AuthSessionContext } from '../auth/context/auth-session-context'
import { getHomePath, getWorkspaceRole } from '../auth/utils/role-access'
import { notificationCopy } from './notification-copy'
import { emitNotificationsChanged, useNotificationLive } from './NotificationLiveContext'
import { resolveNotificationLink } from './notification-link-resolver'
import { NotificationEmpty, NotificationLoading, NotificationRow } from './NotificationRow'
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
  type NotificationPage,
} from './notifications-api'

type NotificationCategory = 'ALL' | 'PROJECT' | 'MEETING' | 'EVALUATION' | 'SYSTEM'
type NotificationSort = 'newest' | 'oldest' | 'unread-first'

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  ALL: 'Mọi nhóm thông báo',
  PROJECT: 'Đồ án & Nhóm',
  MEETING: 'Lịch họp & Biên bản',
  EVALUATION: 'Đánh giá & Thẩm định',
  SYSTEM: 'Hệ thống & Tài khoản',
}

function isNotificationToday(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return !Number.isNaN(d.getTime()) && d.toDateString() === now.toDateString()
}

function classifyNotification(item: NotificationItem): Exclude<NotificationCategory, 'ALL'> {
  const key = `${item.notificationType} ${item.relatedEntityType ?? ''}`.toUpperCase()
  if (/MEETING|SCHEDULE|CALL|ROOM/.test(key)) return 'MEETING'
  if (/EVALUATION|RUBRIC|GATE|REVIEW|APPEAL|DEFENSE|RESULT|SCORE|COLD|REPORT/.test(key)) return 'EVALUATION'
  if (/PROJECT|TEAM|TASK|MILESTONE|DELIVERABLE|TOPIC|SUPERVISOR|SUBMISSION|COMMITMENT/.test(key)) return 'PROJECT'
  return 'SYSTEM'
}

export function NotificationsPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [filter, setFilter] = useState<'all' | 'unread' | 'actionable'>('all')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<NotificationCategory>('ALL')
  const [sortBy, setSortBy] = useState<NotificationSort>('newest')
  const [data, setData] = useState<NotificationPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fallbackUnreadCount, setFallbackUnreadCount] = useState<number | null>(null)
  const request = useRef(0)
  const mutation = useRef<Promise<void>>(Promise.resolve())
  const auth = useContext(AuthSessionContext)
  const live = useNotificationLive()
  const unreadCount = live ? live.unreadCount : fallbackUnreadCount
  const unreadStale = live ? live.unreadStale : false
  const lastSyncRef = useRef(live?.syncVersion ?? 0)
  const roles = useMemo(() => auth?.session?.user.roles ?? [], [auth?.session?.user.roles])

  useEffect(() => {
    if (live) return live.registerLiveView()
    let active = true
    const refresh = () => {
      void getUnreadCount()
        .then(count => { if (active) setFallbackUnreadCount(count) })
        .catch(() => { if (active) setFallbackUnreadCount(null) })
    }
    refresh()
    window.addEventListener('ai-pms:notifications-changed', refresh)
    return () => { active = false; window.removeEventListener('ai-pms:notifications-changed', refresh) }
  }, [live])

  const serverFilter = filter === 'unread' ? false : undefined

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const id = ++request.current
    if (!opts?.silent) setLoading(true)
    try {
      const result = pageSize === 10
        ? await getNotifications(page, serverFilter)
        : await getNotifications(page, serverFilter, pageSize)
      if (id !== request.current) return
      if (page > Math.max(1, result.totalPages)) {
        setPage(Math.max(1, result.totalPages))
        return
      }
      setData(result)
      setError(null)
    } catch (reason) {
      if (id !== request.current) return
      if (!opts?.silent) {
        setData(null)
        setError(
          reason instanceof HttpError && reason.status === 401
            ? 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.'
            : reason instanceof HttpError && reason.status === 403
              ? 'Bạn không có quyền xem hộp thông báo này.'
              : 'Không thể tải thông báo. Vui lòng thử lại.',
        )
      }
    } finally {
      if (id === request.current && !opts?.silent) setLoading(false)
    }
  }, [page, pageSize, serverFilter])

  useEffect(() => {
    const pending = request
    const refresh = () => { void load() }
    refresh()
    window.addEventListener('ai-pms:notifications-changed', refresh)
    return () => { pending.current++; window.removeEventListener('ai-pms:notifications-changed', refresh) }
  }, [load])

  // Silently sync inbox when live poller detects new notifications or cross-tab updates
  useEffect(() => {
    const version = live?.syncVersion ?? 0
    if (version === lastSyncRef.current) return
    lastSyncRef.current = version
    if (!busy) void load({ silent: true })
  }, [busy, live?.syncVersion, load])

  const mutate = (operation: () => Promise<void>) => {
    // A destination click during another read must wait, not silently drop its own mark.
    const pending = mutation.current.catch(() => {}).then(async () => {
      setBusy(true)
      try {
        await operation()
        emitNotificationsChanged()
      } catch (reason) {
        setError('Không thể cập nhật thông báo. Hãy thử lại sau.')
        throw reason
      } finally {
        setBusy(false)
      }
    })
    mutation.current = pending
    return pending
  }

  const visibleItems = useMemo(() => {
    const raw = data?.items ?? []
    const query = search.trim().toLowerCase()
    const filtered = raw.filter(item => {
      if (filter === 'actionable') {
        const hasLink = Boolean(resolveNotificationLink(item, roles))
        if (item.isRead && !hasLink) return false
        if (!hasLink) return false
      }
      if (category !== 'ALL' && classifyNotification(item) !== category) return false
      if (query) {
        const copy = notificationCopy(item)
        if (!`${copy.title} ${copy.content} ${copy.label}`.toLowerCase().includes(query)) return false
      }
      return true
    })
    if (sortBy === 'oldest') {
      return [...filtered].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    }
    if (sortBy === 'unread-first') {
      return [...filtered].sort((a, b) => Number(a.isRead) - Number(b.isRead) || Date.parse(b.createdAt) - Date.parse(a.createdAt))
    }
    return filtered
  }, [category, data?.items, filter, roles, search, sortBy])

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = []
    if (search.trim()) chips.push({ id: 'search', label: 'Từ khóa', value: search.trim() })
    if (category !== 'ALL') chips.push({ id: 'category', label: 'Nhóm', value: CATEGORY_LABELS[category] })
    if (filter === 'actionable') chips.push({ id: 'actionable', label: 'Chế độ', value: 'Cần xử lý' })
    return chips
  }, [category, filter, search])

  const workspaceRole = getWorkspaceRole(auth?.session?.user)
  const pageDescription =
    workspaceRole === 'department'
      ? 'Theo dõi hồ sơ đề cương, bàn giao cuối kỳ, lượt đánh giá và cảnh báo tiến độ thuộc phạm vi bộ môn.'
      : workspaceRole === 'admin'
        ? 'Theo dõi cập nhật học vụ, thay đổi hệ thống và các sự kiện quan trọng trên nền tảng.'
        : workspaceRole === 'lecturer'
          ? 'Đề nghị hướng dẫn, lịch họp, phân công thẩm định và cập nhật từ các nhóm đồ án của bạn.'
          : 'Lịch họp, nhận xét từ giảng viên và các mốc tiến độ quan trọng của đồ án — tập trung ở một nơi.'

  const hasClientFilter = Boolean(search.trim() || category !== 'ALL' || filter === 'actionable')

  return (
    <WorkspacePage
      size="wide"
      title="Thông báo"
      eyebrow="Trung tâm cập nhật"
      backTo={getHomePath(auth?.session?.user)}
      backLabel="Quay lại"
      description={pageDescription}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon="refresh"
            aria-label="Làm mới"
            disabled={busy || loading}
            onClick={() => void load()}
          />
          <Button
            variant="secondary"
            size="sm"
            icon="done_all"
            disabled={busy || loading || (unreadCount === null ? !data?.items.some(item => !item.isRead) : unreadCount === 0)}
            onClick={() => void mutate(markAllNotificationsRead).catch(() => {})}
          >
            Đánh dấu tất cả đã đọc
          </Button>
        </div>
      }
    >
      <div className="mb-5">
        <StatTileRow
          tiles={[
            { icon: 'notifications', label: 'Tổng thông báo', value: data ? data.totalCount : null, hero: true, caption: 'Theo bộ lọc hiện tại trong hộp thư.' },
            { icon: 'mark_email_unread', label: 'Chưa đọc', value: unreadCount, tone: (unreadCount ?? 0) > 0 ? 'warning' : 'success', caption: (unreadCount ?? 0) > 0 ? 'Cập nhật mới cần xem.' : 'Bạn đã đọc toàn bộ thông báo.' },
            { icon: 'open_in_new', label: 'Có liên kết xử lý', value: data ? data.items.filter(item => Boolean(resolveNotificationLink(item, roles))).length : null, tone: 'info', caption: 'Nhấn để đi thẳng tới hồ sơ liên quan.' },
          ]}
        />
      </div>
      <section className="notification-panel" aria-label="Danh sách thông báo" aria-busy={loading}>
        <div className="notification-toolbar">
          <div className="flex flex-wrap items-center gap-2.5">
            <SegmentedControl
              label="Lọc thông báo"
              value={filter}
              options={[
                { value: 'all', label: 'Tất cả' },
                { value: 'unread', label: 'Chưa đọc' },
                { value: 'actionable', label: 'Cần xử lý' },
              ]}
              disabled={busy}
              onChange={value => {
                setFilter(value)
                setPage(1)
              }}
            />
            {unreadCount !== null && unreadCount > 0 && (
              <span className="notification-popover-count" title="Số thông báo chưa đọc">
                {unreadCount} chưa đọc
              </span>
            )}
          </div>
          <span
            className={`notification-live-badge ${unreadStale ? 'notification-live-badge--stale' : ''}`}
            title={unreadStale ? 'Đang chờ kết nối lại để đồng bộ tự động' : 'Tự động cập nhật thông báo mới không cần tải lại trang'}
          >
            <span className="notification-live-dot" aria-hidden="true" />
            <span>{unreadStale ? 'Đang chờ đồng bộ' : 'Tự động đồng bộ'}</span>
          </span>
        </div>

        <div className="border-b border-line px-4 py-2.5 sm:px-5">
          <FilterToolbar
            embedded
            debounceMs={0}
            ariaLabel="Tìm kiếm và phân loại thông báo"
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Tìm theo tiêu đề hoặc nội dung thông báo…"
            searchLabel="Tìm kiếm thông báo"
            controls={
              <label className="ft-select-wrap">
                <span className="sr-only">Lọc theo nhóm thông báo</span>
                <select aria-label="Nhóm thông báo" value={category} onChange={(e) => setCategory(e.target.value as NotificationCategory)}>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </label>
            }
            sort={{
              value: sortBy,
              onChange: (value) => setSortBy(value as NotificationSort),
              options: [
                { value: 'newest', label: 'Mới nhất trước' },
                { value: 'unread-first', label: 'Chưa đọc trước' },
                { value: 'oldest', label: 'Cũ nhất trước' },
              ],
            }}
            activeChips={activeChips}
            onRemoveChip={(id) => {
              if (id === 'search') setSearch('')
              if (id === 'category') setCategory('ALL')
              if (id === 'actionable') setFilter('all')
            }}
            onClearAll={() => {
              setSearch('')
              setCategory('ALL')
              setSortBy('newest')
              if (filter === 'actionable') setFilter('all')
            }}
            hasActiveFilters={activeChips.length > 0 || sortBy !== 'newest'}
            resultSummary={
              data && hasClientFilter
                ? `Hiển thị ${visibleItems.length} / ${data.items.length} thông báo trên trang này`
                : undefined
            }
          />
        </div>

        {error && (
          <div className="p-4">
            <InlineAlert
              tone="error"
              action={
                <button
                  type="button"
                  disabled={loading || busy}
                  className="inline-flex min-h-8 items-center rounded-md px-2.5 py-1 text-xs font-bold text-primary hover:bg-card/80"
                  onClick={() => void load()}
                >
                  Tải lại
                </button>
              }
            >
              {error}
            </InlineAlert>
          </div>
        )}

        {loading ? (
          <NotificationLoading />
        ) : visibleItems.length ? (
          (() => {
            const todayItems = visibleItems.filter(item => isNotificationToday(item.createdAt))
            const olderItems = visibleItems.filter(item => !isNotificationToday(item.createdAt))
            if (todayItems.length > 0 && olderItems.length > 0) {
              return (
                <div className="divide-y divide-hairline">
                  <section aria-labelledby="notif-today-heading">
                    <h2 id="notif-today-heading" className="px-6 pt-4 pb-2 text-xs font-bold uppercase tracking-wider text-ink-muted bg-canvas/70 border-b border-hairline">
                      Hôm nay
                    </h2>
                    <ul className="notification-list">
                      {todayItems.map(item => (
                        <NotificationRow key={item.id} item={item} busy={busy} headingLevel="h3" onRead={() => mutate(() => markNotificationRead(item.id))} />
                      ))}
                    </ul>
                  </section>
                  <section aria-labelledby="notif-older-heading">
                    <h2 id="notif-older-heading" className="px-6 pt-4 pb-2 text-xs font-bold uppercase tracking-wider text-ink-muted bg-canvas/70 border-b border-hairline">
                      Trước đó
                    </h2>
                    <ul className="notification-list">
                      {olderItems.map(item => (
                        <NotificationRow key={item.id} item={item} busy={busy} headingLevel="h3" onRead={() => mutate(() => markNotificationRead(item.id))} />
                      ))}
                    </ul>
                  </section>
                </div>
              )
            }
            return (
              <ul className="notification-list">
                {visibleItems.map(item => (
                  <NotificationRow key={item.id} item={item} busy={busy} onRead={() => mutate(() => markNotificationRead(item.id))} />
                ))}
              </ul>
            )
          })()
        ) : !error ? (
          hasClientFilter && (data?.items.length ?? 0) > 0 ? (
            <div className="notification-empty">
              <span className="material-symbols-outlined" aria-hidden="true">filter_alt_off</span>
              <h2>Không có thông báo phù hợp bộ lọc</h2>
              <p>Thử xóa từ khóa hoặc chọn nhóm thông báo khác để xem đầy đủ danh sách.</p>
              <div className="mt-4">
                <Button variant="outline" onClick={() => { setSearch(''); setCategory('ALL'); if (filter === 'actionable') setFilter('all') }}>
                  Đặt lại bộ lọc
                </Button>
              </div>
            </div>
          ) : (
            <NotificationEmpty unread={filter === 'unread'} />
          )
        ) : null}

        {!loading && data && (data.totalPages > 1 || data.totalCount > data.pageSize) && (
          <div className="border-t border-hairline px-5 pb-3">
            <Pagination
              page={page}
              pages={data.totalPages}
              total={data.totalCount}
              pageSize={pageSize}
              busy={busy || loading}
              onPage={setPage}
              onPageSizeChange={(nextSize) => {
                setPageSize(nextSize)
                setPage(1)
              }}
            />
          </div>
        )}
      </section>
    </WorkspacePage>
  )
}
