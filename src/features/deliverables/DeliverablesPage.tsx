import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../services/api/deliverables.api'
import { useExecutionAccess } from '../execution/context/ExecutionAccessContext'
import { deliverableError, needsAuthoritativeRefresh } from './deliverable-errors'
import type { Deliverable, DeliverableVersion } from './deliverable-types'

const statusLabel: Record<string, string> = { DRAFT: 'Bản nháp', OPEN: 'Đang mở', SUBMITTED: 'Đã nộp', ACCEPTED: 'Đã chấp nhận', REJECTED: 'Cần chỉnh sửa', CLOSED: 'Đã khóa' }

export function DeliverablesPage() {
  const access = useExecutionAccess()
  return <DeliverablesView key={`${access.project.id}:${access.actor}`} />
}

function DeliverablesView() {
  const access = useExecutionAccess()
  const { project, actor, canManageStructure, routeBase } = access
  const [items, setItems] = useState<Deliverable[]>([])
  const [selected, setSelected] = useState<Deliverable | null>(null)
  const [versions, setVersions] = useState<DeliverableVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError(null)
    try { const data = await api.getDeliverables(project.id, { search: search.trim() || undefined }, signal); setItems(data.items) }
    catch (reason) { if (!signal?.aborted) setError(deliverableError(reason)) }
    finally { if (!signal?.aborted) setLoading(false) }
  }, [project.id, search])

  const loadVersions = useCallback(async (item: Deliverable, signal?: AbortSignal) => {
    setSelected(item); setVersions([]); setError(null)
    try { const data = await api.getDeliverableVersions(item.id, 1, 50, signal); if (!signal?.aborted) setVersions(data.items) }
    catch (reason) { if (!signal?.aborted) setError(deliverableError(reason)) }
  }, [])

  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort() }, [load])

  async function complete(action: () => Promise<unknown>, reloadVersions = false) {
    setBusy(true); setError(null)
    try {
      await action()
      await load()
      if (reloadVersions && selected) await loadVersions(selected)
    } catch (reason) {
      if (needsAuthoritativeRefresh(reason)) {
        await load()
        if (selected) await loadVersions(selected)
      }
      setError(deliverableError(reason))
    } finally { setBusy(false) }
  }

  function createDefinition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    const title = String(form.get('title') ?? '').trim()
    if (!title) return
    void complete(async () => {
      await api.createDeliverable(project.id, {
        title, milestoneId: null, description: String(form.get('description') ?? '').trim() || null,
        deliverableType: String(form.get('deliverableType') ?? '').trim() || null, dueAt: toUtc(String(form.get('dueAt') ?? '')),
      })
      event.currentTarget.reset()
    })
  }

  function submitVersion(event: FormEvent<HTMLFormElement>, item: Deliverable) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const field = event.currentTarget.elements.namedItem('file'); const files = field instanceof HTMLInputElement ? field.files : null; const file = files ? (typeof files.item === 'function' ? files.item(0) : files[0]) : null
    if (!isUploadFile(file)) { setError('Hãy chọn một tệp trước khi nộp phiên bản.'); return }
    void complete(() => api.submitDeliverableVersion(item.id, item.latestVersion, file, String(form.get('note') ?? '')), selected?.id === item.id)
  }

  function reviewVersion(event: FormEvent<HTMLFormElement>, version: DeliverableVersion) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const feedback = String(form.get('feedback') ?? '').trim()
    if (!feedback) return
    void complete(() => api.reviewDeliverableVersion(version.id, String(form.get('decision')) as 'ACCEPTED' | 'REJECTED', feedback), true)
  }

  return <main className="mx-auto max-w-6xl space-y-6 pb-12">
    <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-start sm:justify-between sm:p-6">
      <div><p className="text-[11px] font-semibold uppercase tracking-[.14em] text-slate-500">Evidence repository</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Deliverables & phiên bản</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">Tệp đã nộp là phiên bản bất biến. Quyền, hạn nộp, trạng thái Project và phiên bản mới nhất được Backend kiểm tra lại khi nhận thao tác.</p></div>
      <Link className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700" to={`${routeBase}/workspace`}>Về workspace</Link>
    </header>
    {error ? <section role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</section> : null}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <label className="block text-sm font-semibold text-slate-700">Tìm deliverable<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên deliverable" /></label>
      {canManageStructure ? <form className="mt-5 grid gap-3 border-t border-slate-100 pt-5 md:grid-cols-2" onSubmit={createDefinition}>
        <h2 className="md:col-span-2 text-sm font-bold text-slate-900">Tạo định nghĩa deliverable</h2>
        <input aria-label="Tên deliverable" name="title" required maxLength={255} className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Tên deliverable" />
        <input aria-label="Loại deliverable" name="deliverableType" maxLength={50} className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Loại, ví dụ REPORT" />
        <textarea aria-label="Mô tả deliverable" name="description" maxLength={10000} className="rounded-lg border border-slate-300 px-3 py-2 md:col-span-2" placeholder="Mô tả (không bắt buộc)" />
        <label className="text-xs text-slate-600">Hạn nộp (giờ Việt Nam)<input aria-label="Hạn nộp" name="dueAt" type="datetime-local" className="mt-1 block rounded-lg border border-slate-300 px-3 py-2" /></label>
        <button disabled={busy} className="self-end rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Tạo định nghĩa</button>
      </form> : <p className="mt-4 text-xs text-slate-500">Chỉ trưởng nhóm hoặc GVHD được phân công mới có thể tạo/sửa định nghĩa. Thành viên vẫn có thể nộp phiên bản khi Backend cho phép.</p>}
    </section>
    <section className="space-y-3" aria-live="polite">
      {loading ? <p role="status" className="rounded-xl border bg-white p-4 text-sm text-slate-600">Đang tải deliverables do Backend cấp quyền…</p> : null}
      {!loading && !items.length ? <p className="rounded-xl border bg-white p-4 text-sm text-slate-600">Chưa có deliverable phù hợp. Hệ thống không tự tạo dữ liệu.</p> : null}
      {items.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="font-bold text-slate-900">{item.title}</h2><p className="mt-1 text-xs text-slate-500">{item.deliverableType || 'Chưa phân loại'} · {statusLabel[item.status] || item.status} · phiên bản mới nhất: {item.latestVersion}</p>{item.description ? <p className="mt-2 text-sm text-slate-600">{item.description}</p> : null}</div><button type="button" onClick={() => void loadVersions(item)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">Xem phiên bản</button></div>
        <form className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row" onSubmit={(event) => submitVersion(event, item)}>
          <input aria-label={`Tệp ${item.title}`} name="file" type="file" required className="min-w-0 text-xs" /><input aria-label={`Ghi chú ${item.title}`} name="note" maxLength={2000} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs" placeholder="Ghi chú phiên bản (không bắt buộc)" /><button disabled={busy} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Nộp phiên bản</button>
        </form>
      </article>)}
    </section>
    {selected ? <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-slate-900">Lịch sử phiên bản: {selected.title}</h2><button type="button" onClick={() => { setSelected(null); setVersions([]) }} className="text-xs font-bold text-slate-600">Đóng</button></div>{!versions.length ? <p className="mt-4 text-sm text-slate-600">Chưa có phiên bản được Backend trả về.</p> : <div className="mt-4 space-y-4">{versions.map((version) => <article key={version.id} className="rounded-xl border border-slate-200 p-4"><p className="font-semibold text-slate-900">V{version.versionNumber} · {statusLabel[version.status] || version.status}</p><p className="mt-1 text-xs text-slate-500">{version.files.map((file) => file.fileName).join(', ') || 'Không có metadata tệp'} · {formatDate(version.submittedAt)}</p>{version.note ? <p className="mt-2 text-sm text-slate-600">{version.note}</p> : null}{actor === 'supervisor' && version.status === 'SUBMITTED' ? <form className="mt-3 grid gap-2 sm:grid-cols-[10rem_1fr_auto]" onSubmit={(event) => reviewVersion(event, version)}><select aria-label={`Quyết định V${version.versionNumber}`} name="decision" className="rounded-lg border border-slate-300 px-2 py-2 text-sm"><option value="ACCEPTED">Chấp nhận</option><option value="REJECTED">Yêu cầu chỉnh sửa</option></select><input aria-label={`Nhận xét V${version.versionNumber}`} name="feedback" required maxLength={10000} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Nhận xét bắt buộc" /><button disabled={busy} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Gửi review</button></form> : null}</article>)}</div>}</section> : null}
  </main>
}

function toUtc(value: string): string | null { return value ? new Date(`${value}:00+07:00`).toISOString() : null }
function formatDate(value: string): string { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(date) }
function isUploadFile(value: FormDataEntryValue | null): value is File { return value !== null && typeof value === 'object' && 'size' in value && Number(value.size) > 0 && 'name' in value }
