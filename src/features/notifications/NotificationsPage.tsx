import { useCallback, useEffect, useRef, useState } from 'react'
import { HttpError } from '../../services/http/http-client'
import { getNotifications, getUnreadCount, markAllNotificationsRead, markNotificationRead, type NotificationPage } from './notifications-api'
import { NotificationRow, NotificationEmpty, NotificationLoading } from './NotificationRow'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { Pagination } from '../../components/ui/Pagination'
import { StatTileRow } from '../../components/ui/StatTileRow'

function isNotificationToday(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return !Number.isNaN(d.getTime()) && d.toDateString() === now.toDateString()
}

export function NotificationsPage() {
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [data, setData] = useState<NotificationPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState<number | null>(null)
  const request = useRef(0)
  const mutation = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    let active = true
    const refresh = () => { void getUnreadCount().then(count => { if (active) setUnreadCount(count) }).catch(() => { if (active) setUnreadCount(null) }) }
    refresh()
    window.addEventListener('ai-pms:notifications-changed', refresh)
    return () => { active = false; window.removeEventListener('ai-pms:notifications-changed', refresh) }
  }, [])

  const load = useCallback(async () => {
    const id = ++request.current
    setLoading(true)
    try {
      const result = await getNotifications(page, filter === 'unread' ? false : undefined)
      if (id !== request.current) return
      if (page > Math.max(1, result.totalPages)) { setPage(Math.max(1, result.totalPages)); return }
      setData(result)
      setError(null)
    } catch (reason) {
      if (id !== request.current) return
      setData(null)
      setError(reason instanceof HttpError && reason.status === 401 ? 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.' : reason instanceof HttpError && reason.status === 403 ? 'Bạn không có quyền xem hộp thông báo này.' : 'Không thể tải thông báo. Vui lòng thử lại.')
    } finally { if (id === request.current) setLoading(false) }
  }, [filter, page])

  useEffect(() => {
    const pending = request
    const refresh = () => { void load() }
    refresh()
    window.addEventListener('ai-pms:notifications-changed', refresh)
    return () => { pending.current++; window.removeEventListener('ai-pms:notifications-changed', refresh) }
  }, [load])

  const mutate = (operation: () => Promise<void>) => {
    // A destination click during another read must wait, not silently drop its own mark.
    const pending = mutation.current.catch(() => {}).then(async () => {
      setBusy(true)
      try {
        await operation()
        window.dispatchEvent(new Event('ai-pms:notifications-changed'))
      } catch (reason) { setError('Không thể cập nhật thông báo. Hãy thử lại sau.'); throw reason }
      finally { setBusy(false) }
    })
    mutation.current = pending
    return pending
  }

  const todayItems = data ? data.items.filter(item => isNotificationToday(item.createdAt)) : []
  const olderItems = data ? data.items.filter(item => !isNotificationToday(item.createdAt)) : []
  const readOnPage = data ? data.items.filter(item => item.isRead).length : null

  return (
    <WorkspacePage
      className="space-y-5"
      title="Thông báo"
      eyebrow="Trung tâm cập nhật"
      description="Lịch họp, nhận xét và những thay đổi cần theo dõi — tập trung ở một nơi."
    >
      <StatTileRow tiles={[
        {
          icon: 'mark_email_unread',
          label: 'Thông báo chưa đọc',
          value: unreadCount,
          hero: true,
          caption: 'Các cập nhật mới cần bạn kiểm tra.',
        },
        {
          icon: 'today',
          label: 'Trong ngày hôm nay',
          value: data ? todayItems.length : null,
          tone: 'info',
          caption: 'Hiển thị trên trang hiện tại.',
        },
        {
          icon: 'notifications',
          label: 'Tổng thông báo',
          value: data ? data.totalCount : null,
          tone: 'neutral',
          caption: filter === 'unread' ? 'Theo bộ lọc chưa đọc.' : 'Toàn bộ hộp thư thông báo.',
        },
        {
          icon: 'drafts',
          label: 'Đã đọc trên trang',
          value: readOnPage,
          tone: 'success',
          caption: 'Các thông báo đã được xác nhận xem.',
        },
      ]} />

      <section className="notification-panel" aria-label="Danh sách thông báo" aria-busy={loading}>
        <div className="notification-toolbar">
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl
              label="Lọc thông báo"
              value={filter}
              options={[{ value: 'all', label: 'Tất cả' }, { value: 'unread', label: 'Chưa đọc' }]}
              disabled={busy}
              onChange={value => { setFilter(value); setPage(1) }}
            />
            {data && (
              <span className="inline-flex items-center rounded-full border border-hairline bg-card px-2.5 py-0.5 text-xs font-bold tabular-nums text-ink-soft">
                {data.totalCount} mục
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="notification-action" disabled={busy || loading} onClick={() => void load()}>Làm mới</button>
            <button
              type="button"
              className="notification-action"
              disabled={busy || loading || (unreadCount === null ? !data?.items.some(item => !item.isRead) : unreadCount === 0)}
              onClick={() => void mutate(markAllNotificationsRead).catch(() => {})}
            >
              Đánh dấu tất cả đã đọc
            </button>
          </div>
        </div>

        {error && <p role="alert" className="notification-error">{error} <button type="button" disabled={loading || busy} onClick={() => void load()}>Tải lại</button></p>}

        {loading ? <NotificationLoading /> : data?.items.length ? (
          todayItems.length > 0 && olderItems.length > 0 ? (
            <div>
              <section aria-labelledby="notif-today-heading">
                <div className="notification-group-header flex items-center justify-between gap-2">
                  <h2 id="notif-today-heading" className="text-xs font-bold uppercase tracking-wider text-ink-soft">Hôm nay</h2>
                  <span className="text-xs font-semibold tabular-nums text-ink-muted">{todayItems.length}</span>
                </div>
                <ul className="notification-list">{todayItems.map(item => <NotificationRow key={item.id} item={item} busy={busy} onRead={() => mutate(() => markNotificationRead(item.id))} />)}</ul>
              </section>
              <section aria-labelledby="notif-older-heading">
                <div className="notification-group-header flex items-center justify-between gap-2">
                  <h2 id="notif-older-heading" className="text-xs font-bold uppercase tracking-wider text-ink-soft">Trước đó</h2>
                  <span className="text-xs font-semibold tabular-nums text-ink-muted">{olderItems.length}</span>
                </div>
                <ul className="notification-list">{olderItems.map(item => <NotificationRow key={item.id} item={item} busy={busy} onRead={() => mutate(() => markNotificationRead(item.id))} />)}</ul>
              </section>
            </div>
          ) : (
            <ul className="notification-list">{data.items.map(item => <NotificationRow key={item.id} item={item} busy={busy} onRead={() => mutate(() => markNotificationRead(item.id))} />)}</ul>
          )
        ) : !error ? <NotificationEmpty unread={filter === 'unread'} /> : null}

        {!loading && data && data.totalCount > data.pageSize && (
          <div className="border-t border-hairline px-5 py-3">
            <Pagination
              page={page}
              pages={data.totalPages}
              total={data.totalCount}
              pageSize={data.pageSize}
              busy={busy || loading}
              onPage={setPage}
            />
          </div>
        )}
      </section>
    </WorkspacePage>
  )
}
