import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useExecutionAccess } from '../execution/context/ExecutionAccessContext'
import * as api from '../../services/api/cold.api'
import type { ColdChecklist, ColdChecklistItem, ColdSubmission } from '../../services/api/cold.api'
import { coldScopeLabel, formatColdDateTime, formatFileSize } from './cold-types'
import { coldError, coldNeedsAuthoritativeRefresh } from './cold-errors'
import { ColdBadge, ColdError, ColdLoading, ColdShell } from './cold-ui'
import { DocumentPreviewModal } from '../../components/ui/DocumentPreviewModal'
import { ActionVerdict } from '../../components/ui/ActionVerdict'
import { FilterToolbar } from '../../components/ui/FilterToolbar'
import { Modal } from '../../components/ui/Modal'
import { StatTileRow } from '../../components/ui/StatTileRow'
import { WorkspaceEmptyState } from '../../components/ui/WorkspaceState'
import { displayLabel } from '../../components/ui/display-label'
import { SubmissionPreflightPanel } from '../ai-suite/SubmissionPreflightPanel'

type StatusFilter = 'ALL' | 'MISSING' | 'DRAFT' | 'SUBMITTED' | 'LOCKED'
type RequiredFilter = 'ALL' | 'REQUIRED' | 'OPTIONAL'

export function ColdChecklistPage() {
  const { project, actor, routeBase, canManageStructure } = useExecutionAccess()
  return (
    <ColdChecklistBody
      key={project.id}
      projectId={project.id}
      projectCode={project.code}
      projectTitle={project.title}
      actor={actor}
      routeBase={routeBase}
      canManageStructure={canManageStructure}
    />
  )
}

function ColdChecklistBody({ projectId, projectCode, projectTitle, actor, routeBase, canManageStructure }: {
  projectId: number; projectCode?: string; projectTitle: string; actor: string; routeBase: string; canManageStructure: boolean
}) {
  const [checklist, setChecklist] = useState<ColdChecklist | null>(null)
  const [progress, setProgress] = useState<api.ColdProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [locking, setLocking] = useState(false)
  const [lockError, setLockError] = useState('')
  const [revision, setRevision] = useState(0)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [requiredFilter, setRequiredFilter] = useState<RequiredFilter>('ALL')

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
  const showLockVerdict = Boolean(checklist && (canManageStructure || checklist.canLock || actor !== 'student'))

  const items = checklist?.items ?? []
  const statusCounts = useMemo(() => {
    const counts = { ALL: items.length, MISSING: 0, DRAFT: 0, SUBMITTED: 0, LOCKED: 0 }
    for (const item of items) {
      if (!item.latest) counts.MISSING += 1
      else if (item.latest.status === 'DRAFT') counts.DRAFT += 1
      else if (item.latest.status === 'SUBMITTED') counts.SUBMITTED += 1
      else counts.LOCKED += 1
    }
    return counts
  }, [items])

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => {
      if (statusFilter === 'MISSING' && item.latest) return false
      if (statusFilter === 'DRAFT' && item.latest?.status !== 'DRAFT') return false
      if (statusFilter === 'SUBMITTED' && item.latest?.status !== 'SUBMITTED') return false
      if (statusFilter === 'LOCKED' && (!item.latest || (item.latest.status !== 'LOCKED' && item.latest.status !== 'REVIEWED'))) return false
      if (requiredFilter === 'REQUIRED' && !item.required) return false
      if (requiredFilter === 'OPTIONAL' && item.required) return false
      if (!q) return true
      const reportTypeLabel = displayLabel(item.reportType).toLowerCase()
      const scopeText = coldScopeLabel(item.scope).toLowerCase()
      return item.name.toLowerCase().includes(q)
        || item.reportType.toLowerCase().includes(q)
        || reportTypeLabel.includes(q)
        || scopeText.includes(q)
    })
  }, [items, requiredFilter, search, statusFilter])

  const activeChips = [
    ...(search.trim() ? [{ id: 'search', label: 'Từ khóa', value: search.trim() }] : []),
    ...(statusFilter !== 'ALL' ? [{
      id: 'status',
      label: 'Trạng thái',
      value: ({ MISSING: 'Chưa tạo', DRAFT: 'Bản nháp', SUBMITTED: 'Đã nộp', LOCKED: 'Đã khóa' })[statusFilter],
    }] : []),
    ...(requiredFilter !== 'ALL' ? [{
      id: 'required',
      label: 'Phân loại',
      value: requiredFilter === 'REQUIRED' ? 'Bắt buộc' : 'Tùy chọn',
    }] : []),
  ]

  function removeChip(id: string) {
    if (id === 'search') setSearch('')
    if (id === 'status') setStatusFilter('ALL')
    if (id === 'required') setRequiredFilter('ALL')
  }

  function clearFilters() {
    setSearch('')
    setStatusFilter('ALL')
    setRequiredFilter('ALL')
  }

  return <ColdShell
    title="Chấm nguội theo ngành"
    projectTitle={projectTitle}
    eyebrow={projectCode ? `Chấm nguội · ${projectCode}` : `Chấm nguội · ${projectTitle}`}
    backTo={actor === 'student' ? undefined : `${routeBase}/workspace`}
    description={actor === 'student' ? 'Nộp từng báo cáo theo ngành hoặc cá nhân được giao trước hạn. Hội đồng sẽ chấm sau khi khóa gói.' : 'Theo dõi báo cáo chấm nguội của nhóm theo từng ngành và cá nhân.'}
    action={
      <button type="button" className="cold-button cold-button--secondary" onClick={reload} disabled={loading}>
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">refresh</span>
        Làm mới
      </button>
    }
  >
    {loading ? <ColdLoading /> : error ? <ColdError message={error} retry={reload} /> : !checklist ? <WorkspaceEmptyState title="Chưa có checklist báo cáo" message="Hệ thống chưa trả về checklist chấm nguội cho đồ án này." /> : <>
      {showLockVerdict && (
        <ActionVerdict
          actions={[{ code: 'LOCK_COLD_PACKAGE', allowed: checklist.canLock, reasons: allBlockers }]}
          actionCode="LOCK_COLD_PACKAGE"
          status="ready"
          okLabel="Đủ điều kiện khóa gói"
          blockedLabel="Chưa đủ điều kiện khóa gói"
        />
      )}
      {lockError && <ColdError message={lockError} />}
      {progress && (
        <div className="mb-5 space-y-2">
          <StatTileRow
            tiles={[
              { icon: 'inventory', label: 'Báo cáo hiển thị', value: progress.visibleReports, hero: true, caption: `Trạng thái gói: ${displayLabel(progress.packageStatus)}` },
              { icon: 'upload_file', label: 'Đã nộp', value: progress.submittedReports, tone: 'info', caption: 'Báo cáo đã gửi vào hệ thống.' },
              { icon: 'lock', label: 'Đã khóa', value: progress.lockedReports, tone: 'success', caption: 'Sẵn sàng chuyển hội đồng chấm.' },
              { icon: 'verified', label: 'Sẵn sàng chấm', value: progress.ready ? 'Đạt' : 'Chưa đạt', tone: progress.ready ? 'success' : 'warning', caption: actor === 'student' ? 'Điểm chấm nguội được ẩn tới khi công bố chính thức.' : 'Kiểm tra đủ điều kiện trước khi chấm.' },
            ]}
          />
        </div>
      )}

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

        {checklist.items.length > 0 && (
          <div className="border-b border-hairline px-5 py-3.5">
            <FilterToolbar
              embedded
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Tìm tên hoặc loại báo cáo…"
              searchLabel="Tìm báo cáo chấm nguội"
              tabsLabel="Lọc theo trạng thái báo cáo"
              activeTab={statusFilter}
              onTabChange={(value) => setStatusFilter(value as StatusFilter)}
              tabs={[
                { value: 'ALL', label: 'Tất cả', count: statusCounts.ALL },
                { value: 'MISSING', label: 'Chưa tạo', count: statusCounts.MISSING },
                { value: 'DRAFT', label: 'Bản nháp', count: statusCounts.DRAFT },
                { value: 'SUBMITTED', label: 'Đã nộp', count: statusCounts.SUBMITTED },
                { value: 'LOCKED', label: 'Đã khóa', count: statusCounts.LOCKED },
              ]}
              controls={
                <label className="ft-select-wrap">
                  <span className="sr-only">Yêu cầu báo cáo</span>
                  <select
                    aria-label="Phân loại bắt buộc"
                    value={requiredFilter}
                    onChange={(event) => setRequiredFilter(event.target.value as RequiredFilter)}
                    className="ft-select"
                  >
                    <option value="ALL">Tất cả yêu cầu</option>
                    <option value="REQUIRED">Bắt buộc</option>
                    <option value="OPTIONAL">Tùy chọn</option>
                  </select>
                </label>
              }
              activeChips={activeChips}
              onRemoveChip={removeChip}
              onClearAll={clearFilters}
              hasActiveFilters={activeChips.length > 0}
              resultSummary={activeChips.length > 0 ? `Hiển thị ${filteredItems.length} / ${checklist.items.length} báo cáo` : undefined}
            />
          </div>
        )}

        {checklist.items.length === 0 ? (
          <WorkspaceEmptyState title="Chưa có checklist báo cáo" message="Chưa có checklist báo cáo nào được áp dụng cho đồ án này." />
        ) : filteredItems.length === 0 ? (
          <WorkspaceEmptyState
            title="Không tìm thấy báo cáo phù hợp"
            message="Thử điều chỉnh từ khóa hoặc bỏ bộ lọc trạng thái để xem đầy đủ danh sách báo cáo."
            action={<button type="button" className="cold-button cold-button--secondary" onClick={clearFilters}>Xóa bộ lọc</button>}
          />
        ) : (
          <ul className="cold-list">
            {filteredItems.map((item) => <ColdItemRow key={item.id} item={item} onChanged={replaceItem} onConflict={reload} />)}
          </ul>
        )}
      </div>
      <div className="mt-4">
        <SubmissionPreflightPanel projectId={projectId} target="COLD" />
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
  const [editorOpen, setEditorOpen] = useState(false)
  const latest = item.latest

  useEffect(() => { setNote(latest?.note ?? '') }, [latest?.id, latest?.note])

  async function run(action: () => Promise<ColdSubmission>, onSuccess?: (result: ColdSubmission) => void) {
    setBusy(true); setRowError('')
    try {
      const result = await action()
      onChanged(result)
      onSuccess?.(result)
    } catch (reason) {
      setRowError(coldError(reason))
      if (coldNeedsAuthoritativeRefresh(reason)) onConflict()
    } finally {
      setBusy(false)
    }
  }

  function createDraft() {
    void run(() => api.saveColdDraft(item.id, { expectedLatestVersion: 0 }), () => setEditorOpen(true))
  }
  function resubmitNewVersion() {
    if (!latest) return
    void run(() => api.saveColdDraft(item.id, { expectedLatestVersion: latest.version }), () => setEditorOpen(true))
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
    void run(() => api.submitColdSubmission(latest.id, latest.concurrencyToken), () => setEditorOpen(false))
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
  const [historyError, setHistoryError] = useState('')
  const [previewFile, setPreviewFile] = useState<{ id: number; fileName: string; sizeBytes: number; contentType?: string; submissionId: number } | null>(null)

  async function loadHistory() {
    setLoadingHistory(true); setHistoryError('')
    try {
      const res = await api.getColdSubmissionHistory(item.id, 1, 50)
      setHistory(res.items)
    } catch (reason) {
      setHistoryError(coldError(reason))
    } finally {
      setLoadingHistory(false)
    }
  }

  async function toggleHistory() {
    if (showHistory) {
      setShowHistory(false)
      return
    }
    setShowHistory(true)
    if (!history) {
      await loadHistory()
    }
  }

  const isDraft = latest?.status === 'DRAFT'
  const canEditDraft = item.canWrite && isDraft
  const canResubmit = item.canWrite && latest?.status === 'SUBMITTED'
  const localizedReportType = displayLabel(item.reportType)

  return <li className="cold-row">
    <div className="cold-row-head">
      <div>
        <div className="cold-row-meta">
          <span>{localizedReportType}</span>
          <span>{coldScopeLabel(item.scope)}{item.required ? ' • Bắt buộc' : ' • Tùy chọn'}</span>
        </div>
        <h3>{item.name}</h3>
      </div>
      <div className="cold-row-state">
        {latest ? <ColdBadge status={latest.status} /> : <span className="cold-readonly">Chưa có bản nào</span>}
        {latest && <small className="cold-readonly">Phiên bản {latest.version}</small>}
      </div>
    </div>

    {rowError && !editorOpen && <div className="mt-3"><ColdError message={rowError} /></div>}

    {latest && (
      <div className="cold-readonly">
        {latest.note && <p className="mb-2 text-ink-soft">{latest.note}</p>}
        {latest.files.length > 0 ? (
          <ul className="cold-file-list">
            {latest.files.map((file) => <li key={file.id}>
              <span>{file.fileName} <small>({formatFileSize(file.sizeBytes)})</small></span>
              <div className="cold-inline-actions">
                <button className="cold-button cold-button--secondary cold-button--compact" type="button" onClick={() => setPreviewFile({ id: file.id, fileName: file.fileName, sizeBytes: file.sizeBytes, contentType: file.contentType, submissionId: latest.id })}>Xem trước</button>
                <button className="cold-button cold-button--secondary cold-button--compact" type="button" onClick={() => void downloadFile(latest.id, file.id, file.fileName)}>Tải xuống</button>
              </div>
            </li>)}
          </ul>
        ) : isDraft ? (
          <p className="text-xs text-ink-muted">Chưa đính kèm tệp nào. Mở hộp thoại chỉnh sửa để tải tệp lên và nộp báo cáo.</p>
        ) : null}
        {latest.submittedAt && <small className="mt-2 block">Đã nộp: {formatColdDateTime(latest.submittedAt)}</small>}
      </div>
    )}

    <div className="cold-editor-actions cold-editor-actions--spaced">
      <div className="cold-inline-actions">
        {!latest && item.canWrite && (
          <button className="cold-button" type="button" disabled={busy} onClick={createDraft}>Tạo bản nháp</button>
        )}
        {canEditDraft && (
          <button className="cold-button" type="button" disabled={busy} onClick={() => { setRowError(''); setEditorOpen(true) }}>
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">edit_document</span>
            Chỉnh sửa &amp; nộp
          </button>
        )}
        {canResubmit && (
          <button className="cold-button cold-button--secondary" type="button" disabled={busy} onClick={resubmitNewVersion}>Nộp lại (tạo phiên bản mới)</button>
        )}
      </div>
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
        {historyError && <ColdError message={historyError} retry={() => void loadHistory()} />}
        {!historyError && history && history.length === 0 && <p className="text-xs text-ink-muted">Chưa có bản ghi lịch sử nào.</p>}
        {!historyError && history && history.length > 0 && (
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
                        <div className="cold-inline-actions">
                          <button
                            type="button"
                            className="cold-button cold-button--secondary cold-button--compact"
                            onClick={() => setPreviewFile({ id: file.id, fileName: file.fileName, sizeBytes: file.sizeBytes, contentType: file.contentType, submissionId: sub.id })}
                          >
                            Xem trước
                          </button>
                          <button
                            type="button"
                            className="cold-button cold-button--secondary cold-button--compact"
                            onClick={() => void downloadFile(sub.id, file.id, file.fileName)}
                          >
                            Tải bản này
                          </button>
                        </div>
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

    {canEditDraft && latest && editorOpen && (
      <Modal
        open
        drawer
        busy={busy}
        title={item.name}
        description={`${localizedReportType} · ${coldScopeLabel(item.scope)} · Phiên bản ${latest.version}`}
        onClose={() => setEditorOpen(false)}
      >
        <div className="flex flex-col gap-4">
          {rowError && <ColdError message={rowError} />}
          <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-soft">
            Ghi chú
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={busy}
              rows={4}
              placeholder="Ghi chú phạm vi báo cáo, liên kết hoặc lưu ý cho hội đồng…"
              className="w-full rounded-lg border border-line-strong bg-card px-3.5 py-2.5 text-sm font-normal normal-case tracking-normal text-ink focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">Tệp đính kèm ({latest.files.length})</span>
              <label className="cold-file-picker">
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">upload_file</span>
                <span>Chọn tệp đính kèm (.pdf, .docx, .zip)</span>
                <input type="file" accept=".pdf,.docx,.zip" disabled={busy} onChange={uploadFile} />
              </label>
            </div>
            <ul className="cold-file-list">
              {latest.files.map((file) => <li key={file.id}>
                <span className="min-w-0 truncate">{file.fileName} <small>({formatFileSize(file.sizeBytes)})</small></span>
                <div className="cold-inline-actions">
                  <button
                    className="cold-button cold-button--secondary cold-button--compact"
                    type="button"
                    disabled={busy}
                    onClick={() => setPreviewFile({ id: file.id, fileName: file.fileName, sizeBytes: file.sizeBytes, contentType: file.contentType, submissionId: latest.id })}
                  >
                    Xem trước
                  </button>
                  <button
                    className="cold-button cold-button--secondary cold-button--compact"
                    type="button"
                    disabled={busy}
                    onClick={() => removeFile(file.id)}
                  >
                    Xóa
                  </button>
                </div>
              </li>)}
              {latest.files.length === 0 && <li><small>Chưa có tệp nào. Cần đính kèm ít nhất 1 tệp trước khi nộp báo cáo.</small></li>}
            </ul>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-hairline pt-4">
            <button className="cold-button cold-button--secondary" type="button" disabled={busy} onClick={() => setEditorOpen(false)}>Đóng</button>
            <button className="cold-button cold-button--secondary" type="button" disabled={busy} onClick={saveNote}>Lưu ghi chú</button>
            <button className="cold-button" type="button" disabled={busy || latest.files.length === 0} onClick={submit}>Nộp báo cáo</button>
          </div>
        </div>
      </Modal>
    )}

    {previewFile && <DocumentPreviewModal open fileName={previewFile.fileName} fileSize={previewFile.sizeBytes} contentType={previewFile.contentType} loadBlob={signal => api.downloadColdSubmissionFile(previewFile.submissionId, previewFile.id, signal)} onDownload={() => downloadFile(previewFile.submissionId, previewFile.id, previewFile.fileName)} onClose={() => setPreviewFile(null)} />}
  </li>
}
