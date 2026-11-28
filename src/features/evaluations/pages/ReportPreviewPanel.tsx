import { useEffect, useRef, useState } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { Table, TableBody, TableCell, TableRow } from '../../../components/ui/Table'
import { downloadEvaluationEvidenceFile, type EvidenceFile } from '../../../services/api/evaluations.api'
import { fileLabel, formatBytes, previewKind } from '../report-preview'
import { previewOfficeAsPdf, previewOfficeFile, type OfficePreview } from '../../../services/api/office-preview.api'

const fileKey = (file: EvidenceFile) => String(file.evidenceItemId ?? file.id) + ':' + String(file.deliverableVersionId ?? '') + ':' + String(file.coldSubmissionId ?? '')

async function downloadFile(assignmentId: number, file: EvidenceFile) {
  const blob = await downloadEvaluationEvidenceFile(assignmentId, file.id)
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement('a'); anchor.href = href; anchor.download = file.fileName; anchor.click()
  URL.revokeObjectURL(href)
}

/**
 * Report viewer shown beside the scoring form so the committee reads and scores in one place.
 * PDFs, images and bounded DOCX/XLSX extracts render inline; other formats offer a download. All files are fetched through the
 * assignment-scoped endpoint, so the backend remains the authority on what this evaluator may open.
 */
export function ReportPreviewPanel({ assignmentId, files }: { assignmentId: number; files: EvidenceFile[] }) {
  const [selectedKey, setSelectedKey] = useState(files[0] ? fileKey(files[0]) : '')
  const [downloadError, setDownloadError] = useState('')
  const [fullscreen, setFullscreen] = useState(false)

  const download = async (file: EvidenceFile) => {
    setDownloadError('')
    try { await downloadFile(assignmentId, file) }
    catch { setDownloadError('Không thể tải tệp. Quyền phân công hoặc phiên bản minh chứng có thể đã thay đổi. Hãy tải lại phân công.') }
  }

  const selected = files.find(file => fileKey(file) === selectedKey) ?? files[0]
  if (!selected) return null

  return (
    <>
      <section className="rounded-xl border border-hairline bg-card p-4 report-preview shadow-xs" aria-label="Xem báo cáo để chấm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">
              menu_book
            </span>
            <h2 className="font-semibold text-ink text-sm sm:text-base">Tài liệu đồ án</h2>
            <span className="inline-flex items-center rounded-full bg-primary-subtle px-2 py-0.5 text-xs font-semibold text-primary">
              Đối chiếu Rubrics
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-hairline bg-card px-2.5 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
              onClick={() => setFullscreen(true)}
              aria-label="Phóng to"
              title="Phóng to toàn màn hình để đọc"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">open_in_full</span>
              <span className="hidden sm:inline">Phóng to</span>
            </button>
            <button
              type="button"
              className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-primary/20 bg-primary-subtle px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:text-primary-hover"
              onClick={() => void download(selected)}
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">download</span>
              <span>Tải xuống</span>
            </button>
          </div>
        </div>

        {files.length > 1 && (
          <div className="report-preview-tabs mt-3" role="tablist" aria-label="Chọn báo cáo">
            {files.map(file => (
              <button
                key={fileKey(file)}
                type="button"
                role="tab"
                aria-selected={fileKey(file) === fileKey(selected)}
                className={fileKey(file) === fileKey(selected) ? 'report-preview-tab report-preview-tab--active' : 'report-preview-tab'}
                onClick={() => setSelectedKey(fileKey(file))}
              >
                {fileLabel(file)}
              </button>
            ))}
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
          <p className="truncate max-w-[280px] font-medium text-ink-soft" title={selected.fileName}>
            {selected.fileName} · {formatBytes(selected.sizeBytes)}
          </p>
          <span className="font-mono text-xs text-ink-muted">
            Phiên bản {selected.versionNumber ?? '1.0'} (Gói đã khóa)
          </span>
        </div>

        {downloadError && (
          <p role="alert" className="mt-2 text-xs text-status-error-text bg-status-error-bg p-2 rounded border border-status-error-border">
            {downloadError}
          </p>
        )}

        <PreviewStage
          key={`${assignmentId}:${selected.id}:${selected.deliverableVersionId}:${selected.coldSubmissionId}`}
          assignmentId={assignmentId}
          file={selected}
          download={download}
        />
      </section>

      {fullscreen && (
        <Modal
          open
          title={`Xem tài liệu ${selected.fileName} toàn màn hình`}
          description={`${formatBytes(selected.sizeBytes)} · Phiên bản ${selected.versionNumber ?? 'Chưa có'}`}
          onClose={() => setFullscreen(false)}
          className="report-preview-fullscreen-modal"
        >
          <div className="mb-3 flex justify-end">
            <button type="button" className="app-modal__button" onClick={() => void download(selected)}>Tải tệp</button>
          </div>
          {downloadError && <p role="alert" className="mb-3 text-sm text-status-error-text">{downloadError}</p>}
          <PreviewStage
            key={`fs-${assignmentId}:${selected.id}`}
            assignmentId={assignmentId}
            file={selected}
            download={download}
            isFullscreen
          />
        </Modal>
      )}
    </>
  )
}

/** Remounted per file (via key), so its fetch state resets without a synchronous effect reset. */
function PreviewStage({
  assignmentId,
  file,
  download,
  isFullscreen = false,
}: {
  assignmentId: number
  file: EvidenceFile
  download: (file: EvidenceFile) => Promise<void>
  isFullscreen?: boolean
}) {
  const kind = previewKind(file)
  const [url, setUrl] = useState<string | null>(null)
  const [office, setOffice] = useState<OfficePreview | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(kind === 'other' ? 'ready' : 'loading')
  const objectUrl = useRef<string | null>(null)

  useEffect(() => {
    if (kind === 'other') return
    const abort = new AbortController()
    let alive = true
    downloadEvaluationEvidenceFile(assignmentId, file.id, abort.signal)
      .then(async blob => {
        if (!alive) return
        if (kind === 'office') {
          try {
            const pdfBlob = await previewOfficeAsPdf(blob, file.fileName, abort.signal)
            if (alive) {
              const next = URL.createObjectURL(pdfBlob)
              objectUrl.current = next
              setUrl(next)
              setStatus('ready')
            }
            return
          } catch {
            if (!alive || abort.signal.aborted) return
          }
          if (/\.(docx|xlsx|pptx)$/i.test(file.fileName)) {
            const result = await previewOfficeFile(blob, file.fileName, abort.signal)
            if (alive) { setOffice(result); setStatus('ready') }
            return
          }
          if (alive) setStatus('error')
          return
        }
        const displayBlob = kind === 'pdf' && blob.type !== 'application/pdf'
          ? new Blob([blob], { type: 'application/pdf' })
          : blob
        const next = URL.createObjectURL(displayBlob); objectUrl.current = next; setUrl(next); setStatus('ready')
      })
      .catch(() => { if (alive) setStatus('error') })
    return () => { alive = false; abort.abort(); if (objectUrl.current) { URL.revokeObjectURL(objectUrl.current); objectUrl.current = null } }
  }, [assignmentId, file.fileName, file.id, kind])

  return (
    <div className={`report-preview-stage ${isFullscreen ? 'h-full m-0 border-0 rounded-none' : ''}`}>
      {status === 'loading' && kind !== 'other' ? (
        <div className="flex flex-col items-center justify-center p-8 text-center text-ink-muted">
          <div className="mb-3 h-8 w-8 rounded-full border-2 border-primary border-t-transparent motion-safe:animate-spin" />
          <p role="status" className="report-preview-note">Đang tải và chuẩn bị tài liệu xem trước…</p>
        </div>
      ) : null}

      {status === 'error' ? (
        <div className="m-3 rounded-lg border border-status-error-border bg-status-error-bg/30 p-6 text-center text-status-error-text">
          <span className="material-symbols-outlined mb-2 text-[32px]" aria-hidden="true">error</span>
          <p role="alert" className="report-preview-note">
            Chưa tải được bản xem trước trực tuyến.
          </p>
          <button
            type="button"
            className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-primary-hover"
            onClick={() => void download(file)}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">download</span>
            Tải xuống để đọc ngoại tuyến
          </button>
        </div>
      ) : null}

      {status === 'ready' && (kind === 'pdf' || kind === 'office') && url ? (
        <iframe
          title={`Báo cáo ${fileLabel(file)}`}
          src={url}
          className={`report-preview-frame ${isFullscreen ? '!h-full !max-h-none' : ''}`}
        />
      ) : null}

      {status === 'ready' && kind === 'image' && url ? (
        <div className={`flex items-center justify-center bg-canvas p-4 ${isFullscreen ? 'h-full' : ''}`}>
          <img
            src={url}
            alt={`Báo cáo ${fileLabel(file)}`}
            className={`report-preview-image rounded-lg shadow-sm ${isFullscreen ? '!max-h-full' : ''}`}
          />
        </div>
      ) : null}

      {status === 'ready' && kind === 'office' && office ? (
        <div className="max-h-[520px] overflow-auto p-4 text-sm text-ink">
          <p className="mb-3 text-xs text-ink-muted">Bản xem nhanh chỉ đọc; bố cục và công thức có thể khác bản gốc.</p>
          {office.truncated && <p role="status" className="mb-3 text-xs text-ink-muted">Chỉ hiển thị phần đầu tài liệu.</p>}
          {office.kind === 'DOCX_TEXT' && <div className="space-y-2 whitespace-pre-wrap">
            {office.paragraphs.length ? office.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>) : <p>Không có đoạn văn bản để hiển thị.</p>}
          </div>}
          {office.kind === 'PPTX_SLIDES' && <div className="space-y-2 whitespace-pre-wrap">
            {office.paragraphs.length ? office.paragraphs.map((slide, index) => <p key={index}>{slide}</p>) : <p>Không có trang trình chiếu để hiển thị.</p>}
          </div>}
          {office.kind === 'XLSX_GRID' && office.sheets.map((sheet, index) => <section key={`${sheet.name}-${index}`} className="mb-4">
            <h3 className="mb-2 font-semibold">{sheet.name}</h3>
            <div className="overflow-x-auto rounded-lg border border-hairline"><Table aria-label={`Bảng tính ${sheet.name}`} className="text-xs"><TableBody>
              {sheet.rows.map((row, rowIndex) => <TableRow key={rowIndex}>{row.map((value, colIndex) => <TableCell key={colIndex} className="min-w-20 border border-hairline p-2 align-top whitespace-pre-wrap break-words">{value}</TableCell>)}</TableRow>)}
            </TableBody></Table></div>
          </section>)}
        </div>
      ) : null}

      {kind === 'other' ? (
        <div className="m-3 rounded-lg border border-hairline bg-canvas p-8 text-center text-ink-soft">
          <span className="material-symbols-outlined mb-2 text-[36px] text-ink-muted" aria-hidden="true">
            folder_zip
          </span>
          <p className="report-preview-note mx-auto max-w-md text-sm">
            Tệp <strong>{file.fileName}</strong> không xem trực tiếp trên trình duyệt được. Tải tệp về máy để đối chiếu khi chấm.
          </p>
          <button
            type="button"
            className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-primary-hover"
            onClick={() => void download(file)}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">download</span>
            Tải tệp về máy
          </button>
        </div>
      ) : null}
    </div>
  )
}
