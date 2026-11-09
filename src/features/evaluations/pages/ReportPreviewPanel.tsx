import { useEffect, useRef, useState } from 'react'
import { downloadEvaluationEvidenceFile, type EvidenceFile } from '../../../services/api/evaluations.api'
import { fileLabel, formatBytes, previewKind } from '../report-preview'

const fileKey = (file: EvidenceFile) => String(file.evidenceItemId ?? file.id) + ':' + String(file.deliverableVersionId ?? '') + ':' + String(file.coldSubmissionId ?? '')

async function downloadFile(assignmentId: number, file: EvidenceFile) {
  const blob = await downloadEvaluationEvidenceFile(assignmentId, file.id)
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement('a'); anchor.href = href; anchor.download = file.fileName; anchor.click()
  URL.revokeObjectURL(href)
}

/**
 * Report viewer shown beside the scoring form so the committee reads and scores in one place.
 * PDFs and images render inline; other formats offer a download. All files are fetched through the
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
              className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink px-2 py-1 rounded border border-hairline hover:bg-canvas transition-colors"
              onClick={() => setFullscreen(true)}
              title="Phóng to toàn màn hình để đọc"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">open_in_full</span>
              <span className="hidden sm:inline">Phóng to</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover px-2.5 py-1 rounded bg-primary-subtle border border-primary/20 transition-colors"
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

      {/* Fullscreen Modal Viewer for deep reading while grading */}
      {fullscreen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Xem tài liệu ${selected.fileName} toàn màn hình`}
          className="fixed inset-0 z-50 flex flex-col bg-slate-900/80 backdrop-blur-xs p-4 sm:p-6"
        >
          <div className="relative flex flex-col w-full h-full max-w-7xl mx-auto rounded-2xl bg-card border border-hairline shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-hairline bg-canvas">
              <div className="flex items-center gap-3 min-w-0">
                <span className="material-symbols-outlined text-primary text-[22px]" aria-hidden="true">description</span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-ink text-sm sm:text-base truncate">{selected.fileName}</h3>
                  <p className="text-xs text-ink-muted">{formatBytes(selected.sizeBytes)} · Phiên bản {selected.versionNumber ?? '1.0'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary bg-primary-subtle border border-primary/30 hover:bg-primary hover:text-white transition-colors"
                  onClick={() => void download(selected)}
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">download</span>
                  <span>Tải tệp</span>
                </button>
                <button
                  type="button"
                  aria-label="Đóng chế độ phóng to"
                  className="min-h-10 min-w-10 rounded-lg flex items-center justify-center text-ink-muted hover:text-ink hover:bg-slate-200 transition-colors"
                  onClick={() => setFullscreen(false)}
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 overflow-hidden">
              <PreviewStage
                key={`fs-${assignmentId}:${selected.id}`}
                assignmentId={assignmentId}
                file={selected}
                download={download}
                isFullscreen
              />
            </div>
          </div>
        </div>
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
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(kind === 'other' ? 'ready' : 'loading')
  const objectUrl = useRef<string | null>(null)

  useEffect(() => {
    if (kind === 'other') return
    const abort = new AbortController()
    let alive = true
    downloadEvaluationEvidenceFile(assignmentId, file.id, abort.signal)
      .then(blob => { if (!alive) return; const next = URL.createObjectURL(blob); objectUrl.current = next; setUrl(next); setStatus('ready') })
      .catch(() => { if (alive) setStatus('error') })
    return () => { alive = false; abort.abort(); if (objectUrl.current) { URL.revokeObjectURL(objectUrl.current); objectUrl.current = null } }
  }, [assignmentId, file.id, kind])

  return (
    <div className={`report-preview-stage ${isFullscreen ? 'h-full m-0 border-0 rounded-none' : ''}`}>
      {status === 'loading' && kind !== 'other' ? (
        <div className="flex flex-col items-center justify-center p-8 text-center text-ink-muted">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-3" />
          <p role="status" className="report-preview-note">Đang tải và chuẩn bị tài liệu xem trước…</p>
        </div>
      ) : null}

      {status === 'error' ? (
        <div className="p-6 text-center text-status-error-text bg-status-error-bg/30 m-3 rounded-lg border border-status-error-border">
          <span className="material-symbols-outlined text-[32px] mb-2" aria-hidden="true">error</span>
          <p role="alert" className="report-preview-note">
            Chưa tải được bản xem trước trực tuyến.
          </p>
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-hover shadow-xs"
            onClick={() => void download(file)}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">download</span>
            Tải xuống để đọc ngoại tuyến
          </button>
        </div>
      ) : null}

      {status === 'ready' && kind === 'pdf' && url ? (
        <iframe
          title={`Báo cáo ${fileLabel(file)}`}
          src={url}
          sandbox="allow-same-origin"
          className={`report-preview-frame ${isFullscreen ? '!h-full !max-h-none' : ''}`}
        />
      ) : null}

      {status === 'ready' && kind === 'image' && url ? (
        <div className={`flex items-center justify-center p-4 bg-slate-900/5 ${isFullscreen ? 'h-full' : ''}`}>
          <img
            src={url}
            alt={`Báo cáo ${fileLabel(file)}`}
            className={`report-preview-image rounded-lg shadow-sm ${isFullscreen ? '!max-h-full' : ''}`}
          />
        </div>
      ) : null}

      {kind === 'other' ? (
        <div className="p-8 text-center text-ink-soft bg-canvas rounded-lg m-3 border border-hairline">
          <span className="material-symbols-outlined text-[36px] text-ink-muted mb-2" aria-hidden="true">
            folder_zip
          </span>
          <p className="report-preview-note max-w-md mx-auto text-sm">
            Tệp <strong>{file.fileName}</strong> không xem trực tiếp trên trình duyệt được. Tải tệp về máy để đối chiếu khi chấm.
          </p>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-hover shadow-xs"
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
