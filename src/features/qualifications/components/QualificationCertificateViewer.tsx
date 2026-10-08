import { useEffect, useRef, useState } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { departmentError } from '../../department/hooks/useDepartmentSection'
import * as api from '../api/certificate-api'

/** Key this reader by evidence token/file ID so refresh invalidates the displayed metadata. */
export function QualificationCertificateViewer({ qualificationId }: { qualificationId: number }) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [data, setData] = useState<api.QualificationCertificate | null>(null)
  const version = useRef(0), lock = useRef(false)
  useEffect(() => { const requestVersion = version; return () => { requestVersion.current++ } }, [])
  async function read() {
    const current = ++version.current; setBusy(true); setError(''); setData(null)
    try { const result = await api.getQualificationCertificate(qualificationId); if (current === version.current) setData(result) }
    catch (reason) { if (current === version.current) setError(departmentError(reason).message) }
    finally { if (current === version.current) setBusy(false) }
  }
  function close() { version.current++; setOpen(false); setBusy(false); setData(null); setError(''); setNotice('') }
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
      {busy && <p role="status">Đang xử lý chứng chỉ…</p>}
      {error && <div role="alert" className="text-sm text-status-error-text"><p>{error}</p><Button variant="secondary" disabled={busy} onClick={() => void read()}>Tải lại chứng chỉ</Button></div>}
      {notice && <p role="status">{notice}</p>}
      {data && <div className="space-y-3 text-sm"><p className="break-all font-semibold">{data.fileName}</p><p>{data.contentType} · {Math.ceil(data.sizeBytes / 1024)} KB</p>{data.checksumSha256 && <p className="break-all">SHA-256: {data.checksumSha256}</p>}<Button className="min-h-11" disabled={busy} onClick={() => void download()}>Tải chứng chỉ</Button></div>}
    </Modal>}
  </>
}
