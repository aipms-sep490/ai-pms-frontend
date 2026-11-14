import { useEffect, useState } from 'react'
import { HttpError } from '../../services/http/http-client'
import { getPeriodCalendar, loadVietnamHolidays, savePeriodCalendar } from '../academic/api/period-policy-api'
import type { HolidayItem, PeriodCalendar } from '../academic/api/period-policy-api'

const weekdays = [
  ['CN', 0], ['Thứ 2', 1], ['Thứ 3', 2], ['Thứ 4', 3],
  ['Thứ 5', 4], ['Thứ 6', 5], ['Thứ 7', 6],
] as const
const normalize = (holidays: HolidayItem[]) => holidays.map(row => ({
  date: row.date, name: row.name.trim(), isRecurring: row.isRecurring,
})).sort((a, b) => a.date.localeCompare(b.date))
const same = (a: PeriodCalendar, mask: number, holidays: HolidayItem[]) =>
  a.workingDaysOfWeek === mask && JSON.stringify(normalize(a.holidays)) === JSON.stringify(normalize(holidays))
function message(reason: unknown): string {
  if (reason instanceof HttpError) {
    if (reason.status === 403) return 'Bạn không có quyền xem hoặc quản lý lịch của kỳ này.'
    if (reason.status === 409) return 'Lịch kỳ đã được người khác sửa. Tải lại trước khi lưu.'
    if (reason.status === 400 || reason.status === 422) return 'Ngày làm việc hoặc danh sách ngày nghỉ chưa hợp lệ.'
  }
  return 'Chưa tải hoặc lưu được lịch kỳ. Hãy kiểm tra kết nối và thử lại.'
}

export function PeriodCalendarPanel({ periodId, onChanged }: { periodId: number; onChanged: () => void }) {
  const [open, setOpen] = useState(false)
  const [calendar, setCalendar] = useState<PeriodCalendar | null>(null)
  const [mask, setMask] = useState(62)
  const [holidays, setHolidays] = useState<HolidayItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [revision, setRevision] = useState(0)
  const [year, setYear] = useState(2026)
  const [newDate, setNewDate] = useState('')
  const [newName, setNewName] = useState('')
  const [newRecurring, setNewRecurring] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    getPeriodCalendar(periodId, controller.signal).then(row => {
      if (!controller.signal.aborted) { setCalendar(row); setMask(row.workingDaysOfWeek); setHolidays(row.holidays); setError(''); setUncertain(false) }
    }).catch(reason => { if (!controller.signal.aborted) { setCalendar(null); setError(message(reason)) } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [periodId, revision])

  const reload = () => { setLoading(true); setError(''); setSuccess(''); setRevision(value => value + 1) }
  const dirty = Boolean(calendar && !same(calendar, mask, holidays))
  const uniqueDates = new Set(holidays.map(row => row.date)).size === holidays.length
  const valid = mask > 0 && mask <= 127 && holidays.length <= 500 && uniqueDates
    && holidays.every(row => /^\d{4}-\d{2}-\d{2}$/.test(row.date) && row.name.trim().length > 0 && row.name.length <= 200)
  const toggleDay = (bit: number) => setMask(value => value ^ (1 << bit))
  const addHoliday = () => {
    if (!newDate || !newName.trim() || holidays.some(row => row.date === newDate)) return
    setHolidays(rows => normalize([...rows, { date: newDate, name: newName.trim(), isRecurring: newRecurring }]))
    setNewDate(''); setNewName(''); setNewRecurring(false)
  }
  const save = async () => {
    if (!calendar || !valid || !dirty || uncertain) return
    setBusy(true); setError(''); setSuccess('')
    let sent = false
    try {
      await savePeriodCalendar(periodId, { workingDaysOfWeek: mask, holidays: normalize(holidays), concurrencyToken: calendar.concurrencyToken })
      sent = true
      const persisted = await getPeriodCalendar(periodId)
      if (!same(persisted, mask, holidays)) throw new Error('Calendar readback mismatch')
      setCalendar(persisted); setHolidays(persisted.holidays); onChanged()
      setSuccess('Đã xác minh lịch làm việc và ngày nghỉ của kỳ.')
    } catch (reason) {
      if (sent) { setUncertain(true); setError('Đã gửi lịch nhưng chưa xác minh được. Tải lại trước khi thao tác tiếp.') }
      else setError(message(reason))
    } finally { setBusy(false) }
  }
  const loadBaseline = async () => {
    if (!calendar || dirty || uncertain || year < 2025 || year > 2030) return
    setBusy(true); setError(''); setSuccess('')
    let sent = false
    try {
      const result = await loadVietnamHolidays(periodId, { year, concurrencyToken: calendar.concurrencyToken })
      sent = true
      const persisted = await getPeriodCalendar(periodId)
      if (!same(persisted, result.workingDaysOfWeek, result.holidays)) throw new Error('Calendar readback mismatch')
      setCalendar(persisted); setMask(persisted.workingDaysOfWeek); setHolidays(persisted.holidays); onChanged()
      setSuccess('Đã nạp và xác minh mốc ngày nghỉ mẫu. Cán bộ cần kiểm tra Tết và ngày nghỉ bù chính thức.')
    } catch (reason) {
      if (sent) { setUncertain(true); setError('Đã gửi lệnh nạp nhưng chưa xác minh được. Tải lại lịch kỳ.') }
      else setError(message(reason))
    } finally { setBusy(false) }
  }

  return <section aria-label="Lịch làm việc kỳ đồ án" className="rounded-2xl border border-hairline bg-surface p-4 shadow-xs">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-bold">Lịch làm việc của kỳ</h2>
        <p className="text-sm text-ink-muted">Ngày nghỉ và ngày làm việc quyết định ca có thể xếp cho Gate 3/4.</p></div>
      <button type="button" onClick={() => setOpen(value => !value)} className="min-h-11 rounded-lg border border-hairline px-3 text-sm font-semibold text-primary">{open ? 'Thu gọn' : 'Xem & cấu hình'}</button>
    </div>
    {loading && <p role="status" className="mt-3 text-sm">Đang tải lịch kỳ…</p>}
    {error && <p role="alert" className="mt-3 text-sm text-status-error-text">{error}</p>}
    {success && <p role="status" className="mt-3 text-sm text-status-success-text">{success}</p>}
    {(error || uncertain) && <button type="button" onClick={reload} className="mt-2 min-h-11 font-semibold text-primary underline">Tải lại lịch kỳ</button>}
    {open && calendar && !loading && <div className="mt-4 space-y-4">
      <fieldset disabled={busy || uncertain} className="rounded-xl border border-hairline p-3">
        <legend className="px-1 text-sm font-semibold">Ngày làm việc</legend>
        <div className="flex flex-wrap gap-3">{weekdays.map(([label, bit]) => <label key={bit} className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={Boolean(mask & (1 << bit))} onChange={() => toggleDay(bit)} />{label}
        </label>)}</div>
      </fieldset>
      <div className="rounded-xl border border-hairline p-3">
        <h3 className="text-sm font-semibold">Ngày nghỉ đã cấu hình ({holidays.length})</h3>
        {holidays.length === 0 && <p className="mt-2 text-sm text-ink-muted">Chưa có ngày nghỉ riêng của kỳ.</p>}
        <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-sm">{normalize(holidays).map(row => <li key={row.date} className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline py-1">
          <span>{row.date} · {row.name}{row.isRecurring ? ' · hằng năm' : ''}</span>
          <button type="button" disabled={busy || uncertain} onClick={() => setHolidays(rows => rows.filter(item => item.date !== row.date))} className="min-h-11 font-semibold text-status-error-text underline">Xóa</button>
        </li>)}</ul>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-sm font-semibold">Ngày<input type="date" value={newDate} disabled={busy || uncertain} onChange={event => setNewDate(event.target.value)} className="mt-1 min-h-11 rounded-lg border border-hairline px-2" /></label>
          <label className="text-sm font-semibold">Tên ngày nghỉ<input value={newName} maxLength={200} disabled={busy || uncertain} onChange={event => setNewName(event.target.value)} className="mt-1 min-h-11 rounded-lg border border-hairline px-2" /></label>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={newRecurring} disabled={busy || uncertain} onChange={event => setNewRecurring(event.target.checked)} />Hằng năm</label>
          <button type="button" disabled={busy || uncertain || !newDate || !newName.trim() || holidays.some(row => row.date === newDate)} onClick={addHoliday} className="min-h-11 rounded-lg border border-hairline px-3 text-sm font-semibold disabled:opacity-50">Thêm ngày nghỉ</button>
        </div>
      </div>
      {!valid && <p role="alert" className="text-sm text-status-error-text">Cần ít nhất một ngày làm việc và tối đa 500 ngày nghỉ khác ngày, có tên hợp lệ.</p>}
      <button type="button" disabled={busy || uncertain || !dirty || !valid} onClick={() => void save()} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">Lưu lịch kỳ</button>
      <div className="rounded-xl border border-hairline bg-canvas p-3">
        <p className="text-sm">Mốc ngày lễ Việt Nam 2025–2030 là dữ liệu tham khảo. Cán bộ phải đối chiếu lịch Tết và nghỉ bù chính thức từng năm trước khi xếp lịch.</p>
        <div className="mt-2 flex flex-wrap items-end gap-2"><label className="text-sm font-semibold">Năm
          <select value={year} onChange={event => setYear(Number(event.target.value))} disabled={busy || uncertain} className="mt-1 min-h-11 rounded-lg border border-hairline px-2">
            {[2025, 2026, 2027, 2028, 2029, 2030].map(value => <option key={value} value={value}>{value}</option>)}
          </select></label>
          <button type="button" disabled={busy || uncertain || dirty} onClick={() => void loadBaseline()} className="min-h-11 rounded-lg border border-hairline px-3 text-sm font-semibold disabled:opacity-50">Nạp mốc ngày nghỉ mẫu</button>
        </div>
        {dirty && <p className="mt-1 text-sm text-ink-muted">Lưu hoặc tải lại thay đổi đang sửa trước khi nạp mốc mẫu.</p>}
      </div>
    </div>}
  </section>
}
