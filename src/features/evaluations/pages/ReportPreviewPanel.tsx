import { useEffect, useRef, useState } from 'react'
import { downloadEvaluationEvidenceFile, type EvidenceFile } from '../../../services/api/evaluations.api'
import { fileLabel, formatBytes, previewKind } from '../report-preview'

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
  const [selectedId, setSelectedId] = useState<number>(files[0]?.id ?? 0)
  const selected = files.find(file => file.id === selectedId) ?? files[0]
  if (!selected) return null
  return (
    <section className="rounded-xl border border-hairline bg-card p-4 report-preview" aria-label="Xem báo cáo để chấm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-900">Báo cáo của sinh viên</h2>
        <button type="button" className="text-sm font-semibold text-primary underline-offset-4 hover:underline" onClick={() => void downloadFile(assignmentId, selected)}>Tải xuống</button>
      </div>
      {files.length > 1 && (
        <div className="report-preview-tabs" role="tablist" aria-label="Chọn báo cáo">
          {files.map(file => (
            <button key={file.id} type="button" role="tab" aria-selected={file.id === selected.id} className={file.id === selected.id ? 'report-preview-tab report-preview-tab--active' : 'report-preview-tab'} onClick={() => setSelectedId(file.id)}>{fileLabel(file)}</button>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-slate-500">{selected.fileName} · {formatBytes(selected.sizeBytes)}</p>
      <PreviewStage key={selected.id} assignmentId={assignmentId} file={selected} />
    </section>
  )
}

/** Remounted per file (via key), so its fetch state resets without a synchronous effect reset. */
function PreviewStage({ assignmentId, file }: { assignmentId: number; file: EvidenceFile }) {
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
    <div className="report-preview-stage">
      {status === 'loading' && kind !== 'other' ? <p role="status" className="report-preview-note">Đang tải báo cáo…</p> : null}
      {status === 'error' ? <p role="alert" className="report-preview-note">Chưa tải được bản xem trước. <button type="button" className="font-semibold underline" onClick={() => void downloadFile(assignmentId, file)}>Tải xuống để xem</button></p> : null}
      {status === 'ready' && kind === 'pdf' && url ? <iframe title={`Báo cáo ${fileLabel(file)}`} src={url} sandbox="allow-same-origin" className="report-preview-frame" /> : null}
      {status === 'ready' && kind === 'image' && url ? <img src={url} alt={`Báo cáo ${fileLabel(file)}`} className="report-preview-image" /> : null}
      {kind === 'other' ? <p className="report-preview-note">Định dạng này không xem trực tiếp trên trình duyệt được. <button type="button" className="font-semibold text-primary underline" onClick={() => void downloadFile(assignmentId, file)}>Tải xuống {file.fileName}</button> để đối chiếu khi chấm.</p> : null}
    </div>
  )
}
