import { useCallback, useEffect, useState } from 'react'
import { HttpError } from '../../services/http/http-client'
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationPage,
} from './notifications-api'

export function NotificationsPage() {
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [data, setData] = useState<NotificationPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await getNotifications(page, filter === 'unread' ? false : undefined))
      setError(null)
    } catch (reason) {
      setError(reason instanceof HttpError && reason.status === 401
        ? 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.'
        : reason instanceof HttpError && reason.status === 403
          ? 'Bạn không có quyền xem hộp thông báo này.'
          : 'Không thể tải thông báo. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }, [filter, page])

  useEffect(() => { void load() }, [load])

  const mutate = async (operation: () => Promise<void>) => {
    setBusy(true)
    try {
      await operation()
      await load()
      window.dispatchEvent(new Event('ai-pms:notifications-changed'))
    } catch (reason) {
      if (reason instanceof HttpError && reason.status === 409) await load()
      setError('Không thể cập nhật thông báo. Danh sách đã được tải lại; hãy kiểm tra trước khi thử tiếp.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="mx-auto max-w-4xl space-y-5 pb-12">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-slate-900">Thông báo</h1><p className="mt-1 text-sm text-slate-600">Thông báo dành cho tài khoản đang đăng nhập.</p></div>
      <button type="button" className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 disabled:opacity-50" disabled={busy || loading || !data?.items.some(item => !item.isRead)} onClick={() => void mutate(markAllNotificationsRead)}>Đánh dấu tất cả đã đọc</button>
    </header>
    <div className="flex gap-2" role="group" aria-label="Lọc thông báo">
      {(['all', 'unread'] as const).map(value => <button key={value} type="button" aria-pressed={filter === value} className={`min-h-11 rounded-lg px-4 text-sm font-semibold ${filter === value ? 'bg-blue-700 text-white' : 'border border-slate-300 bg-white text-slate-700'}`} onClick={() => { setFilter(value); setPage(1) }}>{value === 'all' ? 'Tất cả' : 'Chưa đọc'}</button>)}
    </div>
    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error} <button type="button" className="font-semibold underline" onClick={() => void load()}>Tải lại</button></p>}
    {loading && <p role="status" className="rounded-lg border bg-white p-5 text-sm">Đang tải thông báo…</p>}
    {!loading && data?.items.length === 0 && <p className="rounded-lg border bg-white p-6 text-sm text-slate-600">Chưa có thông báo trong mục này.</p>}
    {!loading && <ul className="space-y-3">{data?.items.map(item => <li key={item.id} className={`rounded-xl border p-5 ${item.isRead ? 'border-slate-200 bg-white' : 'border-blue-200 bg-blue-50'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-semibold text-slate-900">{item.title}</h2><p className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString('vi-VN')} · {item.notificationType}</p></div>{!item.isRead && <button type="button" disabled={busy} className="min-h-11 rounded-lg border border-blue-300 px-3 text-xs font-semibold text-blue-800 disabled:opacity-50" onClick={() => void mutate(() => markNotificationRead(item.id))}>Đánh dấu đã đọc</button>}</div>
      <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{item.content}</p>
    </li>)}</ul>}
    {!loading && data && data.totalCount > data.pageSize && <nav aria-label="Trang thông báo" className="flex items-center justify-between gap-3 text-sm"><button type="button" disabled={page <= 1} className="min-h-11 rounded-lg border px-4 disabled:opacity-40" onClick={() => setPage(value => value - 1)}>Trang trước</button><span>Trang {page} / {data.totalPages}</span><button type="button" disabled={page >= data.totalPages} className="min-h-11 rounded-lg border px-4 disabled:opacity-40" onClick={() => setPage(value => value + 1)}>Trang sau</button></nav>}
  </main>
}
