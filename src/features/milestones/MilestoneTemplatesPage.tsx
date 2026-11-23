import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { ConfigModeFrame } from '../../components/ui/ConfigModeFrame'
import { FilterToolbar, type ActiveFilterChip } from '../../components/ui/FilterToolbar'
import { Modal } from '../../components/ui/Modal'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useActionConfirmation } from '../../components/ui/useActionConfirmation'
import { WorkspaceEmptyState } from '../../components/ui/WorkspaceState'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { HttpError, httpGet } from '../../services/http/http-client'
import type { PagedResult, ProjectPeriodDto } from '../../types/backend'
import '../execution/execution.css'
import * as api from './milestone-templates-api'

const emptyItem: api.ItemDraft = { title: '', description: null, startOffsetDays: null, dueOffsetDays: null, sortOrder: 0 }

export function MilestoneTemplatesPage() {
  const [templates, setTemplates] = useState<api.MilestoneTemplate[]>([])
  const [periods, setPeriods] = useState<ProjectPeriodDto[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [versionId, setVersionId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editor, setEditor] = useState<{ id?: number; name: string; description: string } | null>(null)
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const formRef = useRef<HTMLFormElement>(null)
  const [itemEditor, setItemEditor] = useState<(api.ItemDraft & { id?: number }) | null>(null)
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setTemplates(await api.getMilestoneTemplates())
      setError('')
    } catch (reason) {
      setError(message(reason))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    void httpGet<PagedResult<ProjectPeriodDto>>('/academic/project-periods?page=1&pageSize=100')
      .then(result => setPeriods(result.items))
      .catch(() => setPeriods([]))
  }, [load])

  const filteredTemplates = useMemo(() => {
    const query = search.trim().toLowerCase()
    return templates.filter(item => {
      if (query && !`${item.name} ${item.description ?? ''}`.toLowerCase().includes(query)) return false
      if (statusFilter === 'PUBLISHED' && !item.versions.some(v => v.status === 'PUBLISHED')) return false
      if (statusFilter === 'DRAFT' && !item.versions.some(v => v.status === 'DRAFT')) return false
      return true
    })
  }, [search, statusFilter, templates])

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = []
    if (search.trim()) chips.push({ id: 'search', label: 'Từ khóa', value: search.trim() })
    if (statusFilter !== 'ALL') {
      chips.push({ id: 'status', label: 'Phiên bản', value: statusFilter === 'PUBLISHED' ? 'Có bản công bố' : 'Có bản nháp' })
    }
    return chips
  }, [search, statusFilter])

  const selected = templates.find(item => item.id === selectedId)
  const version = selected?.versions.find(item => item.id === versionId) ?? selected?.versions.at(-1)
  const writable = version?.status === 'DRAFT'

  async function run(operation: () => Promise<unknown>, success: string) {
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await operation()
      await load()
      setNotice(success)
      setEditor(null)
      setMode('view')
      setItemEditor(null)
    } catch (reason) {
      setError(message(reason))
    } finally {
      setBusy(false)
    }
  }

  async function remove(title: string, operation: () => Promise<unknown>) {
    if (
      (await requestConfirmation({
        title: `Xóa ${title}?`,
        description: 'Thao tác chỉ được chấp nhận khi dữ liệu chưa được sử dụng hoặc khóa.',
        confirmLabel: 'Xóa',
        danger: true,
      })) !== null
    ) {
      await run(operation, 'Đã xóa dữ liệu.')
    }
  }

  function saveTemplate(event: FormEvent) {
    event.preventDefault()
    if (!editor?.name.trim()) return
    const body = { name: editor.name.trim(), description: editor.description.trim() || null }
    void run(
      () => (editor.id ? api.updateMilestoneTemplate(editor.id, body) : api.createMilestoneTemplate(body)),
      'Đã lưu mẫu mốc.',
    )
  }

  function saveItem(event: FormEvent) {
    event.preventDefault()
    if (!itemEditor?.title.trim() || !version || !writable) return
    const { id, ...body } = itemEditor
    void run(
      () => (id ? api.updateTemplateItem(id, body) : api.createTemplateItem(version.id, body)),
      'Đã lưu mốc trong mẫu.',
    )
  }

  const original = templates.find(item => item.id === editor?.id)
  const dirty = Boolean(editor && (editor.name !== (original?.name ?? '') || editor.description !== (original?.description ?? '')))

  return (
    <WorkspacePage
      size="wide"
      className="execution-page milestone-templates-page"
      title="Mẫu mốc đồ án"
      eyebrow="Quản trị học vụ"
      description="Chuẩn bị bộ mốc dùng chung, quản lý phiên bản và áp dụng cho từng kỳ đồ án."
      action={
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon="refresh" disabled={busy || loading} onClick={() => void load()}>Tải lại</Button>
          <Button disabled={busy} icon="add" onClick={() => { setEditor({ name: '', description: '' }); setMode('edit') }}>Tạo mẫu</Button>
        </div>
      }
    >
      {confirmationDialog}
      {error && (
        <div role="alert" className="ex-notice ex-notice-error">
          {error}
          <button type="button" className="ex-text-button" onClick={() => void load()}>Tải lại</button>
        </div>
      )}
      {notice && <p role="status" className="ex-notice">{notice}</p>}

      <ConfigModeFrame
        mode={mode}
        dirty={dirty}
        busy={busy}
        onEdit={() => { setEditor({ name: '', description: '' }); setMode('edit') }}
        onCancel={() => { setEditor(null); setMode('view'); setNotice('Đã hủy các thay đổi.') }}
        onSave={() => formRef.current?.requestSubmit()}
        saveLabel="Lưu mẫu"
        saveDisabled={!editor?.name.trim()}
        navigationGuard={false}
        blastRadius="Mẫu đã lưu có thể được dùng để tạo phiên bản mốc cho kỳ đồ án. Phiên bản đã công bố được giữ nguyên; muốn đổi mốc cần tạo phiên bản mới."
      >
        {editor ? (
          <form ref={formRef} className="ex-panel ex-form api-form" onSubmit={saveTemplate}>
            <h2>{editor.id ? 'Chỉnh sửa mẫu' : 'Mẫu mới'}</h2>
            <label>
              Tên mẫu
              <input
                required
                maxLength={200}
                value={editor.name}
                onChange={e => setEditor({ ...editor, name: e.target.value })}
              />
            </label>
            <label>
              Mô tả
              <textarea
                rows={3}
                value={editor.description}
                onChange={e => setEditor({ ...editor, description: e.target.value })}
              />
            </label>
          </form>
        ) : (
          <p className="ex-panel ex-padding ex-muted">
            Chọn một mẫu bên dưới để xem chi tiết phiên bản hoặc nhấn <strong>Tạo mẫu</strong> để khởi tạo bộ mốc mới. Các phiên bản đã công bố chỉ có thể xem và áp dụng.
          </p>
        )}
      </ConfigModeFrame>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        <section className="ex-panel lg:col-span-5">
          <div className="ex-panel-heading">
            <div>
              <h2>Các mẫu hiện có</h2>
              <p className="ex-muted">{templates.length} mẫu mốc dùng chung</p>
            </div>
          </div>

          <div className="border-b border-hairline px-5 py-3">
            <FilterToolbar
              embedded
              debounceMs={0}
              ariaLabel="Lọc danh sách mẫu mốc"
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Tìm theo tên hoặc mô tả mẫu…"
              searchLabel="Tìm kiếm mẫu mốc"
              activeTab={statusFilter}
              onTabChange={(v) => setStatusFilter(v as 'ALL' | 'PUBLISHED' | 'DRAFT')}
              tabsLabel="Lọc mẫu theo trạng thái phiên bản"
              tabs={[
                { value: 'ALL', label: 'Tất cả', count: templates.length },
                { value: 'PUBLISHED', label: 'Đã công bố' },
                { value: 'DRAFT', label: 'Bản nháp' },
              ]}
              activeChips={activeChips}
              onRemoveChip={(id) => {
                if (id === 'search') setSearch('')
                if (id === 'status') setStatusFilter('ALL')
              }}
              onClearAll={() => { setSearch(''); setStatusFilter('ALL') }}
              hasActiveFilters={activeChips.length > 0}
            />
          </div>

          {loading ? (
            <p role="status" className="ex-padding">Đang tải mẫu mốc…</p>
          ) : !filteredTemplates.length ? (
            <div className="ex-padding">
              <WorkspaceEmptyState
                title={templates.length ? 'Không tìm thấy mẫu phù hợp' : 'Chưa có mẫu. Tạo mẫu đầu tiên để bắt đầu.'}
                message={templates.length ? 'Thử thay đổi từ khóa hoặc bộ lọc trạng thái.' : 'Tạo bộ mốc chuẩn để áp dụng nhanh cho nhiều kỳ đồ án.'}
                action={
                  templates.length ? (
                    <Button variant="outline" onClick={() => { setSearch(''); setStatusFilter('ALL') }}>Xóa bộ lọc</Button>
                  ) : (
                    <Button icon="add" onClick={() => { setEditor({ name: '', description: '' }); setMode('edit') }}>Tạo mẫu</Button>
                  )
                }
              />
            </div>
          ) : (
            <ul>
              {filteredTemplates.map(item => {
                const latest = item.versions.at(-1)
                const isSelected = selectedId === item.id
                return (
                  <li
                    key={item.id}
                    className={`flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4 last:border-b-0 transition-colors ${
                      isSelected ? 'bg-primary-subtle/40' : 'hover:bg-canvas'
                    }`}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      aria-pressed={isSelected}
                      onClick={() => { setSelectedId(item.id); setVersionId(null); setItemEditor(null) }}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-primary">{item.name}</strong>
                        {latest && (
                          <StatusBadge
                            tone={latest.status === 'PUBLISHED' ? 'success' : 'warning'}
                            label={latest.status === 'PUBLISHED' ? 'Đã công bố' : 'Bản nháp'}
                          />
                        )}
                      </div>
                      <span className="mt-1 block ex-muted">
                        {item.description || 'Chưa có mô tả'} · {item.versions.length} phiên bản
                      </span>
                    </button>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        className="ex-text-button"
                        disabled={busy}
                        onClick={() => { setEditor({ id: item.id, name: item.name, description: item.description || '' }); setMode('edit') }}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="ex-text-button ex-danger-text"
                        disabled={busy}
                        onClick={() => void remove(`mẫu “${item.name}”`, () => api.deleteMilestoneTemplate(item.id))}
                      >
                        Xóa
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="ex-panel lg:col-span-7">
          {selected ? (
            <>
              <div className="ex-panel-heading">
                <div>
                  <h2>{selected.name}</h2>
                  <p>Phiên bản đã công bố được giữ nguyên; tạo phiên bản mới khi cần thay đổi.</p>
                </div>
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void run(() => api.createTemplateVersion(selected.id).then(next => setVersionId(next.id)), 'Đã tạo phiên bản mới.')}
                >
                  Tạo phiên bản
                </Button>
              </div>

              <div className="ex-padding ex-stack">
                {version ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-canvas p-3.5">
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-2 text-sm font-medium text-ink-soft">
                          Phiên bản
                          <select
                            className="min-h-10 rounded-lg border border-hairline bg-card px-3 py-2 text-sm font-normal text-ink"
                            value={version.id}
                            onChange={e => { setVersionId(Number(e.target.value)); setItemEditor(null) }}
                          >
                            {selected.versions.map(v => (
                              <option key={v.id} value={v.id}>
                                Phiên bản {v.versionNumber} · {v.status === 'PUBLISHED' ? 'Đã công bố' : 'Bản nháp'}
                              </option>
                            ))}
                          </select>
                        </label>
                        <StatusBadge
                          tone={version.status === 'PUBLISHED' ? 'success' : 'warning'}
                          label={version.status === 'PUBLISHED' ? 'Đã công bố (khóa)' : 'Bản nháp'}
                        />
                      </div>
                      {writable && (
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" icon="add" disabled={busy} onClick={() => setItemEditor({ ...emptyItem, sortOrder: version.items.length })}>
                            Thêm mốc
                          </Button>
                          <Button
                            disabled={busy || !version.items.length}
                            onClick={async () => {
                              if (
                                (await requestConfirmation({
                                  title: 'Công bố phiên bản mẫu?',
                                  description: 'Các mốc trong phiên bản này sẽ được khóa sau khi công bố.',
                                  confirmLabel: 'Công bố',
                                })) !== null
                              ) {
                                await run(() => api.publishTemplateVersion(version.id), 'Đã công bố phiên bản.')
                              }
                            }}
                          >
                            Công bố
                          </Button>
                        </div>
                      )}
                    </div>

                    {version.items.length === 0 ? (
                      <WorkspaceEmptyState
                        title="Phiên bản này chưa có mốc nào"
                        message={writable ? 'Thêm mốc đầu tiên trước khi công bố phiên bản.' : 'Phiên bản này không có mốc.'}
                        action={
                          writable ? (
                            <Button variant="secondary" icon="add" onClick={() => setItemEditor({ ...emptyItem, sortOrder: 0 })}>
                              Thêm mốc
                            </Button>
                          ) : undefined
                        }
                      />
                    ) : (
                      <ul>
                        {version.items.map(item => (
                          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline py-4 last:border-b-0">
                            <div className="min-w-0 flex-1">
                              <strong className="text-ink">{item.title}</strong>
                              {item.description && <p className="mt-1 ex-muted">{item.description}</p>}
                              <p className="mt-1 text-xs text-ink-muted">
                                Bắt đầu: {item.startOffsetDays ?? '—'} ngày · Hạn: {item.dueOffsetDays ?? '—'} ngày · Thứ tự: {item.sortOrder}
                              </p>
                            </div>
                            {writable && (
                              <div className="flex gap-4">
                                <button type="button" className="ex-text-button" disabled={busy} onClick={() => setItemEditor(item)}>Sửa mốc</button>
                                <button type="button" className="ex-text-button ex-danger-text" disabled={busy} onClick={() => void remove(`mốc “${item.title}”`, () => api.deleteTemplateItem(item.id))}>Xóa mốc</button>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}

                    {version.status === 'PUBLISHED' && (
                      <form
                        className="flex flex-wrap items-end gap-3 border-t border-hairline pt-4"
                        onSubmit={e => {
                          e.preventDefault()
                          const id = Number(new FormData(e.currentTarget).get('period'))
                          if (id > 0) void run(() => api.assignMilestoneTemplate(id, selected.id, version.id), 'Đã áp dụng mẫu cho kỳ đồ án.')
                        }}
                      >
                        <label className="grid min-w-[240px] flex-1 gap-2 text-sm font-medium text-ink-soft">
                          Áp dụng cho kỳ đồ án
                          <select name="period" required className="min-h-10 rounded-lg border border-hairline bg-card px-3 text-sm font-normal text-ink">
                            <option value="">Chọn kỳ đồ án</option>
                            {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </label>
                        <Button type="submit" disabled={busy || !periods.length}>Áp dụng mẫu</Button>
                        {!periods.length && (
                          <p className="w-full ex-muted">Chưa tải được kỳ đồ án. Kiểm tra cấu hình học vụ rồi tải lại trang.</p>
                        )}
                      </form>
                    )}
                  </>
                ) : (
                  <p className="ex-muted">Chưa có phiên bản. Tạo phiên bản để thêm các mốc.</p>
                )}
              </div>
            </>
          ) : (
            <div className="ex-padding">
              <WorkspaceEmptyState
                title="Chọn một mẫu mốc để xem chi tiết"
                message="Chọn mẫu ở cột bên trái để quản lý phiên bản, chỉnh sửa danh sách mốc hoặc áp dụng cho kỳ đồ án."
              />
            </div>
          )}
        </section>
      </div>

      {itemEditor && writable && (
        <Modal
          open
          onClose={() => { if (!busy) setItemEditor(null) }}
          title={itemEditor.id ? 'Sửa mốc trong mẫu' : 'Thêm mốc vào mẫu'}
          description="Cấu hình tên, mô tả và khoảng ngày tính từ ngày bắt đầu kỳ đồ án."
          className="max-w-xl"
        >
          <form className="ex-form api-form" onSubmit={saveItem}>
            <label>
              Tên mốc
              <input required value={itemEditor.title} onChange={e => setItemEditor({ ...itemEditor, title: e.target.value })} />
            </label>
            <label>
              Mô tả
              <textarea rows={2} value={itemEditor.description || ''} onChange={e => setItemEditor({ ...itemEditor, description: e.target.value || null })} />
            </label>
            <div className="grid gap-4 sm:grid-cols-3">
              {(['startOffsetDays', 'dueOffsetDays', 'sortOrder'] as const).map(key => (
                <label key={key}>
                  {({
                    startOffsetDays: 'Ngày bắt đầu từ đầu kỳ',
                    dueOffsetDays: 'Ngày đến hạn từ đầu kỳ',
                    sortOrder: 'Thứ tự',
                  })[key]}
                  <input
                    type="number"
                    min={0}
                    value={itemEditor[key] ?? ''}
                    onChange={e => setItemEditor({
                      ...itemEditor,
                      [key]: e.target.value === '' ? (key === 'sortOrder' ? 0 : null) : Number(e.target.value),
                    })}
                  />
                </label>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={busy}>Lưu mốc</Button>
              <Button type="button" variant="secondary" disabled={busy} onClick={() => setItemEditor(null)}>Hủy</Button>
            </div>
          </form>
        </Modal>
      )}
    </WorkspacePage>
  )
}

function message(reason: unknown) {
  if (reason instanceof HttpError) {
    if (reason.status === 403) return 'Bạn chưa có quyền quản lý mẫu mốc.'
    if (reason.status === 409) return 'Mẫu đã được sử dụng hoặc dữ liệu vừa thay đổi. Hãy tải lại trước khi sửa.'
    if (reason.status === 400) return reason.problem?.detail || 'Kiểm tra tên mốc và các ngày trong mẫu.'
  }
  return 'Chưa hoàn tất thao tác. Hãy thử lại.'
}
