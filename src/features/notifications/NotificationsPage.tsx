import { useCallback, useEffect, useRef, useState } from 'react'
import { HttpError } from '../../services/http/http-client'
import { getNotifications, getUnreadCount, markAllNotificationsRead, markNotificationRead, type NotificationPage } from './notifications-api'
import { NotificationRow, NotificationEmpty, NotificationLoading } from './NotificationRow'
import { WorkspacePage } from '../../components/ui/WorkspacePage'

export function NotificationsPage() {
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [data, setData] = useState<NotificationPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState<number | null>(null)
  const request = useRef(0)
  const mutation = useRef(false)
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
  const mutate = async (operation: () => Promise<void>) => {
    if (mutation.current) return
    mutation.current = true
    setBusy(true)
    try {
      await operation()
      window.dispatchEvent(new Event('ai-pms:notifications-changed'))
    } catch { setError('Không thể cập nhật thông báo. Hãy thử lại sau.') }
    finally { mutation.current = false; setBusy(false) }
  }
  return <WorkspacePage title="Thông báo" eyebrow="Trung tâm cập nhật" description="Lịch họp, nhận xét và những thay đổi cần theo dõi — tập trung ở một nơi.">
    <section className="notification-panel" aria-label="Danh sách thông báo" aria-busy={loading}>
      <div className="notification-toolbar">
        <div className="notification-tabs" role="group" aria-label="Lọc thông báo">{(['all', 'unread'] as const).map(value => <button key={value} type="button" disabled={busy} aria-pressed={filter === value} onClick={() => { setFilter(value); setPage(1) }}>{value === 'all' ? 'Tất cả' : 'Chưa đọc'}</button>)}</div>
        <div className="flex flex-wrap items-center gap-2"><button type="button" className="notification-action" disabled={busy || loading} onClick={() => void load()}>Làm mới</button><button type="button" className="notification-action" disabled={busy || loading || (unreadCount === null ? !data?.items.some(item => !item.isRead) : unreadCount === 0)} onClick={() => void mutate(markAllNotificationsRead)}>Đánh dấu tất cả đã đọc</button></div>
      </div>
      {error && <p role="alert" className="notification-error">{error} <button type="button" disabled={loading || busy} onClick={() => void load()}>Tải lại</button></p>}
      {loading ? <NotificationLoading /> : data?.items.length ? <ul className="notification-list">{data.items.map(item => <NotificationRow key={item.id} item={item} busy={busy} onRead={() => void mutate(() => markNotificationRead(item.id))} />)}</ul> : !error ? <NotificationEmpty unread={filter === 'unread'} /> : null}
      {!loading && data && data.totalCount > data.pageSize && <nav aria-label="Trang thông báo" className="notification-pagination"><button type="button" className="notification-action" disabled={busy || page <= 1} onClick={() => setPage(value => value - 1)}>Trang trước</button><span>Trang {page} / {data.totalPages}</span><button type="button" className="notification-action" disabled={busy || page >= data.totalPages} onClick={() => setPage(value => value + 1)}>Trang sau</button></nav>}
    </section>
  </WorkspacePage>
}
