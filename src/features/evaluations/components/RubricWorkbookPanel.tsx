import { useEffect, useState } from 'react'
import { HttpError } from '../../../services/http/http-client'
import * as api from '../rubrics-api'
import type { Rubric } from '../rubrics-api'

export function RubricWorkbookPanel({ rubric, dirty, onCommitted }: {
  rubric: Rubric
  dirty: boolean
  onCommitted: (preview: api.RubricWorkbookPreview) => Promise<void>
}) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<api.RubricWorkbookPreview | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setFile(null)
    setPreview(null)
    setError('')
  }, [rubric.id, rubric.concurrencyToken])

  async function download() {
    setBusy(true); setError('')
    try {
      const blob = await api.downloadRubricWorkbook(rubric.id)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url; anchor.download = `rubric-${rubric.code}-v${rubric.version}.xlsx`
      document.body.append(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url)
    } catch { setError('Không tải được workbook. Hãy thử lại.') }
    finally { setBusy(false) }
  }
  async function inspect() {
    if (!file || dirty || !rubric.canEdit) return
    if (!file.name.toLowerCase().endsWith('.xlsx') || file.size === 0 || file.size > 5 * 1024 * 1024) {
      setError('Chọn tệp .xlsx từ 1 byte đến 5 MB.')
      setPreview(null)
      return
    }
    setBusy(true); setError(''); setPreview(null)
    try {
      setPreview(await api.previewRubricWorkbook(rubric.id, file))
    } catch (reason) {
      setError(reason instanceof HttpError && reason.status === 409
        ? 'Workbook đã cũ hoặc thuộc bản tiêu chí khác. Tải lại bản mới để nhập.'
        : 'Không đọc được workbook. Kiểm tra định dạng XLSX và giới hạn 5 MB.')
    } finally { setBusy(false) }
  }
  async function commit() {
    if (!preview?.draft || preview.issues.length || dirty) return
    setBusy(true); setError('')
    try { await onCommitted(preview); setPreview(null); setFile(null) }
    catch { setError('Chưa lưu được bản nháp; workbook và nội dung xem trước vẫn được giữ để đối chiếu.') }
    finally { setBusy(false) }
  }

  return <section className="rounded-xl border border-hairline bg-card p-4" aria-label="Nhập xuất tiêu chí bằng Excel">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-sm font-bold text-ink">Nhập xuất tiêu chí bằng Excel</h2>
        <p className="text-xs text-ink-muted">Workbook luôn được tạo từ bản tiêu chí hiện tại. Xem lỗi và thay đổi trước khi lưu bản nháp.</p></div>
      <button type="button" className="min-h-11 rounded-lg border border-primary px-3 text-sm font-semibold text-primary disabled:opacity-50"
        disabled={busy} onClick={() => void download()}>Tải workbook .xlsx</button>
    </div>
    {rubric.canEdit && <div className="mt-3 flex flex-wrap items-end gap-2">
      <label className="text-sm text-ink-soft">Tệp Excel đã điền
        <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="mt-1 block max-w-full text-sm" disabled={busy || dirty}
          onChange={event => { setFile(event.target.files?.[0] ?? null); setPreview(null); setError('') }} />
      </label>
      <button type="button" className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
        disabled={!file || busy || dirty} onClick={() => void inspect()}>{busy ? 'Đang xử lý…' : 'Xem lỗi và thay đổi'}</button>
    </div>}
    {dirty && rubric.canEdit && <p role="status" className="mt-2 text-xs text-status-warning-text">Lưu thay đổi trên màn hình trước khi nhập Excel.</p>}
    {error && <p role="alert" className="mt-2 text-sm text-danger-text">{error}</p>}
    {preview && <div className="mt-3 rounded-lg border border-hairline bg-subtle p-3 text-sm">
      {preview.issues.length ? <><strong>Chưa thể nhập</strong><ul className="mt-2 list-inside list-disc space-y-1">
        {preview.issues.map((issue, index) => <li key={index}>{issue.cell}: {issue.message}</li>)}
      </ul></> : <><strong>Thay đổi sẽ lưu vào bản nháp</strong><ul className="mt-2 list-inside list-disc space-y-1">
        {preview.changes.map((change, index) => <li key={index}>{change}</li>)}
      </ul><button type="button" className="mt-3 min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
        disabled={busy || !preview.draft} onClick={() => void commit()}>Xác nhận lưu tiêu chí</button></>}
    </div>}
  </section>
}
