
function isNotificationToday(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return !Number.isNaN(d.getTime()) && d.toDateString() === now.toDateString()
}

import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { HttpError } from '../../services/http/http-client'
import { AuthSessionContext } from '../auth/context/auth-session-context'
import { getWorkspaceRole } from '../auth/utils/role-access'
import { getNotifications, getUnreadCount, markAllNotificationsRead, markNotificationRead, type NotificationPage } from './notifications-api'
import { NotificationRow, NotificationEmpty, NotificationLoading } from './NotificationRow'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { SegmentedControl } from '../../components/ui/SegmentedControl'

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
  const auth = useContext(AuthSessionContext)
  const workspaceRole = getWorkspaceRole(auth?.session?.user)
  const pageDescription = workspaceRole === 'department'
    ? 'Theo dõi hồ sơ đề cương, bàn giao cuối kỳ, lượt đánh giá và cảnh báo tiến độ thuộc phạm vi bộ môn.'
    : workspaceRole === 'admin'
      ? 'Theo dõi cập nhật học vụ, thay đổi hệ thống và các sự kiện quan trọng trên nền tảng.'
      : workspaceRole === 'lecturer'
        ? 'Đề nghị hướng dẫn, lịch họp, phân công thẩm định và cập nhật từ các nhóm đồ án của bạn.'
        : 'Lịch họp, nhận xét từ giảng viên và các mốc tiến độ quan trọng của đồ án — tập trung ở một nơi.'

  return <WorkspacePage title="Thông báo" eyebrow="Trung tâm cập nhật" description={pageDescription}>
    <section className="notification-panel" aria-label="Danh sách thông báo" aria-busy={loading}>
      <div className="notification-toolbar">
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl label="Lọc thông báo" value={filter} options={[{value:'all',label:'Tất cả'},{value:'unread',label:'Chưa đọc'}]} disabled={busy} onChange={value=>{setFilter(value);setPage(1)}} />
          {unreadCount !== null && unreadCount > 0 && (
            <span className="inline-flex items-center rounded-full border border-status-warning-border bg-status-warning-bg px-2.5 py-0.5 text-xs font-semibold text-status-warning-text">
              {unreadCount} chưa đọc
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2"><button type="button" className="notification-action" disabled={busy || loading} onClick={() => void load()}>Làm mới</button><button type="button" className="notification-action" disabled={busy || loading || (unreadCount === null ? !data?.items.some(item => !item.isRead) : unreadCount === 0)} onClick={() => void mutate(markAllNotificationsRead).catch(() => {})}>Đánh dấu tất cả đã đọc</button></div>
      </div>
      {error && <p role="alert" className="notification-error">{error} <button type="button" disabled={loading || busy} onClick={() => void load()}>Tải lại</button></p>}
      {loading ? <NotificationLoading /> : data?.items.length ? (() => {
        const todayItems = data.items.filter(item => isNotificationToday(item.createdAt))
        const olderItems = data.items.filter(item => !isNotificationToday(item.createdAt))
        if (todayItems.length > 0 && olderItems.length > 0) {
          return (
            <div className="divide-y divide-hairline">
              <section aria-labelledby="notif-today-heading">
                <h2 id="notif-today-heading" className="px-6 pt-4 pb-2 text-xs font-bold uppercase tracking-wider text-ink-muted bg-canvas/70 border-b border-hairline">Hôm nay</h2>
                <ul className="notification-list">{todayItems.map(item => <NotificationRow key={item.id} item={item} busy={busy} headingLevel="h3" onRead={() => mutate(() => markNotificationRead(item.id))} />)}</ul>
              </section>
              <section aria-labelledby="notif-older-heading">
                <h2 id="notif-older-heading" className="px-6 pt-4 pb-2 text-xs font-bold uppercase tracking-wider text-ink-muted bg-canvas/70 border-b border-hairline">Trước đó</h2>
                <ul className="notification-list">{olderItems.map(item => <NotificationRow key={item.id} item={item} busy={busy} headingLevel="h3" onRead={() => mutate(() => markNotificationRead(item.id))} />)}</ul>
              </section>
            </div>
          )
        }
        return <ul className="notification-list">{data.items.map(item => <NotificationRow key={item.id} item={item} busy={busy} onRead={() => mutate(() => markNotificationRead(item.id))} />)}</ul>
      })() : !error ? <NotificationEmpty unread={filter === 'unread'} /> : null}
      {!loading && data && data.totalCount > data.pageSize && <nav aria-label="Trang thông báo" className="notification-pagination"><button type="button" className="notification-action" disabled={busy || page <= 1} onClick={() => setPage(value => value - 1)}>Trang trước</button><span>Trang {page} / {data.totalPages}</span><button type="button" className="notification-action" disabled={busy || page >= data.totalPages} onClick={() => setPage(value => value + 1)}>Trang sau</button></nav>}
    </section>
  </WorkspacePage>
}
