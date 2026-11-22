import { useEffect, useState, type ChangeEvent } from 'react'
import { useExecutionAccess } from '../execution/context/ExecutionAccessContext'
import * as api from '../../services/api/cold.api'
import type { ColdChecklist, ColdChecklistItem, ColdSubmission } from '../../services/api/cold.api'
import { coldScopeLabel, formatColdDateTime, formatFileSize } from './cold-types'
import { coldError, coldNeedsAuthoritativeRefresh } from './cold-errors'
import { ColdBadge, ColdError, ColdLoading, ColdShell } from './cold-ui'
import { DocumentPreviewModal } from '../../components/ui/DocumentPreviewModal'
import { ActionVerdict } from '../../components/ui/ActionVerdict'
import { EntityIdentityStrip } from '../../components/ui/EntityIdentityStrip'
import { WorkspaceEmptyState } from '../../components/ui/WorkspaceState'
import { displayLabel } from '../../components/ui/display-label'

export function ColdChecklistPage() {
  const { project, actor, routeBase } = useExecutionAccess()
  return <ColdChecklistBody key={project.id} projectId={project.id} projectCode={project.code} projectTitle={project.title} actor={actor} routeBase={routeBase} />
}

function ColdChecklistBody({ projectId, projectCode, projectTitle, actor, routeBase }: {
  projectId: number; projectCode?: string; projectTitle: string; actor: string; routeBase: string
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
    description={actor === 'student' ? 'Nộp từng báo cáo theo ngành hoặc cá nhân được giao trước hạn. Hội đồng sẽ chấm sau khi khóa gói.' : 'Theo dõi báo cáo chấm nguội của nhóm theo từng ngành và cá nhân.'}>
    <EntityIdentityStrip chips={[
      { icon: 'folder', label: 'Đồ án', value: projectTitle },
      ...(projectCode ? [{ icon: 'tag', label: 'Mã đồ án', value: projectCode }] : []),
    ]} />
    {loading ? <ColdLoading /> : error ? <ColdError message={error} retry={reload} /> : !checklist ? <WorkspaceEmptyState title="Chưa có checklist báo cáo" message="Hệ thống chưa trả về checklist chấm nguội cho đồ án này." /> : <>
      <ActionVerdict actions={[{ code: 'LOCK_COLD_PACKAGE', allowed: checklist.canLock, reasons: allBlockers }]} actionCode="LOCK_COLD_PACKAGE" status="ready" okLabel="Đủ điều kiện khóa gói" blockedLabel="Chưa đủ điều kiện khóa gói" />
      {lockError && <ColdError message={lockError} />}
      {progress && <div className="cold-panel cold-panel--progress">
        <div className="cold-panel-heading">
          <h2>Tiến độ gói chấm nguội</h2>
          <span className="cold-progress-status">Trạng thái: {displayLabel(progress.packageStatus)}</span>
        </div>
        <dl className="cold-progress-grid">
          <div className="cold-progress-stat"><dt>Báo cáo hiển thị</dt><dd>{progress.visibleReports}</dd></div>
          <div className="cold-progress-stat"><dt>Đã nộp</dt><dd>{progress.submittedReports}</dd></div>
          <div className="cold-progress-stat"><dt>Đã khóa</dt><dd>{progress.lockedReports}</dd></div>
          <div className="cold-progress-stat"><dt>Sẵn sàng chấm</dt><dd className={progress.ready ? 'is-ready' : ''}>{progress.ready ? 'Đạt' : 'Chưa đạt'}</dd></div>
        </dl>
      </div>}

      <div className="cold-panel">
        <div className="cold-panel-heading">
          <div>
            <h2>Danh sách báo cáo</h2>
            <span>Hạn nộp: {formatColdDateTime(checklist.deadline)}</span>
            {checklist.lockedAt && <span className="cold-locked-meta">• Đã khóa: {formatColdDateTime(checklist.lockedAt)}</span>}
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
        {checklist.items.length === 0 ? <WorkspaceEmptyState title="Chưa có checklist báo cáo" message="Chưa có checklist báo cáo nào được áp dụng cho đồ án này." /> : <ul className="cold-list">
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
  async function downloadFile(submissionId: number, fileId: number, fileName: string) {
    try {
      const blob = await api.downloadColdSubmissionFile(submissionId, fileId)
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

    {!latest && item.canWrite && <div className="cold-editor-actions cold-editor-actions--spaced">
      <button className="cold-button cold-button--secondary" type="button" disabled={busy} onClick={createDraft}>Tạo bản nháp</button>
    </div>}

    {latest && (canEditDraft ? <div className="cold-editor">
      <label>Ghi chú<textarea value={note} onChange={(event) => setNote(event.target.value)} disabled={busy} /></label>
      <ul className="cold-file-list">
        {latest.files.map((file) => <li key={file.id}>
          <span>{file.fileName} <small>({formatFileSize(file.sizeBytes)})</small></span>
          <button className="cold-button cold-button--secondary cold-button--compact" type="button" disabled={busy} onClick={() => removeFile(file.id)}>Xóa</button>
        </li>)}
        {latest.files.length === 0 && <li><small>Chưa có tệp nào.</small></li>}
      </ul>
      <div className="cold-editor-actions">
        <label className="cold-file-picker">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">upload_file</span>
          <span>Chọn tệp đính kèm (.pdf, .docx, .zip)</span>
          <input type="file" accept=".pdf,.docx,.zip" disabled={busy} onChange={uploadFile} />
        </label>
        <div className="cold-inline-actions">
          <button className="cold-button cold-button--secondary" type="button" disabled={busy} onClick={saveNote}>Lưu ghi chú</button>
          <button className="cold-button cold-button--secondary" type="button" disabled={busy || latest.files.length === 0} onClick={submit}>Nộp báo cáo</button>
        </div>
      </div>
    </div> : <div className="cold-readonly">
      {latest.note && <p>{latest.note}</p>}
      <ul className="cold-file-list">
        {latest.files.map((file) => <li key={file.id}>
          <span>{file.fileName} <small>({formatFileSize(file.sizeBytes)})</small></span>
          <div className="cold-inline-actions">
            <button className="cold-button cold-button--secondary cold-button--compact" type="button" onClick={() => setPreviewFile({ id: file.id, fileName: file.fileName, sizeBytes: file.sizeBytes, contentType: file.contentType, submissionId: latest.id })}>Xem trước</button>
            <button className="cold-button cold-button--secondary cold-button--compact" type="button" onClick={() => void downloadFile(latest.id, file.id, file.fileName)}>Tải xuống</button>
          </div>
        </li>)}
      </ul>
      {latest.submittedAt && <small>Đã nộp: {formatColdDateTime(latest.submittedAt)}</small>}
      {canResubmit && <div className="cold-editor-actions cold-editor-actions--spaced">
        <button className="cold-button cold-button--secondary" type="button" disabled={busy} onClick={resubmitNewVersion}>Nộp lại (tạo phiên bản mới)</button>
      </div>}
    </div>)}

    <div className="cold-history-toggle">
      <button
        type="button"
        className="cold-button cold-button--secondary cold-button--compact"
        onClick={() => void toggleHistory()}
      >
        {showHistory ? 'Ẩn lịch sử nộp' : 'Xem lịch sử nộp'}
      </button>
    </div>

    {showHistory && (
      <div className="cold-history-details">
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted">Lịch sử các phiên bản</h4>
        {loadingHistory && <p className="text-xs text-ink-muted">Đang tải lịch sử…</p>}
        {history && history.length === 0 && <p className="text-xs text-ink-muted">Chưa có bản ghi lịch sử nào.</p>}
        {history && history.length > 0 && (
          <ul className="cold-history-list">
            {history.map((sub) => (
              <li key={sub.id} className="cold-history-item">
                <div className="cold-history-head">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">Phiên bản v{sub.version}</span>
                    <ColdBadge status={sub.status} />
                  </div>
                  <span className="text-xs text-ink-muted">{sub.submittedAt ? formatColdDateTime(sub.submittedAt) : formatColdDateTime(sub.createdAt)}</span>
                </div>
                {sub.note && <p className="text-xs text-ink-soft">Ghi chú: {sub.note}</p>}
                {sub.files.length > 0 && (
                  <ul className="cold-file-list">
                    {sub.files.map((file) => (
                      <li key={file.id}>
                        <span>{file.fileName} <small>({formatFileSize(file.sizeBytes)})</small></span>
                        <button
                          type="button"
                          className="cold-button cold-button--secondary cold-button--compact"
                          onClick={() => void downloadFile(sub.id, file.id, file.fileName)}
                        >
                          Tải bản này
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    )}
    {previewFile && <DocumentPreviewModal open fileName={previewFile.fileName} fileSize={previewFile.sizeBytes} contentType={previewFile.contentType} loadBlob={signal => api.downloadColdSubmissionFile(previewFile.submissionId, previewFile.id, signal)} onDownload={() => downloadFile(previewFile.submissionId, previewFile.id, previewFile.fileName)} onClose={() => setPreviewFile(null)} />}
  </li>
}
