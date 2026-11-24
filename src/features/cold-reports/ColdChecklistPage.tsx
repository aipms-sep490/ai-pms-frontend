import { useEffect, useState, type ChangeEvent } from 'react'
import { useExecutionAccess } from '../execution/context/ExecutionAccessContext'
import * as api from '../../services/api/cold.api'
import type { ColdChecklist, ColdChecklistItem, ColdSubmission } from '../../services/api/cold.api'
import { coldPackageStatusLabel, coldScopeLabel, coldStatusLabel, formatColdDateTime, formatFileSize } from './cold-types'
import { coldError, coldNeedsAuthoritativeRefresh } from './cold-errors'
import { ColdBadge, ColdError, ColdLoading, ColdShell } from './cold-ui'
import { DocumentPreviewModal } from '../../components/ui/DocumentPreviewModal'
import { ActionVerdict } from '../../components/ui/ActionVerdict'
import { EntityIdentityStrip } from '../../components/ui/EntityIdentityStrip'
import { Pagination } from '../../components/ui/Pagination'
import { StatTileRow } from '../../components/ui/StatTileRow'
import { useClientPagination } from '../../components/ui/useClientPagination'
import { WorkspaceEmptyState } from '../../components/ui/WorkspaceState'

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
  const items = checklist?.items ?? []
  const pagination = useClientPagination(items, 8)
  const requiredCount = items.filter((item) => item.required).length
  const submittedCount = items.filter((item) => item.latest?.status === 'SUBMITTED' || item.latest?.status === 'LOCKED').length
  const missingCount = items.length - submittedCount
  const completionPct = items.length > 0 ? Math.round((submittedCount / items.length) * 100) : 0

  return (
    <ColdShell
      title="Chấm nguội theo ngành"
      projectTitle={projectTitle}
      backTo={`${routeBase}/workspace`}
      description={actor === 'student' ? 'Nộp từng báo cáo theo ngành/cá nhân được giao trước hạn. Hội đồng chấm sau khi khóa gói.' : 'Theo dõi báo cáo chấm nguội của nhóm theo từng ngành và cá nhân.'}
    >
      <div className="space-y-5">
        <EntityIdentityStrip chips={[{ icon: 'folder', label: 'Đồ án', value: projectTitle }, { icon: 'tag', label: 'Mã đồ án', value: String(projectId) }]} />

        {loading ? (
          <ColdLoading />
        ) : error ? (
          <ColdError message={error} retry={reload} />
        ) : !checklist ? (
          <WorkspaceEmptyState title="Chưa có checklist báo cáo" message="Hệ thống chưa trả về checklist chấm nguội cho đồ án này." />
        ) : (
          <>
            <StatTileRow
              tiles={[
                {
                  icon: 'fact_check',
                  label: 'Tổng đầu mục',
                  value: items.length,
                  caption: progress ? `Gói: ${coldPackageStatusLabel(progress.packageStatus)}` : 'Theo checklist chấm nguội',
                  hero: true,
                },
                {
                  icon: 'priority_high',
                  label: 'Bắt buộc',
                  value: requiredCount,
                  tone: 'info',
                  caption: 'Đầu mục yêu cầu nộp trước hạn',
                },
                {
                  icon: 'cloud_done',
                  label: 'Đã nộp',
                  value: submittedCount,
                  tone: submittedCount > 0 ? 'success' : 'neutral',
                  caption: progress ? `${progress.lockedReports} đã khóa · ${progress.ready ? 'Đủ điều kiện chấm' : 'Chưa sẵn sàng chấm'}` : 'Hoàn tất nộp phiên bản',
                },
                {
                  icon: 'pending_actions',
                  label: 'Còn thiếu',
                  value: missingCount,
                  tone: missingCount > 0 ? 'warning' : 'success',
                  caption: missingCount > 0 ? 'Chưa nộp hoặc còn ở trạng thái nháp' : 'Đã nộp đủ toàn bộ đầu mục',
                },
              ]}
            />

            <ActionVerdict actions={[{ code: 'LOCK_COLD_PACKAGE', allowed: checklist.canLock, reasons: allBlockers }]} actionCode="LOCK_COLD_PACKAGE" status="ready" okLabel="Đủ điều kiện khóa gói" blockedLabel="Chưa đủ điều kiện khóa gói" />
            {lockError && <ColdError message={lockError} />}

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
              {items.length > 0 && (
                <div className="cold-progress-bar-wrap border-b border-hairline bg-canvas/30">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-ink-soft">
                    <span>Hoàn thiện đầu mục báo cáo{progress ? ` · Trạng thái gói: ${coldPackageStatusLabel(progress.packageStatus)}` : ''}</span>
                    <span className="tabular-nums text-primary">{completionPct}% ({submittedCount}/{items.length})</span>
                  </div>
                  <div className="cold-progress-track">
                    <div className="cold-progress-fill" style={{ width: `${completionPct}%` }} />
                  </div>
                </div>
              )}
              {items.length === 0 ? (
                <WorkspaceEmptyState title="Chưa có checklist báo cáo" message="Chưa có checklist báo cáo nào được áp dụng cho đồ án này." />
              ) : (
                <>
                  <ul className="cold-list">
                    {pagination.paginatedItems.map((item) => (
                      <ColdItemRow key={item.id} item={item} onChanged={replaceItem} onConflict={reload} />
                    ))}
                  </ul>
                  {pagination.showPagination && (
                    <div className="border-t border-hairline px-5 py-3">
                      <Pagination
                        page={pagination.page}
                        pages={pagination.totalPages}
                        total={pagination.total}
                        pageSize={pagination.pageSize}
                        pageSizeOptions={[8, 16, 30]}
                        onPage={pagination.setPage}
                        onPageSizeChange={pagination.setPageSize}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </ColdShell>
  )
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
  const historyPagination = useClientPagination(history ?? [], 6)

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

  return (
    <li className="cold-row">
      <div className="cold-row-head">
        <div className="min-w-0 flex-1">
          <div className="cold-row-meta">
            <span>{item.reportType}</span>
            <span>{coldScopeLabel(item.scope)}{item.required ? ' • Bắt buộc' : ''}{latest ? ` • Phiên bản ${latest.version}` : ''}</span>
          </div>
          <h3>{item.name}</h3>
        </div>
        <div className="cold-row-state">
          {latest ? <ColdBadge status={latest.status} /> : <span className="cold-readonly">Chưa có bản nào</span>}
          {!latest && item.canWrite && (
            <button className="cold-button cold-button--compact" type="button" disabled={busy} onClick={createDraft}>Tạo bản nháp</button>
          )}
          <button
            type="button"
            className="cold-button cold-button--secondary cold-button--compact"
            onClick={() => void toggleHistory()}
          >
            {showHistory ? 'Ẩn lịch sử nộp' : 'Xem lịch sử nộp'}
          </button>
        </div>
      </div>

      {rowError && <ColdError message={rowError} />}

      {latest && (canEditDraft ? (
        <div className="cold-editor">
          <label>Ghi chú<textarea value={note} onChange={(event) => setNote(event.target.value)} disabled={busy} /></label>
          <ul className="cold-file-list">
            {latest.files.map((file) => (
              <li key={file.id}>
                <span>{file.fileName} <small>({formatFileSize(file.sizeBytes)})</small></span>
                <button className="cold-button cold-button--secondary cold-button--compact" type="button" disabled={busy} onClick={() => removeFile(file.id)}>Xóa</button>
              </li>
            ))}
            {latest.files.length === 0 && <li><small>Chưa có tệp nào.</small></li>}
          </ul>
          <div className="cold-editor-actions">
            <input type="file" accept=".pdf,.docx,.zip" disabled={busy} onChange={uploadFile} />
            <div className="cold-inline-actions">
              <button className="cold-button cold-button--secondary" type="button" disabled={busy} onClick={saveNote}>Lưu ghi chú</button>
              <button className="cold-button" type="button" disabled={busy || latest.files.length === 0} onClick={submit}>Nộp báo cáo</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="cold-readonly">
          {latest.note && <p>{latest.note}</p>}
          <ul className="cold-file-list">
            {latest.files.map((file) => (
              <li key={file.id}>
                <span>{file.fileName} <small>({formatFileSize(file.sizeBytes)})</small></span>
                <div className="cold-inline-actions">
                  <button className="cold-button cold-button--secondary cold-button--compact" type="button" onClick={() => setPreviewFile({ id: file.id, fileName: file.fileName, sizeBytes: file.sizeBytes, contentType: file.contentType, submissionId: latest.id })}>Xem trước</button>
                  <button className="cold-button cold-button--secondary cold-button--compact" type="button" onClick={() => void downloadFile(file.id, file.fileName)}>Tải xuống</button>
                </div>
              </li>
            ))}
          </ul>
          <div className="cold-editor-actions cold-editor-actions--spaced">
            {latest.submittedAt ? <small>Đã nộp: {formatColdDateTime(latest.submittedAt)}</small> : <span />}
            {canResubmit && (
              <button className="cold-button cold-button--secondary cold-button--compact" type="button" disabled={busy} onClick={resubmitNewVersion}>Nộp lại (tạo phiên bản mới)</button>
            )}
          </div>
        </div>
      ))}

      {showHistory && (
        <div className="cold-history">
          <h4 className="cold-history-title">Lịch sử các phiên bản:</h4>
          {loadingHistory && <p className="cold-history-muted">Đang tải lịch sử…</p>}
          {history && history.length === 0 && <p className="cold-history-muted">Chưa có bản ghi lịch sử nào.</p>}
          {history && historyPagination.paginatedItems.map((sub) => (
            <div key={sub.id} className="cold-history-item">
              <div className="cold-history-item-head">
                <span className="cold-history-version">Phiên bản {sub.version} ({coldStatusLabel(sub.status)})</span>
                <span className="cold-history-date">{sub.submittedAt ? formatColdDateTime(sub.submittedAt) : formatColdDateTime(sub.createdAt)}</span>
              </div>
              {sub.note && <p className="cold-history-note">Ghi chú: {sub.note}</p>}
              {sub.files.length > 0 && (
                <ul className="cold-history-files">
                  {sub.files.map((file) => (
                    <li key={file.id} className="cold-history-file">
                      <span>{file.fileName} <small>({formatFileSize(file.sizeBytes)})</small></span>
                      <button
                        type="button"
                        className="cold-button cold-button--secondary cold-button--compact"
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
          {history && historyPagination.showPagination && (
            <Pagination
              className="mt-3"
              page={historyPagination.page}
              pages={historyPagination.totalPages}
              total={historyPagination.total}
              pageSize={historyPagination.pageSize}
              onPage={historyPagination.setPage}
            />
          )}
        </div>
      )}
      {previewFile && <DocumentPreviewModal open fileName={previewFile.fileName} fileSize={previewFile.sizeBytes} contentType={previewFile.contentType} loadBlob={signal => api.downloadColdSubmissionFile(previewFile.submissionId, previewFile.id, signal)} onDownload={() => downloadFile(previewFile.id, previewFile.fileName)} onClose={() => setPreviewFile(null)} />}
    </li>
  )
}
