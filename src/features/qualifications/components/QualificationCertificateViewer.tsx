import { useEffect, useRef, useState } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { DocumentPreviewModal } from '../../../components/ui/DocumentPreviewModal'
import { departmentError } from '../../department/hooks/useDepartmentSection'
import * as api from '../api/certificate-api'

/** Key this reader by evidence token/file ID so refresh invalidates the displayed metadata. */
export function QualificationCertificateViewer({ qualificationId }: { qualificationId: number }) {
  const [open, setOpen] = useState(false), [previewOpen, setPreviewOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [data, setData] = useState<api.QualificationCertificate | null>(null)
  const version = useRef(0), lock = useRef(false)
  useEffect(() => { const requestVersion = version; return () => { requestVersion.current++ } }, [])
  async function read() {
    const current = ++version.current; setBusy(true); setError(''); setData(null)
    try { const result = await api.getQualificationCertificate(qualificationId); if (current === version.current) setData(result) }
    catch (reason) { if (current === version.current) setError(departmentError(reason).message) }
    finally { if (current === version.current) setBusy(false) }
  }
  function close() { version.current++; setOpen(false); setPreviewOpen(false); setBusy(false); setData(null); setError(''); setNotice('') }
  async function download() {
    if (!data || lock.current) return
    lock.current = true; setBusy(true); setError(''); setNotice('')
    const current = version.current
    try {
      // Resolve current metadata again: the qualification endpoint always resolves its current file.
      const latest = await api.getQualificationCertificate(qualificationId)
      if (current !== version.current) return
      if (latest.fileId !== data.fileId) { setData(latest); setError('Chứng chỉ đã thay đổi. Kiểm tra thông tin mới trước khi tải.'); return }
      const blob = await api.downloadQualificationCertificate(qualificationId)
      const after = await api.getQualificationCertificate(qualificationId)
      if (current !== version.current) return
      if (after.fileId !== latest.fileId) { setData(after); setError('Chứng chỉ đã thay đổi trong khi tải. Hãy kiểm tra phiên bản mới.'); return }
      const url = URL.createObjectURL(blob), anchor = document.createElement('a')
      anchor.href = url; anchor.download = latest.fileName.replace(/[\\/\p{Cc}]/gu, '_'); anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setNotice('Đã tải chứng chỉ qua kết nối được xác thực.')
    } catch (reason) { if (current === version.current) setError(departmentError(reason).message) }
    finally { lock.current = false; if (current === version.current) setBusy(false) }
  }
  return <><Button className="mt-3 min-h-11" variant="secondary" onClick={() => { setOpen(true); void read() }}>Xem chứng chỉ</Button>
    {open && <Modal open title="Chứng chỉ của sinh viên" onClose={close} busy={busy}>
      {busy && <p role="status" className="text-sm text-ink-muted">Đang xử lý chứng chỉ…</p>}
      {error && <div role="alert" className="space-y-2 rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text"><p>{error}</p><Button variant="secondary" disabled={busy} onClick={() => void read()}>Tải lại chứng chỉ</Button></div>}
      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-hairline border-l-4 border-l-status-success-text bg-card p-3 text-sm text-ink">
          <span className="material-symbols-outlined shrink-0 text-[18px] text-status-success-text" aria-hidden="true">check_circle</span>
          <p role="status">{notice}</p>
        </div>
      )}
      {data && <div className="space-y-3 text-sm text-ink">
        <button type="button" disabled={busy} onClick={() => setPreviewOpen(true)} className="block break-all text-left font-semibold text-ink transition-colors hover:text-primary hover:underline">{data.fileName}</button>
        <p className="text-ink-muted">{data.contentType} · {Math.ceil(data.sizeBytes / 1024)} KB</p>
        {data.checksumSha256 && <p className="break-all font-mono text-xs text-ink-muted">SHA-256: {data.checksumSha256}</p>}
        <div className="flex flex-wrap gap-2">
          <Button className="min-h-10" icon="visibility" disabled={busy} onClick={() => setPreviewOpen(true)}>Xem trước</Button>
          <Button className="min-h-10" variant="secondary" icon="download" disabled={busy} onClick={() => void download()}>Tải chứng chỉ</Button>
        </div>
      </div>}
    </Modal>}
    {previewOpen && data && (
      <DocumentPreviewModal
        open
        fileId={data.fileId}
        fileName={data.fileName}
        fileSize={data.sizeBytes}
        contentType={data.contentType}
        loadBlob={() => api.downloadQualificationCertificate(qualificationId)}
        onDownload={() => void download()}
        onClose={() => setPreviewOpen(false)}
      />
    )}
  </>
}
