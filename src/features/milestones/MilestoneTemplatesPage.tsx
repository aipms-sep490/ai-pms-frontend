import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { Button } from '../../components/ui/Button'
import { useActionConfirmation } from '../../components/ui/useActionConfirmation'
import { HttpError, httpGet } from '../../services/http/http-client'
import type { PagedResult, ProjectPeriodDto } from '../../types/backend'
import * as api from './milestone-templates-api'
import '../execution/execution.css'

const emptyItem: api.ItemDraft = { title: '', description: null, startOffsetDays: null, dueOffsetDays: null, sortOrder: 0 }
export function MilestoneTemplatesPage() {
  const [templates, setTemplates] = useState<api.MilestoneTemplate[]>([])
  const [periods, setPeriods] = useState<ProjectPeriodDto[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [versionId, setVersionId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editor, setEditor] = useState<{ id?: number; name: string; description: string } | null>(null)
  const [itemEditor, setItemEditor] = useState<(api.ItemDraft & { id?: number }) | null>(null)
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const load = useCallback(async () => {
    setLoading(true)
    try { setTemplates(await api.getMilestoneTemplates()); setError('') }
    catch (reason) { setError(message(reason)) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load(); void httpGet<PagedResult<ProjectPeriodDto>>('/academic/project-periods?page=1&pageSize=100').then(result => setPeriods(result.items)).catch(() => setPeriods([])) }, [load])
  const selected = templates.find(item => item.id === selectedId)
  const version = selected?.versions.find(item => item.id === versionId) ?? selected?.versions.at(-1)
  const writable = version?.status === 'DRAFT'
  async function run(operation: () => Promise<unknown>, success: string) {
    if (busy) return
    setBusy(true); setError(''); setNotice('')
    try { await operation(); await load(); setNotice(success); setEditor(null); setItemEditor(null) }
    catch (reason) { setError(message(reason)) }
    finally { setBusy(false) }
  }
  async function remove(title: string, operation: () => Promise<unknown>) {
    if (await requestConfirmation({ title: `Xóa ${title}?`, description: 'Thao tác chỉ được chấp nhận khi dữ liệu chưa được sử dụng hoặc khóa.', confirmLabel: 'Xóa', danger: true }) !== null) await run(operation, 'Đã xóa dữ liệu.')
  }
  function saveTemplate(event: FormEvent) { event.preventDefault(); if (!editor?.name.trim()) return; const body = { name: editor.name.trim(), description: editor.description.trim() || null }; void run(() => editor.id ? api.updateMilestoneTemplate(editor.id, body) : api.createMilestoneTemplate(body), 'Đã lưu mẫu mốc.') }
  function saveItem(event: FormEvent) { event.preventDefault(); if (!itemEditor?.title.trim() || !version || !writable) return; const { id, ...body } = itemEditor; void run(() => id ? api.updateTemplateItem(id, body) : api.createTemplateItem(version.id, body), 'Đã lưu mốc trong mẫu.') }
  return <WorkspacePage className="execution-page" title="Mẫu mốc đồ án" eyebrow="Quản trị học vụ" description="Chuẩn bị bộ mốc dùng chung, quản lý phiên bản và áp dụng cho từng kỳ đồ án." action={<Button disabled={busy} icon="add" onClick={() => setEditor({ name: '', description: '' })}>Tạo mẫu</Button>}>
    {confirmationDialog}
    {error && <div role="alert" className="ex-notice ex-notice-error">{error}<button type="button" className="ex-text-button" onClick={() => void load()}>Tải lại</button></div>}
    {notice && <p role="status" className="ex-notice">{notice}</p>}
    {editor && <form className="ex-panel ex-form api-form" onSubmit={saveTemplate}><h2>{editor.id ? 'Chỉnh sửa mẫu' : 'Mẫu mới'}</h2><label>Tên mẫu<input required maxLength={200} value={editor.name} onChange={e => setEditor({ ...editor, name: e.target.value })} /></label><label>Mô tả<textarea rows={3} value={editor.description} onChange={e => setEditor({ ...editor, description: e.target.value })} /></label><div className="flex gap-3"><Button type="submit" disabled={busy}>Lưu mẫu</Button><Button variant="secondary" disabled={busy} onClick={() => setEditor(null)}>Hủy</Button></div></form>}
    <section className="ex-panel"><div className="ex-panel-heading"><h2>Các mẫu hiện có</h2><Button variant="secondary" icon="refresh" disabled={busy || loading} onClick={() => void load()}>Tải lại</Button></div>{loading ? <p role="status" className="ex-padding">Đang tải mẫu mốc…</p> : !templates.length ? <p className="ex-padding ex-muted">Chưa có mẫu. Tạo mẫu đầu tiên để bắt đầu.</p> : <ul>{templates.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-6 py-4 last:border-b-0"><button type="button" className="min-w-0 text-left" aria-pressed={selectedId === item.id} onClick={() => { setSelectedId(item.id); setVersionId(null); setItemEditor(null) }}><strong className="block text-primary">{item.name}</strong><span className="ex-muted">{item.description || 'Chưa có mô tả'} · {item.versions.length} phiên bản</span></button><div className="flex gap-4"><button className="ex-text-button" disabled={busy} onClick={() => setEditor({ id: item.id, name: item.name, description: item.description || '' })}>Sửa</button><button className="ex-text-button ex-danger-text" disabled={busy} onClick={() => void remove(`mẫu “${item.name}”`, () => api.deleteMilestoneTemplate(item.id))}>Xóa</button></div></li>)}</ul>}</section>
    {selected && <section className="ex-panel"><div className="ex-panel-heading"><div><h2>{selected.name}</h2><p>Phiên bản đã công bố được giữ nguyên; tạo phiên bản mới khi cần thay đổi.</p></div><Button variant="secondary" disabled={busy} onClick={() => void run(() => api.createTemplateVersion(selected.id).then(next => setVersionId(next.id)), 'Đã tạo phiên bản mới.')}>Tạo phiên bản</Button></div><div className="ex-padding ex-stack">
      {version ? <><div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2">Phiên bản<select className="rounded-lg border p-2" value={version.id} onChange={e => { setVersionId(Number(e.target.value)); setItemEditor(null) }}>{selected.versions.map(v => <option key={v.id} value={v.id}>Phiên bản {v.versionNumber} · {v.status === 'PUBLISHED' ? 'Đã công bố' : 'Bản nháp'}</option>)}</select></label>{writable && <><Button variant="secondary" disabled={busy} onClick={() => setItemEditor({ ...emptyItem, sortOrder: version.items.length })}>Thêm mốc</Button><Button disabled={busy || !version.items.length} onClick={async () => { if (await requestConfirmation({ title: 'Công bố phiên bản mẫu?', description: 'Các mốc trong phiên bản này sẽ được khóa sau khi công bố.', confirmLabel: 'Công bố' }) !== null) await run(() => api.publishTemplateVersion(version.id), 'Đã công bố phiên bản.') }}>Công bố</Button></>}</div>
      <ul>{version.items.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline py-4"><div><strong>{item.title}</strong><p className="ex-muted">{item.description}</p><p className="ex-muted">Bắt đầu: {item.startOffsetDays ?? '—'} ngày · Hạn: {item.dueOffsetDays ?? '—'} ngày · Thứ tự: {item.sortOrder}</p></div>{writable && <div className="flex gap-4"><button className="ex-text-button" disabled={busy} onClick={() => setItemEditor(item)}>Sửa mốc</button><button className="ex-text-button ex-danger-text" disabled={busy} onClick={() => void remove(`mốc “${item.title}”`, () => api.deleteTemplateItem(item.id))}>Xóa mốc</button></div>}</li>)}</ul>
      {itemEditor && writable && <form className="ex-form api-form" onSubmit={saveItem}><h3>{itemEditor.id ? 'Sửa mốc' : 'Thêm mốc vào mẫu'}</h3><label>Tên mốc<input required value={itemEditor.title} onChange={e => setItemEditor({ ...itemEditor, title: e.target.value })} /></label><label>Mô tả<textarea rows={2} value={itemEditor.description || ''} onChange={e => setItemEditor({ ...itemEditor, description: e.target.value || null })} /></label><div className="grid gap-4 sm:grid-cols-3">{(['startOffsetDays', 'dueOffsetDays', 'sortOrder'] as const).map(key => <label key={key}>{({ startOffsetDays: 'Ngày bắt đầu tính từ đầu kỳ', dueOffsetDays: 'Ngày đến hạn tính từ đầu kỳ', sortOrder: 'Thứ tự' })[key]}<input type="number" min={0} value={itemEditor[key] ?? ''} onChange={e => setItemEditor({ ...itemEditor, [key]: e.target.value === '' ? (key === 'sortOrder' ? 0 : null) : Number(e.target.value) })} /></label>)}</div><div className="flex gap-3"><Button type="submit" disabled={busy}>Lưu mốc</Button><Button variant="secondary" disabled={busy} onClick={() => setItemEditor(null)}>Hủy</Button></div></form>}
      {version.status === 'PUBLISHED' && <form className="flex flex-wrap items-end gap-3 border-t border-hairline pt-4" onSubmit={e => { e.preventDefault(); const id = Number(new FormData(e.currentTarget).get('period')); if (id > 0) void run(() => api.assignMilestoneTemplate(id, selected.id, version.id), 'Đã áp dụng mẫu cho kỳ đồ án.') }}><label className="grid gap-2">Áp dụng cho kỳ đồ án<select name="period" required className="min-h-10 rounded-lg border px-3"><option value="">Chọn kỳ đồ án</option>{periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><Button type="submit" disabled={busy || !periods.length}>Áp dụng mẫu</Button>{!periods.length && <p className="ex-muted">Chưa tải được kỳ đồ án. Kiểm tra cấu hình học vụ rồi tải lại trang.</p>}</form>}
      </> : <p className="ex-muted">Chưa có phiên bản. Tạo phiên bản để thêm các mốc.</p>}
    </div></section>}
  </WorkspacePage>
}
function message(reason: unknown) { if (reason instanceof HttpError) { if (reason.status === 403) return 'Bạn chưa có quyền quản lý mẫu mốc.'; if (reason.status === 409) return 'Mẫu đã được sử dụng hoặc dữ liệu vừa thay đổi. Hãy tải lại trước khi sửa.'; if (reason.status === 400) return reason.problem?.detail || 'Kiểm tra tên mốc và các ngày trong mẫu.' } return 'Chưa hoàn tất thao tác. Hãy thử lại.' }
