import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { ListLoading } from '../../../components/ui/ListLoading'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../../../components/ui/Table'
import { HttpError } from '../../../services/http/http-client'
import { utcTimestamp } from '../../projects/utils/collaboration-workspace'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { getAccessEvents, type AccessEvent, type AccessEventQuery, type Page } from '../api/admin-api'

const timeFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
})

function dateBoundary(day: string, end = false): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return undefined
  const parsed = new Date(`${day}T${end ? '23:59:59.999' : '00:00:00.000'}+07:00`)
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : undefined
}

export function AccessEventsPanel() {
  const { session } = useAuthSession()
  const [params, setParams] = useSearchParams()
  const searchInput = params.get('accessSearch') ?? ''
  const eventInput = params.get('accessEvent') ?? ''
  const outcomeInput = params.get('accessOutcome') ?? ''
  const fromInput = params.get('accessFrom') ?? ''
  const toInput = params.get('accessTo') ?? ''
  const pageInput = Number(params.get('accessPage') ?? '1')
  const page = Number.isSafeInteger(pageInput) && pageInput > 0 ? pageInput : 1
  const filters: AccessEventQuery = {
    search: searchInput.trim() || undefined,
    eventType: eventInput === 'LOGIN' || eventInput === 'LOGOUT' ? eventInput : undefined,
    outcome: outcomeInput === 'SUCCESS' || outcomeInput === 'FAILURE' || outcomeInput === 'DENIED' ? outcomeInput : undefined,
    fromUtc: dateBoundary(fromInput), toUtc: dateBoundary(toInput, true), page,
  }
  const filterKey = JSON.stringify(filters)
  const invalidRange = Boolean(filters.fromUtc && filters.toUtc && filters.fromUtc > filters.toUtc)
  const [data, setData] = useState<Page<AccessEvent> | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)

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

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    updateFilters({
      accessSearch: String(values.get('search') ?? '').trim(),
      accessEvent: String(values.get('eventType') ?? ''),
      accessOutcome: String(values.get('outcome') ?? ''),
      accessFrom: String(values.get('fromUtc') ?? ''),
      accessTo: String(values.get('toUtc') ?? ''),
    })
  }

  return <section id="access-events" className="admin-panel" aria-labelledby="access-events-title">
    <div className="admin-panel-heading"><div>
      <h2 id="access-events-title">Nhật ký truy cập</h2>
      <p>Các lượt đăng nhập và đăng xuất được máy chủ ghi nhận. Lần đăng nhập không chứng minh người dùng đang trực tuyến; IP là địa chỉ mạng, không phải vị trí địa lý.</p>
    </div></div>
    <form key={[searchInput, eventInput, outcomeInput, fromInput, toInput].join('|')} className="admin-filter" onSubmit={submit}>
      <label>Người dùng<input name="search" defaultValue={searchInput} maxLength={255} placeholder="Tên hoặc email" /></label>
      <label>Sự kiện<select name="eventType" defaultValue={eventInput}><option value="">Tất cả</option><option value="LOGIN">Đăng nhập</option><option value="LOGOUT">Đăng xuất</option></select></label>
      <label>Kết quả<select name="outcome" defaultValue={outcomeInput}><option value="">Tất cả</option><option value="SUCCESS">Thành công</option><option value="FAILURE">Thất bại</option><option value="DENIED">Bị từ chối</option></select></label>
      <label>Từ ngày (giờ Việt Nam)<input name="fromUtc" type="date" defaultValue={fromInput} /></label>
      <label>Đến ngày (giờ Việt Nam)<input name="toUtc" type="date" defaultValue={toInput} /></label>
      <Button type="submit" variant="secondary">Lọc truy cập</Button>
      {(searchInput || eventInput || outcomeInput || fromInput || toInput) && <Button type="button" variant="outline" onClick={() => updateFilters({ accessSearch: '', accessEvent: '', accessOutcome: '', accessFrom: '', accessTo: '' })}>Đặt lại truy cập</Button>}
    </form>
    {loading && <ListLoading label="Đang tải nhật ký truy cập…" />}
    {error && <p role="alert" className="admin-error">{error.message === 'INVALID_DATE_RANGE' ? 'Từ ngày phải trước hoặc trùng đến ngày.' : error instanceof HttpError && error.status === 403 ? 'Bạn không có quyền xem nhật ký truy cập.' : 'Chưa tải được nhật ký truy cập.'} {error.message !== 'INVALID_DATE_RANGE' && <Button size="sm" variant="outline" onClick={() => setRevision(value => value + 1)}>Thử lại</Button>}</p>}
    {!loading && !error && data?.items.length === 0 && <p role="status">Không có lượt truy cập phù hợp với bộ lọc.</p>}
    {!loading && !error && data && data.items.length > 0 && <Table stack>
      <TableHead><TableRow head><TableHeaderCell>Người dùng</TableHeaderCell><TableHeaderCell>Sự kiện</TableHeaderCell><TableHeaderCell>Kết quả</TableHeaderCell><TableHeaderCell>Thời gian</TableHeaderCell><TableHeaderCell>IP truy cập</TableHeaderCell></TableRow></TableHead>
      <TableBody>{data.items.map(item => <TableRow key={item.id}>
        <TableCell label="Người dùng">{item.userId ? <Link to={`/admin/access/users/${item.userId}`} className="font-semibold text-primary">{item.fullName ?? item.email ?? `Tài khoản #${item.userId}`}</Link> : 'Không xác định'}{item.email && <small className="block text-ink-muted">{item.email}</small>}</TableCell>
        <TableCell label="Sự kiện">{item.eventType === 'LOGIN' ? 'Đăng nhập' : 'Đăng xuất'}{item.eventType === 'LOGIN' && <small className="block text-ink-muted">{item.authenticationMethod === 'GOOGLE' ? 'Google' : item.authenticationMethod === 'PASSWORD' ? 'Mật khẩu' : 'Không xác định'}</small>}</TableCell>
        <TableCell label="Kết quả">{item.outcome === 'SUCCESS' ? 'Thành công' : item.outcome === 'DENIED' ? 'Bị từ chối' : item.outcome === 'FAILURE' ? 'Thất bại' : item.outcome}</TableCell>
        <TableCell label="Thời gian"><time dateTime={item.occurredAt}>{timeFormatter.format(utcTimestamp(item.occurredAt))}</time></TableCell>
        <TableCell label="IP truy cập">{item.ipAddress ?? 'Không ghi nhận'}</TableCell>
      </TableRow>)}</TableBody>
    </Table>}
    {!loading && !error && data && data.totalCount > 0 && <div className="admin-pagination"><span>Trang {data.page}/{Math.ceil(data.totalCount / data.pageSize)} · {data.totalCount} lượt</span><div className="flex items-center gap-1"><Button size="sm" variant="outline" disabled={data.page <= 1} onClick={() => updateFilters({ accessPage: String(data.page - 1) })}>Trang trước</Button><Button size="sm" variant="outline" disabled={data.page * data.pageSize >= data.totalCount} onClick={() => updateFilters({ accessPage: String(data.page + 1) })}>Trang sau</Button></div></div>}
  </section>
}
