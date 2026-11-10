import { useState, type ReactNode } from 'react'
import { Button } from './Button'
import { Modal } from './Modal'
import { Table, TableBody, TableHead, TableHeaderCell, TableRow } from './Table'

type RowStatus = 'valid' | 'warning' | 'error' | 'skipped'

export interface ImportPreview<Row> {
  rows: Row[]
  label: string
  regionLabel: string
  columns: string[]
  getKey: (row: Row) => string | number
  getStatus: (row: Row) => RowStatus
  renderRow: (row: Row) => ReactNode
  validLabel: string
  warningLabel: string
  canCommit: boolean
  commitCount: number
  confirmationLabel: string
  extra?: ReactNode
  invalidMessage?: string
}

export interface ImportDialogProps<Row> {
  title: string
  description?: string
  onClose: () => void
  authorized: boolean
  unauthorizedMessage?: string
  busy: boolean
  notice: ReactNode
  templateHref: string
  fileLabel: string
  file: File | null
  accept: string
  limits: string
  onFileChange: (file: File | null) => void
  beforeFile?: ReactNode
  onPreview: () => void
  previewDisabled: boolean
  previewButtonLabel?: string
  preview?: ImportPreview<Row> | null
  confirmed?: boolean
  onConfirmedChange?: (value: boolean) => void
  error?: string | null
  success?: ReactNode
  onCommit: () => void
  commitLabel?: string
  commitAccessibleName?: string
  commitBusyLabel?: string
  commitIcon?: string
}

/** Shared presentation for preview-first batch imports. The caller keeps API and validation authority. */
export function ImportDialog<Row>({ title, description, onClose, authorized, unauthorizedMessage, busy,
  notice, templateHref, fileLabel, file, accept, limits, onFileChange, beforeFile, onPreview,
  previewDisabled, previewButtonLabel = 'Xem trước', preview, confirmed, onConfirmedChange,
  error, success, onCommit, commitLabel = 'Xác nhận nhập', commitAccessibleName,
  commitBusyLabel = 'Đang lưu…', commitIcon = 'upload' }: ImportDialogProps<Row>) {
  const [internalConfirmed, setInternalConfirmed] = useState(false)
  const [onlyErrors, setOnlyErrors] = useState(false)
  const [page, setPage] = useState(1)
  const [showPreview, setShowPreview] = useState(true)
  function resetView() { setOnlyErrors(false); setPage(1); setInternalConfirmed(false); setShowPreview(true) }

  const isConfirmed = confirmed ?? internalConfirmed
  const changeConfirmed = onConfirmedChange ?? setInternalConfirmed
  const counts = { valid: 0, warning: 0, error: 0, skipped: 0 }
  preview?.rows.forEach(row => { counts[preview.getStatus(row)] += 1 })
  const filtered = preview?.rows.filter(row => !onlyErrors || preview.getStatus(row) === 'error') ?? []
  const pages = Math.max(1, Math.ceil(filtered.length / 25))
  const canCommit = authorized && !!preview?.canCommit && counts.error === 0 && !!preview.commitCount && isConfirmed && !busy && showPreview

  return <Modal open drawer title={title} description={description} busy={busy} onClose={onClose}>
    <div className="curriculum-import" aria-busy={busy}>
      <div className="curriculum-import__guide">{notice} <a href={templateHref} download>Tải mẫu CSV</a></div>
      {!authorized ? <p role="alert">{unauthorizedMessage ?? 'Bạn không có quyền nhập dữ liệu.'}</p> : <>
        {beforeFile}
        <p className="m-0 text-xs text-ink-muted">{accept} · {limits}</p>
        <label className="curriculum-import__file">{fileLabel}<input type="file" accept={accept} disabled={busy} onChange={event => { resetView(); onFileChange(event.target.files?.[0] ?? null) }} /></label>
        {file && <p className="curriculum-import__filename">{file.name} · {Math.max(1, Math.ceil(file.size / 1024))} KB</p>}
        <Button variant="outline" icon="preview" disabled={previewDisabled || busy} onClick={() => { resetView(); onPreview() }}>{busy && !preview ? 'Đang kiểm tra…' : previewButtonLabel}</Button>
        {error && <p role="alert" className="curriculum-import__error">{error}</p>}
        {success && <p role="status" className="curriculum-import__success">{success}</p>}
        {preview && showPreview && <section aria-label={preview.label}>
          {preview.extra}
          <p role="status">Tổng {preview.rows.length} · {counts.valid} {preview.validLabel} · {counts.warning} {preview.warningLabel} · {counts.error} lỗi{counts.skipped ? ` · ${counts.skipped} bỏ qua` : ''}</p>
          <label className="curriculum-import__check"><input type="checkbox" checked={onlyErrors} onChange={event => { setOnlyErrors(event.target.checked); setPage(1) }} />Chỉ hiện dòng lỗi</label>
          <div role="region" tabIndex={0} aria-label={preview.regionLabel}>
            <Table stack><TableHead><TableRow head>{preview.columns.map(column => <TableHeaderCell key={column}>{column}</TableHeaderCell>)}</TableRow></TableHead>
              <TableBody>{filtered.slice((page - 1) * 25, page * 25).map(row => <TableRow key={preview.getKey(row)}>{preview.renderRow(row)}</TableRow>)}</TableBody></Table>
          </div>
          {!filtered.length && <p>Không có dòng phù hợp bộ lọc.</p>}
          {pages > 1 && <div className="curriculum-import__pagination"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Trang trước</Button><span>Trang {page}/{pages}</span><Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(value => value + 1)}>Trang sau</Button></div>}
          {!preview.canCommit || counts.error > 0 ? <p className="curriculum-import__error">{preview.invalidMessage ?? 'Hãy sửa các dòng lỗi và xem trước lại trước khi xác nhận.'}</p>
            : <label className="curriculum-import__check"><input type="checkbox" checked={isConfirmed} disabled={busy} onChange={event => changeConfirmed(event.target.checked)} />{preview.confirmationLabel}</label>}
          <Button variant="ghost" onClick={() => { setShowPreview(false); changeConfirmed(false) }}>Quay lại chọn tệp</Button>
        </section>}
      </>}
      <div className="app-modal__actions"><Button variant="outline" disabled={busy} onClick={onClose}>Đóng</Button><Button icon={commitIcon} aria-label={commitAccessibleName} disabled={!canCommit} onClick={onCommit}>{busy ? commitBusyLabel : `${commitLabel} (${preview?.commitCount ?? 0})`}</Button></div>
    </div>
  </Modal>
}
