import { useEffect, useState, type ChangeEvent } from 'react'
import { useExecutionAccess } from '../execution/context/ExecutionAccessContext'
import * as api from '../../services/api/cold.api'
import type { ColdChecklist, ColdChecklistItem, ColdSubmission } from '../../services/api/cold.api'
import { coldScopeLabel, formatColdDateTime, formatFileSize } from './cold-types'
import { coldError, coldNeedsAuthoritativeRefresh } from './cold-errors'
import { ColdBadge, ColdError, ColdLoading, ColdShell } from './cold-ui'

export function ColdChecklistPage() {
  const { project, actor, routeBase } = useExecutionAccess()
  return <ColdChecklistBody key={project.id} projectId={project.id} projectTitle={project.title} actor={actor} routeBase={routeBase} />
}

function ColdChecklistBody({ projectId, projectTitle, actor, routeBase }: {
  projectId: number; projectTitle: string; actor: string; routeBase: string
}) {
  const [checklist, setChecklist] = useState<ColdChecklist | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    api.getColdChecklist(projectId, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setChecklist(result) })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(coldError(reason)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [projectId, revision])

  function reload() { setRevision((value) => value + 1) }

  function replaceItem(updated: ColdSubmission) {
    setChecklist((current) => current && {
      ...current,
      items: current.items.map((item) => item.id === updated.checklistItemId ? { ...item, latest: updated } : item),
    })
  }

  return <ColdShell title="Chấm nguội theo ngành" projectTitle={projectTitle} backTo={`${routeBase}/workspace`}
    description={actor === 'student' ? 'Nộp từng báo cáo theo ngành/cá nhân được giao trước hạn. Hội đồng chấm sau khi khóa gói.' : 'Theo dõi báo cáo chấm nguội của nhóm theo từng ngành và cá nhân.'}>
    {loading ? <ColdLoading /> : error ? <ColdError message={error} retry={reload} /> : checklist && <>
      {checklist.blockers.length > 0 && <div className="cold-notice cold-notice--warning"><p>Chưa đủ điều kiện khóa gói:</p><ul>{checklist.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></div>}
      <div className="cold-panel">
        <div className="cold-panel-heading"><h2>Danh sách báo cáo</h2><span>Hạn nộp: {formatColdDateTime(checklist.deadline)}</span></div>
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
          <button className="cold-button cold-button--secondary" type="button" onClick={() => void downloadFile(file.id, file.fileName)}>Tải xuống</button>
        </li>)}
      </ul>
      {latest.submittedAt && <small>Đã nộp: {formatColdDateTime(latest.submittedAt)}</small>}
      {canResubmit && <div className="cold-editor-actions" style={{ marginTop: 12 }}>
        <button className="cold-button cold-button--secondary" type="button" disabled={busy} onClick={resubmitNewVersion}>Nộp lại (tạo phiên bản mới)</button>
      </div>}
    </div>)}
  </li>
}
