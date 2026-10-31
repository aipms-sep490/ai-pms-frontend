import { useEffect, useState, type ChangeEvent } from 'react'
import { useExecutionAccess } from '../execution/context/ExecutionAccessContext'
import * as api from '../../services/api/cold.api'
import type { ColdChecklist, ColdChecklistItem, ColdSubmission } from '../../services/api/cold.api'
import { coldScopeLabel, formatColdDateTime, formatFileSize } from './cold-types'
import { coldError, coldNeedsAuthoritativeRefresh } from './cold-errors'
import { ColdBadge, ColdError, ColdLoading, ColdShell } from './cold-ui'
import { DocumentPreviewModal } from '../../components/ui/DocumentPreviewModal'

export function ColdChecklistPage() {
  const { project, actor, routeBase } = useExecutionAccess()
  return <ColdChecklistBody key={project.id} projectId={project.id} projectTitle={project.title} actor={actor} routeBase={routeBase} />
}

function ColdChecklistBody({ projectId, projectTitle, actor, routeBase }: {
  projectId: number; projectTitle: string; actor: string; routeBase: string
}) {
  const [checklist, setChecklist] = useState<ColdChecklist | null>(null)
  const [progress, setProgress] = useState<api.ColdProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [locking, setLocking] = useState(false)
  const [lockError, setLockError] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(''); setLockError('')
    Promise.all([
      api.getColdChecklist(projectId, controller.signal),
      api.getColdProgress ? api.getColdProgress(projectId, controller.signal).catch(() => null) : Promise.resolve(null),
    ])
      .then(([chk, prog]) => {
        if (!controller.signal.aborted) {
          setChecklist(chk)
          if (prog) setProgress(prog)
        }
      })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(coldError(reason)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [projectId, revision])

  function reload() { setRevision((value) => value + 1) }

  async function handleLock() {
    if (!checklist) return
    setLocking(true); setLockError('')
    try {
      const locked = await api.lockColdChecklist(projectId, checklist.concurrencyToken)
      setChecklist(locked)
      reload()
    } catch (reason) {
      setLockError(coldError(reason))
    } finally {
      setLocking(false)
    }
  }

  function replaceItem(updated: ColdSubmission) {
    setChecklist((current) => current && {
      ...current,
      items: current.items.map((item) => item.id === updated.checklistItemId ? { ...item, latest: updated } : item),
    })
  }

  const allBlockers = Array.from(new Set([...(checklist?.blockers ?? []), ...(progress?.blockers ?? [])]))

  return <ColdShell title="Chấm nguội theo ngành" projectTitle={projectTitle} backTo={`${routeBase}/workspace`}
    description={actor === 'student' ? 'Nộp từng báo cáo theo ngành/cá nhân được giao trước hạn. Hội đồng chấm sau khi khóa gói.' : 'Theo dõi báo cáo chấm nguội của nhóm theo từng ngành và cá nhân.'}>
    {loading ? <ColdLoading /> : error ? <ColdError message={error} retry={reload} /> : checklist && <>
      {allBlockers.length > 0 && <div className="cold-notice cold-notice--warning"><p>Chưa đủ điều kiện khóa gói:</p><ul>{allBlockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></div>}
      {lockError && <ColdError message={lockError} />}
      
      {progress && <div className="cold-panel" style={{ marginBottom: 16 }}>
        <div className="cold-panel-heading">
          <h2>Tiến độ gói chấm nguội</h2>
          <span style={{ fontWeight: 600 }}>Trạng thái: {progress.packageStatus}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, padding: 12 }}>
          <div><small>Báo cáo hiển thị</small><p style={{ fontSize: 18, fontWeight: 700 }}>{progress.visibleReports}</p></div>
          <div><small>Đã nộp</small><p style={{ fontSize: 18, fontWeight: 700 }}>{progress.submittedReports}</p></div>
          <div><small>Đã khóa</small><p style={{ fontSize: 18, fontWeight: 700 }}>{progress.lockedReports}</p></div>
          <div><small>Sẵn sàng chấm</small><p style={{ fontSize: 18, fontWeight: 700, color: progress.ready ? 'green' : 'inherit' }}>{progress.ready ? 'Đạt' : 'Chưa đạt'}</p></div>
        </div>
      </div>}

      <div className="cold-panel">
        <div className="cold-panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Danh sách báo cáo</h2>
            <span>Hạn nộp: {formatColdDateTime(checklist.deadline)}</span>
            {checklist.lockedAt && <span style={{ marginLeft: 12, color: '#16a34a', fontWeight: 600 }}>• Đã khóa: {formatColdDateTime(checklist.lockedAt)}</span>}
          </div>
          {checklist.canLock && (
            <button
              className="cold-button"
              type="button"
              disabled={locking || checklist.status === 'LOCKED'}
              onClick={() => void handleLock()}
            >
              {locking ? 'Đang khóa…' : 'Khóa gói chấm nguội'}
            </button>
          )}
        </div>
        {checklist.items.length === 0 ? <div className="cold-empty">Chưa có checklist báo cáo nào được áp dụng cho đồ án này.</div> : <ul className="cold-list">
          {checklist.items.map((item) => <ColdItemRow key={item.id} item={item} onChanged={replaceItem} onConflict={reload} />)}
        </ul>}
      </div>
    </>}
  </ColdShell>
}

function ColdItemRow({ item, onChanged, onConflict }: {
  item: ColdChecklistItem; onChanged: (submission: ColdSubmission) => void; onConflict: () => void
}) {
  const [note, setNote] = useState(item.latest?.note ?? '')
  const [busy, setBusy] = useState(false)
  const [rowError, setRowError] = useState('')
  const latest = item.latest

  useEffect(() => { setNote(latest?.note ?? '') }, [latest?.id, latest?.note])

  async function run(action: () => Promise<ColdSubmission>) {
    setBusy(true); setRowError('')
    try {
      const result = await action()
      onChanged(result)
    } catch (reason) {
      setRowError(coldError(reason))
      if (coldNeedsAuthoritativeRefresh(reason)) onConflict()
    } finally {
      setBusy(false)
    }
  }

  function createDraft() {
    void run(() => api.saveColdDraft(item.id, { expectedLatestVersion: 0 }))
  }
  function resubmitNewVersion() {
    if (!latest) return
    void run(() => api.saveColdDraft(item.id, { expectedLatestVersion: latest.version }))
  }
  function saveNote() {
    if (!latest) return
    void run(() => api.saveColdDraft(item.id, { expectedLatestVersion: latest.version, note, concurrencyToken: latest.concurrencyToken }))
  }
  function uploadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !latest) return
    void run(() => api.uploadColdSubmissionFile(latest.id, file, latest.concurrencyToken))
  }
  function removeFile(fileId: number) {
    if (!latest) return
    void run(() => api.removeColdSubmissionFile(latest.id, fileId, latest.concurrencyToken))
  }
  function submit() {
    if (!latest) return
    void run(() => api.submitColdSubmission(latest.id, latest.concurrencyToken))
  }
  async function downloadFile(fileId: number, fileName: string) {
    if (!latest) return
    try {
      const blob = await api.downloadColdSubmissionFile(latest.id, fileId)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url; anchor.download = fileName
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (reason) {
      setRowError(coldError(reason))
    }
  }

  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<ColdSubmission[] | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [previewFile, setPreviewFile] = useState<{ id: number; fileName: string; sizeBytes: number; contentType?: string; submissionId: number } | null>(null)

  async function toggleHistory() {
    if (showHistory) {
      setShowHistory(false)
      return
    }
    setShowHistory(true)
    if (!history) {
      setLoadingHistory(true)
      try {
        const res = await api.getColdSubmissionHistory(item.id, 1, 50)
        setHistory(res.items)
      } catch {
        // history fetch error handled quietly
      } finally {
        setLoadingHistory(false)
      }
    }
  }

  const isDraft = latest?.status === 'DRAFT'
  const canEditDraft = item.canWrite && isDraft
  const canResubmit = item.canWrite && latest?.status === 'SUBMITTED'

  return <li className="cold-row">
    <div className="cold-row-head">
      <div>
        <div className="cold-row-meta"><span>{item.reportType}</span><span>{coldScopeLabel(item.scope)}{item.required ? ' • Bắt buộc' : ''}</span></div>
        <h3>{item.name}</h3>
      </div>
      <div className="cold-row-state">
        {latest ? <ColdBadge status={latest.status} /> : <span className="cold-readonly">Chưa có bản nào</span>}
        {latest && <small className="cold-readonly">Phiên bản {latest.version}</small>}
      </div>
    </div>

    {rowError && <ColdError message={rowError} />}

    {!latest && item.canWrite && <div className="cold-editor-actions" style={{ marginTop: 12 }}>
      <button className="cold-button" type="button" disabled={busy} onClick={createDraft}>Tạo bản nháp</button>
    </div>}

    {latest && (canEditDraft ? <div className="cold-editor">
      <label>Ghi chú<textarea value={note} onChange={(event) => setNote(event.target.value)} disabled={busy} /></label>
      <ul className="cold-file-list">
        {latest.files.map((file) => <li key={file.id}>
          <span>{file.fileName} <small>({formatFileSize(file.sizeBytes)})</small></span>
          <button className="cold-button cold-button--secondary" type="button" disabled={busy} onClick={() => removeFile(file.id)}>Xóa</button>
        </li>)}
        {latest.files.length === 0 && <li><small>Chưa có tệp nào.</small></li>}
      </ul>
      <div className="cold-editor-actions">
        <input type="file" accept=".pdf,.docx,.zip" disabled={busy} onChange={uploadFile} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="cold-button cold-button--secondary" type="button" disabled={busy} onClick={saveNote}>Lưu ghi chú</button>
          <button className="cold-button" type="button" disabled={busy || latest.files.length === 0} onClick={submit}>Nộp báo cáo</button>
        </div>
      </div>
    </div> : <div className="cold-readonly">
      {latest.note && <p>{latest.note}</p>}
      <ul className="cold-file-list">
        {latest.files.map((file) => <li key={file.id}>
          <span>{file.fileName} <small>({formatFileSize(file.sizeBytes)})</small></span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="cold-button cold-button--secondary" type="button" onClick={() => setPreviewFile({ id: file.id, fileName: file.fileName, sizeBytes: file.sizeBytes, contentType: file.contentType, submissionId: latest.id })}>Xem trước</button>
            <button className="cold-button cold-button--secondary" type="button" onClick={() => void downloadFile(file.id, file.fileName)}>Tải xuống</button>
          </div>
        </li>)}
      </ul>
      {latest.submittedAt && <small>Đã nộp: {formatColdDateTime(latest.submittedAt)}</small>}
      {canResubmit && <div className="cold-editor-actions" style={{ marginTop: 12 }}>
        <button className="cold-button cold-button--secondary" type="button" disabled={busy} onClick={resubmitNewVersion}>Nộp lại (tạo phiên bản mới)</button>
      </div>}
    </div>)}

    <div style={{ marginTop: 10 }}>
      <button
        type="button"
        className="cold-button cold-button--secondary"
        onClick={() => void toggleHistory()}
        style={{ fontSize: 12, padding: '4px 10px' }}
      >
        {showHistory ? 'Ẩn lịch sử nộp' : 'Xem lịch sử nộp'}
      </button>
    </div>

    {showHistory && (
      <div style={{ marginTop: 10, padding: 12, border: '1px solid var(--color-line-strong)', borderRadius: 8, background: 'var(--color-canvas)' }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#1e293b' }}>Lịch sử các phiên bản:</h4>
        {loadingHistory && <p style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>Đang tải lịch sử…</p>}
        {history && history.length === 0 && <p style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>Chưa có bản ghi lịch sử nào.</p>}
        {history && history.map((sub) => (
          <div key={sub.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-hairline)', fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>Phiên bản {sub.version} ({sub.status})</span>
              <span style={{ color: 'var(--color-ink-muted)', fontSize: 11 }}>{sub.submittedAt ? formatColdDateTime(sub.submittedAt) : formatColdDateTime(sub.createdAt)}</span>
            </div>
            {sub.note && <p style={{ margin: '4px 0', color: '#334155' }}>Ghi chú: {sub.note}</p>}
            {sub.files.length > 0 && (
              <ul style={{ listStyle: 'none', paddingLeft: 0, marginTop: 4 }}>
                {sub.files.map((file) => (
                  <li key={file.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
                    <span>{file.fileName} <small>({formatFileSize(file.sizeBytes)})</small></span>
                    <button
                      type="button"
                      className="cold-button cold-button--secondary"
                      style={{ fontSize: 11, padding: '2px 8px' }}
                      onClick={() => void downloadFile(file.id, file.fileName)}
                    >
                      Tải bản này
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    )}
    {previewFile && <DocumentPreviewModal open fileName={previewFile.fileName} fileSize={previewFile.sizeBytes} contentType={previewFile.contentType} loadBlob={signal => api.downloadColdSubmissionFile(previewFile.submissionId, previewFile.id, signal)} onDownload={() => downloadFile(previewFile.id, previewFile.fileName)} onClose={() => setPreviewFile(null)} />}
  </li>
}
