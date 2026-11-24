import { useCallback, useEffect, useState } from 'react'
import { HttpError } from '../../services/http/http-client'
import { Pagination } from '../../components/ui/Pagination'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useClientPagination } from '../../components/ui/useClientPagination'
import {
  assignIndustryExpert,
  getIndustrySharedFiles,
  getProjectIndustryAssignments,
  revokeIndustryAssignment,
  revokeIndustrySharedFile,
  shareIndustryFile,
  type IndustryAssignment,
  type IndustryFile,
  type IndustryScope,
} from './industry-api'

function industryScopeLabel(scope: IndustryScope | string): string {
  switch (scope) {
    case 'COMMON': return 'Chung (toàn đồ án)'
    case 'MAJOR_SPECIFIC': return 'Theo chuyên ngành'
    default: return scope
  }
}

export function ProjectIndustryAdvisoryPanel({ projectId }: { projectId: number }) {
  const [assignments, setAssignments] = useState<IndustryAssignment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Assign expert state
  const [expertId, setExpertId] = useState('')
  const [scope, setScope] = useState<IndustryScope>('COMMON')
  const [majorId, setMajorId] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState('')
  const [assignSuccess, setAssignSuccess] = useState('')

  // Selected assignment for managing shared files
  const [activeAssignmentId, setActiveAssignmentId] = useState<number | null>(null)
  const [sharedFiles, setSharedFiles] = useState<IndustryFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [filesError, setFilesError] = useState('')

  // Share file state
  const [versionId, setVersionId] = useState('')
  const [fileId, setFileId] = useState('')
  const [sharing, setSharing] = useState(false)
  const [shareError, setShareError] = useState('')

  const assignmentsPagination = useClientPagination(assignments, 6)
  const filesPagination = useClientPagination(sharedFiles, 6)

  const loadAssignments = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getProjectIndustryAssignments(projectId)
      setAssignments(res.items)
    } catch (err) {
      setError(err instanceof HttpError && err.status === 403
        ? 'Bạn chưa có quyền quản lý cố vấn doanh nghiệp của đồ án này.'
        : 'Không tải được danh sách cố vấn doanh nghiệp.')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void loadAssignments()
  }, [loadAssignments])

  const loadSharedFiles = useCallback(async (assignmentId: number) => {
    setLoadingFiles(true)
    setFilesError('')
    try {
      const res = await getIndustrySharedFiles(assignmentId)
      setSharedFiles(res.items)
    } catch (err) {
      setFilesError(err instanceof HttpError ? err.message : 'Không tải được file đã chia sẻ.')
    } finally {
      setLoadingFiles(false)
    }
  }, [])

  useEffect(() => {
    if (activeAssignmentId != null) {
      void loadSharedFiles(activeAssignmentId)
    } else {
      setSharedFiles([])
    }
  }, [activeAssignmentId, loadSharedFiles])

  async function handleAssign() {
    const eId = Number(expertId)
    if (!eId || !startsAt || !endsAt) return
    if (scope === 'MAJOR_SPECIFIC' && !majorId) return

    setAssigning(true)
    setAssignError('')
    setAssignSuccess('')
    try {
      await assignIndustryExpert(projectId, {
        expertId: eId,
        scope,
        majorId: scope === 'MAJOR_SPECIFIC' ? Number(majorId) : null,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      })
      setAssignSuccess(`Đã phân công chuyên gia #${eId} vào đồ án.`)
      setExpertId('')
      setStartsAt('')
      setEndsAt('')
      await loadAssignments()
    } catch (err) {
      setAssignError(err instanceof HttpError ? err.message : 'Không thể phân công chuyên gia.')
    } finally {
      setAssigning(false)
    }
  }

  async function handleRevokeAssignment(assignment: IndustryAssignment) {
    try {
      await revokeIndustryAssignment(assignment.id, assignment.concurrencyToken)
      await loadAssignments()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Không thể thu hồi phân công.')
    }
  }

  async function handleShareFile(assignment: IndustryAssignment) {
    const vId = Number(versionId)
    const fId = Number(fileId)
    if (!vId || !fId) return

    setSharing(true)
    setShareError('')
    try {
      await shareIndustryFile(assignment.id, {
        concurrencyToken: assignment.concurrencyToken,
        deliverableVersionId: vId,
        fileId: fId,
      })
      setVersionId('')
      setFileId('')
      await loadSharedFiles(assignment.id)
      await loadAssignments()
    } catch (err) {
      setShareError(err instanceof HttpError ? err.message : 'Không thể chia sẻ file.')
    } finally {
      setSharing(false)
    }
  }

  async function handleRevokeFile(assignment: IndustryAssignment, shareId: number) {
    try {
      await revokeIndustrySharedFile(assignment.id, shareId, assignment.concurrencyToken)
      await loadSharedFiles(assignment.id)
      await loadAssignments()
    } catch (err) {
      setFilesError(err instanceof HttpError ? err.message : 'Không thể thu hồi chia sẻ file.')
    }
  }

  const activeAssignment = assignments.find((a) => a.id === activeAssignmentId)

  return (
    <div className="space-y-5">
      {/* Header banner */}
      <div className="rounded-xl border border-hairline bg-card overflow-hidden shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-canvas/70 border-b border-hairline px-5 py-3.5">
          <div>
            <h2 className="text-base font-bold text-ink">Cố vấn doanh nghiệp & Chuyên gia chuyên môn</h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Phân công chuyên gia doanh nghiệp độc lập tư vấn cho đồ án. Ý kiến tư vấn mang tính tham khảo (Advisory Only), không chấm điểm và không cấp quyền học thuật.
            </p>
          </div>
          <StatusBadge tone="info" label={`${assignments.length} cố vấn`} />
        </div>

        {/* Bento 2-column grid: Left 7 cols (Danh sách phân công) | Right 5 cols (Phân công chuyên gia mới) */}
        <div className="grid grid-cols-1 gap-5 p-5 xl:grid-cols-12 items-start">
          {/* Danh sách phân công */}
          <div className="xl:col-span-7 space-y-3">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wide">Danh sách phân công hiện tại</h3>
            {loading && <p className="text-xs text-ink-muted">Đang tải danh sách phân công…</p>}
            {error && <p role="alert" className="text-xs text-status-error-text">{error}</p>}
            {!loading && assignments.length === 0 && (
              <p className="rounded-lg border border-hairline bg-canvas/50 p-4 text-xs text-ink-muted">Đồ án chưa có cố vấn chuyên môn nào.</p>
            )}
            {assignments.length > 0 && (
              <>
                <ul className="space-y-2.5">
                  {assignmentsPagination.paginatedItems.map((a) => (
                    <li key={a.id} className="rounded-xl border border-hairline p-3.5 text-xs bg-card shadow-2xs space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-ink">Chuyên gia #{a.expertId}</span>
                          <span className="rounded bg-canvas px-1.5 py-0.5 border border-hairline text-ink-soft">
                            Phạm vi: {industryScopeLabel(a.scope)}{a.majorId ? ` (Ngành #${a.majorId})` : ''}
                          </span>
                          <StatusBadge
                            tone={a.status === 'ACTIVE' ? 'success' : a.status === 'REVOKED' ? 'danger' : 'neutral'}
                            label={a.status === 'ACTIVE' ? 'Đang hiệu lực' : a.status === 'REVOKED' ? 'Đã thu hồi' : a.status === 'EXPIRED' ? 'Hết hiệu lực' : a.status}
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="text-xs font-semibold text-primary underline"
                            onClick={() => setActiveAssignmentId((curr) => (curr === a.id ? null : a.id))}
                          >
                            {activeAssignmentId === a.id ? 'Ẩn chia sẻ file' : 'Quản lý file chia sẻ'}
                          </button>
                          {a.status === 'ACTIVE' && (
                            <button
                              type="button"
                              className="text-xs text-status-error-text hover:underline"
                              onClick={() => void handleRevokeAssignment(a)}
                            >
                              Thu hồi phân công
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-ink-muted">
                        Thời gian: {new Date(a.startsAt).toLocaleDateString('vi-VN')} – {new Date(a.endsAt).toLocaleDateString('vi-VN')}
                      </p>
                    </li>
                  ))}
                </ul>

                {assignmentsPagination.showPagination && (
                  <Pagination
                    page={assignmentsPagination.page}
                    pages={assignmentsPagination.totalPages}
                    total={assignmentsPagination.total}
                    pageSize={assignmentsPagination.pageSize}
                    pageSizeOptions={[6, 12, 24]}
                    onPage={assignmentsPagination.setPage}
                    onPageSizeChange={assignmentsPagination.setPageSize}
                  />
                )}
              </>
            )}
          </div>

          {/* Phân công chuyên gia mới */}
          <div className="xl:col-span-5 overflow-hidden rounded-xl border border-hairline bg-canvas/50">
            <div className="bg-canvas/80 border-b border-hairline px-4 py-3">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wide">Phân công chuyên gia mới</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-xs font-medium text-ink-soft">
                  Mã chuyên gia (Expert ID)
                  <input
                    type="number"
                    placeholder="vd: 15"
                    className="mt-1 block min-h-10 w-full rounded-md border border-hairline bg-card px-2.5 py-1.5 text-xs text-ink"
                    value={expertId}
                    disabled={assigning}
                    onChange={(e) => setExpertId(e.target.value)}
                  />
                </label>
                <label className="text-xs font-medium text-ink-soft">
                  Phạm vi (Scope)
                  <select
                    className="mt-1 block min-h-10 w-full rounded-md border border-hairline bg-card px-2.5 py-1.5 text-xs text-ink"
                    value={scope}
                    disabled={assigning}
                    onChange={(e) => setScope(e.target.value as IndustryScope)}
                  >
                    <option value="COMMON">Chung (toàn đồ án)</option>
                    <option value="MAJOR_SPECIFIC">Theo chuyên ngành</option>
                  </select>
                </label>
                {scope === 'MAJOR_SPECIFIC' && (
                  <label className="text-xs font-medium text-ink-soft sm:col-span-2">
                    Mã ngành (Major ID)
                    <input
                      type="number"
                      placeholder="vd: 12"
                      className="mt-1 block min-h-10 w-full rounded-md border border-hairline bg-card px-2.5 py-1.5 text-xs text-ink"
                      value={majorId}
                      disabled={assigning}
                      onChange={(e) => setMajorId(e.target.value)}
                    />
                  </label>
                )}
                <label className="text-xs font-medium text-ink-soft">
                  Bắt đầu
                  <input
                    type="datetime-local"
                    className="mt-1 block min-h-10 w-full rounded-md border border-hairline bg-card px-2.5 py-1.5 text-xs text-ink"
                    value={startsAt}
                    disabled={assigning}
                    onChange={(e) => setStartsAt(e.target.value)}
                  />
                </label>
                <label className="text-xs font-medium text-ink-soft">
                  Kết thúc
                  <input
                    type="datetime-local"
                    className="mt-1 block min-h-10 w-full rounded-md border border-hairline bg-card px-2.5 py-1.5 text-xs text-ink"
                    value={endsAt}
                    disabled={assigning}
                    onChange={(e) => setEndsAt(e.target.value)}
                  />
                </label>
              </div>

              {assignError && <p role="alert" className="text-xs text-status-error-text">{assignError}</p>}
              {assignSuccess && <p role="status" className="text-xs text-status-success-text">{assignSuccess}</p>}

              <button
                type="button"
                className="min-h-10 w-full rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
                disabled={assigning || !expertId || !startsAt || !endsAt || (scope === 'MAJOR_SPECIFIC' && !majorId)}
                onClick={() => void handleAssign()}
              >
                {assigning ? 'Đang phân công…' : 'Phân công cố vấn'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quản lý file chia sẻ cho chuyên gia được chọn */}
      {activeAssignment && (
        <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-canvas/70 border-b border-hairline px-5 py-3.5">
            <h3 className="text-sm font-bold text-ink">
              Quản lý file chia sẻ — Chuyên gia #{activeAssignment.expertId} (Phạm vi: {industryScopeLabel(activeAssignment.scope)})
            </h3>
            <button
              type="button"
              className="text-xs font-semibold text-ink-muted hover:text-ink hover:underline"
              onClick={() => setActiveAssignmentId(null)}
            >
              Đóng
            </button>
          </div>

          <div className="p-5 space-y-4">
            <p className="text-xs text-ink-muted">
              Chỉ được chia sẻ các file bản nộp bài (Deliverable version) thuộc đúng phạm vi ({industryScopeLabel(activeAssignment.scope)}). Hồ sơ cá nhân của sinh viên bị nghiêm cấm chia sẻ.
            </p>

            {/* Form chia sẻ file */}
            <div className="flex flex-wrap items-end gap-2.5 rounded-lg border border-hairline p-3.5 bg-canvas/70">
              <label className="text-xs font-medium text-ink-soft">
                Mã phiên bản bài nộp (Deliverable Version ID)
                <input
                  type="number"
                  placeholder="vd: 101"
                  className="mt-1 block min-h-10 rounded-md border border-hairline bg-card px-2.5 py-1.5 text-xs text-ink"
                  value={versionId}
                  disabled={sharing}
                  onChange={(e) => setVersionId(e.target.value)}
                />
              </label>
              <label className="text-xs font-medium text-ink-soft">
                Mã file (File ID)
                <input
                  type="number"
                  placeholder="vd: 501"
                  className="mt-1 block min-h-10 rounded-md border border-hairline bg-card px-2.5 py-1.5 text-xs text-ink"
                  value={fileId}
                  disabled={sharing}
                  onChange={(e) => setFileId(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="min-h-10 rounded-lg bg-primary px-3.5 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
                disabled={sharing || !versionId || !fileId}
                onClick={() => void handleShareFile(activeAssignment)}
              >
                {sharing ? 'Đang chia sẻ…' : 'Chia sẻ file này'}
              </button>
            </div>
            {shareError && <p role="alert" className="text-xs text-status-error-text">{shareError}</p>}

            {/* Danh sách file đang chia sẻ */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-ink uppercase tracking-wide">Các file đang chia sẻ</h4>
                <StatusBadge tone="neutral" label={`${sharedFiles.length} tệp`} />
              </div>
              {loadingFiles && <p className="text-xs text-ink-muted">Đang tải danh sách file…</p>}
              {filesError && <p role="alert" className="text-xs text-status-error-text">{filesError}</p>}
              {!loadingFiles && sharedFiles.length === 0 && (
                <p className="text-xs text-ink-muted">Chưa có file nào được chia sẻ với chuyên gia này.</p>
              )}
              {sharedFiles.length > 0 && (
                <>
                  <ul className="space-y-1.5">
                    {filesPagination.paginatedItems.map((f) => (
                      <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hairline p-2.5 text-xs bg-canvas/60">
                        <div>
                          <span className="font-semibold text-ink">{f.fileName}</span>
                          <span className="ml-2 text-ink-muted">
                            ({f.contentType} · {(f.sizeBytes / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          className="text-xs text-status-error-text hover:underline"
                          onClick={() => void handleRevokeFile(activeAssignment, f.id)}
                        >
                          Thu hồi quyền xem file
                        </button>
                      </li>
                    ))}
                  </ul>
                  {filesPagination.showPagination && (
                    <Pagination
                      page={filesPagination.page}
                      pages={filesPagination.totalPages}
                      total={filesPagination.total}
                      pageSize={filesPagination.pageSize}
                      onPage={filesPagination.setPage}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
