import { useMemo, useState } from 'react'
import type { AssignedReviewItem } from '../types/review-gates.types'
import { Button } from '../../../components/ui/Button'
import { EntityIdentityStrip } from '../../../components/ui/EntityIdentityStrip'
import { FilterToolbar } from '../../../components/ui/FilterToolbar'
import { Modal } from '../../../components/ui/Modal'
import { Pagination } from '../../../components/ui/Pagination'
import { useClientPagination } from '../../../components/ui/useClientPagination'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { HttpError } from '../../../services/http/http-client'
import { humanizeHttpError } from '../../../services/http/humanize-http-error'
import { env } from '../../../app/config/env'
import { EvidenceDownloadButton } from './EvidenceDownloadButton'
import { evidenceArtifactLabel, isLinkArtifact } from '../utils/evidence-link'
import { requirementTypeLabel } from '../utils/review-gate-labels'
import { displayLabel } from '../../../components/ui/display-label'
import { dateTimeLabel } from '../../execution/execution-utils'
import { GateScriptAiPanel } from '../../ai-suite/DefenseMockPanel'

function formatSubmitter(name?: string | null, fallback?: string | number | null): string {
  const named = String(name ?? '').trim()
  if (named) return named
  const raw = String(fallback ?? '').trim()
  if (!raw || /^\d+$/.test(raw)) return 'Thành viên nhóm'
  return raw
}

const queueStatusLabel: Record<string, string> = {
  PENDING_REVIEW: 'Chờ thẩm định',
  IN_REVIEW: 'Đang thẩm định',
  DECIDED: 'Đã quyết định',
  REVOKED: 'Đã thu hồi',
}

type StatusFilter = 'ALL' | 'PENDING_REVIEW' | 'IN_REVIEW' | 'DECIDED' | 'REVOKED'
type SortKey = 'due-asc' | 'status-pending' | 'project-asc'

function itemStatusTone(status: string): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
  if (status === 'DECIDED') return 'success'
  if (status === 'IN_REVIEW') return 'info'
  if (status === 'REVOKED') return 'danger'
  return 'warning'
}

interface AssignedReviewQueueProps {
  assignments: AssignedReviewItem[]
  onVerifyEvidence: (
    assignmentId: string,
    requirementId: string,
    decision: 'ACCEPTED' | 'REJECTED',
    feedback?: string,
    concurrencyToken?: string,
  ) => Promise<void>
  onSubmitDecision: (
    assignmentId: string,
    decision: 'PASSED' | 'REVISION_REQUIRED',
    notes: string,
    concurrencyToken?: string,
  ) => Promise<void>
  onReload?: () => Promise<void> | void
  loading?: boolean
}

export function AssignedReviewQueue({
  assignments,
  onVerifyEvidence,
  onSubmitDecision,
  onReload,
  loading = false,
}: AssignedReviewQueueProps) {
  const [selectedId, setSelectedId] = useState(assignments[0]?.id || '')
  const [notesByAssignment, setNotesByAssignment] = useState<Record<string, string>>({})
  const [feedbackInput, setFeedbackInput] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [gateFilter, setGateFilter] = useState<string>('ALL')
  const [sortBy, setSortBy] = useState<SortKey>('due-asc')

  const [previewingArtifact, setPreviewingArtifact] = useState<{
    filename: string
    version: number
    submittedBy: string
    submittedByName?: string | null
    submittedAt: string
    notes?: string | null
    linkUrl?: string | null
    contentType?: string
  } | null>(null)

  const gateCodes = useMemo(
    () => Array.from(new Set(assignments.map((a) => a.gateCode))).sort(),
    [assignments],
  )

  const statusCounts = useMemo(() => {
    const c = { ALL: assignments.length, PENDING_REVIEW: 0, IN_REVIEW: 0, DECIDED: 0, REVOKED: 0 }
    for (const a of assignments) {
      if (a.status === 'PENDING_REVIEW') c.PENDING_REVIEW += 1
      else if (a.status === 'IN_REVIEW') c.IN_REVIEW += 1
      else if (a.status === 'DECIDED') c.DECIDED += 1
      else if (a.status === 'REVOKED') c.REVOKED += 1
    }
    return c
  }, [assignments])

  const filteredAssignments = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = assignments.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false
      if (gateFilter !== 'ALL' && item.gateCode !== gateFilter) return false
      if (!q) return true
      return item.projectName.toLowerCase().includes(q)
        || item.projectCode.toLowerCase().includes(q)
        || item.gateCode.toLowerCase().includes(q)
        || item.gateTitle.toLowerCase().includes(q)
    })

    return [...list].sort((a, b) => {
      if (sortBy === 'project-asc') return a.projectName.localeCompare(b.projectName, 'vi')
      if (sortBy === 'status-pending') {
        const order: Record<string, number> = { PENDING_REVIEW: 0, IN_REVIEW: 1, DECIDED: 2, REVOKED: 3 }
        const diff = (order[a.status] ?? 9) - (order[b.status] ?? 9)
        if (diff !== 0) return diff
      }
      return (Date.parse(a.dueAt ?? '') || Number.MAX_SAFE_INTEGER) - (Date.parse(b.dueAt ?? '') || Number.MAX_SAFE_INTEGER)
    })
  }, [assignments, gateFilter, search, sortBy, statusFilter])

  const queuePager = useClientPagination(filteredAssignments, 10)

  const activeChips = [
    ...(search.trim() ? [{ id: 'search', label: 'Từ khóa', value: search.trim() }] : []),
    ...(statusFilter !== 'ALL' ? [{ id: 'status', label: 'Trạng thái', value: queueStatusLabel[statusFilter] ?? statusFilter }] : []),
    ...(gateFilter !== 'ALL' ? [{ id: 'gate', label: 'Cổng', value: gateFilter }] : []),
  ]

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('ALL')
    setGateFilter('ALL')
    setSortBy('due-asc')
  }

  if (assignments.length === 0) {
    return (
      <div className="rounded-xl border border-hairline bg-card p-12 text-center text-ink-muted">
        <span className="material-symbols-outlined text-4xl text-ink-muted" aria-hidden="true">task_alt</span>
        <h3 className="mt-2 text-base font-bold text-ink">Không có đợt thẩm định nào được phân công</h3>
        <p className="mt-1 text-xs">Hiện tại bạn đã hoàn tất mọi nhiệm vụ thẩm định hoặc chưa có đợt phân công mới.</p>
      </div>
    )
  }

  const selectedItem = filteredAssignments.find((a) => a.id === selectedId) || filteredAssignments[0] || null
  const reviewNotes = selectedItem ? (notesByAssignment[selectedItem.id] || '') : ''
  const setReviewNotes = (value: string) => {
    if (!selectedItem) return
    setNotesByAssignment(prev => ({ ...prev, [selectedItem.id]: value }))
  }

  const mandatoryReqs = selectedItem ? selectedItem.requirements.filter((r) => r.isMandatory) : []
  const acceptedMandatoryCount = mandatoryReqs.filter((r) => r.verificationStatus === 'ACCEPTED').length
  const allMandatoryAccepted = mandatoryReqs.length > 0 ? acceptedMandatoryCount === mandatoryReqs.length : true
  const isDecided = selectedItem ? (selectedItem.status === 'DECIDED' || selectedItem.status === 'REVOKED') : false

  const handleVerify = async (requirementId: string, decision: 'ACCEPTED' | 'REJECTED') => {
    if (!selectedItem) return
    try {
      setBusy(true)
      setActionError(null)
      setSuccessMsg(null)
      const feedback = feedbackInput[`${selectedItem.id}:${requirementId}`]?.trim()
      await onVerifyEvidence(selectedItem.id, requirementId, decision, feedback, selectedItem.concurrencyToken)
      setSuccessMsg(`Đã cập nhật trạng thái minh chứng thành ${decision === 'ACCEPTED' ? 'Chấp thuận' : 'Yêu cầu nộp lại'}.`)
    } catch (err) {
      setConflict(err instanceof HttpError ? err.status === 409 : env.reviewGatesMockEnabled && err instanceof Error && err.message.includes('409'))
      setActionError(humanizeHttpError(err, 'Không thể xác minh minh chứng.'))
    } finally {
      setBusy(false)
    }
  }

  const handleDecision = async (decision: 'PASSED' | 'REVISION_REQUIRED') => {
    if (!selectedItem) return
    if (!reviewNotes.trim()) {
      setActionError('Bắt buộc nhập nhận xét / lý do thẩm định trước khi lưu kết quả.')
      return
    }

    try {
      setBusy(true)
      setActionError(null)
      setSuccessMsg(null)
      await onSubmitDecision(selectedItem.id, decision, reviewNotes.trim(), selectedItem.concurrencyToken)
      setSuccessMsg(`Đã lưu quyết định thẩm định cổng kiểm duyệt thành công: ${decision === 'PASSED' ? 'Đạt' : 'Cần chỉnh sửa'}.`)
      setReviewNotes('')
    } catch (err) {
      setConflict(err instanceof HttpError ? err.status === 409 : env.reviewGatesMockEnabled && err instanceof Error && err.message.includes('409'))
      setActionError(humanizeHttpError(err, 'Không thể lưu quyết định thẩm định.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <FilterToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm theo tên hoặc mã đồ án, mã cổng…"
        searchLabel="Tìm phân công thẩm định"
        activeTab={statusFilter}
        onTabChange={(value) => setStatusFilter(value as StatusFilter)}
        tabsLabel="Lọc theo trạng thái thẩm định"
        tabs={[
          { value: 'ALL', label: 'Tất cả', count: statusCounts.ALL },
          { value: 'PENDING_REVIEW', label: 'Chờ thẩm định', count: statusCounts.PENDING_REVIEW },
          { value: 'IN_REVIEW', label: 'Đang thẩm định', count: statusCounts.IN_REVIEW },
          { value: 'DECIDED', label: 'Đã quyết định', count: statusCounts.DECIDED },
          ...(statusCounts.REVOKED > 0 ? [{ value: 'REVOKED', label: 'Đã thu hồi', count: statusCounts.REVOKED }] : []),
        ]}
        controls={
          gateCodes.length > 1 ? (
            <label className="ft-select-wrap">
              <span className="sr-only">Lọc theo cổng kiểm duyệt</span>
              <select aria-label="Cổng kiểm duyệt" value={gateFilter} onChange={(e) => setGateFilter(e.target.value)} className="ft-select">
                <option value="ALL">Tất cả cổng</option>
                {gateCodes.map((code) => <option key={code} value={code}>Cổng {code}</option>)}
              </select>
            </label>
          ) : undefined
        }
        sort={{
          value: sortBy,
          onChange: (value) => setSortBy(value as SortKey),
          options: [
            { value: 'due-asc', label: 'Hạn gần nhất' },
            { value: 'status-pending', label: 'Chờ duyệt trước' },
            { value: 'project-asc', label: 'Tên đồ án A–Z' },
          ],
        }}
        activeChips={activeChips}
        onRemoveChip={(id) => {
          if (id === 'search') setSearch('')
          if (id === 'status') setStatusFilter('ALL')
          if (id === 'gate') setGateFilter('ALL')
        }}
        onClearAll={clearFilters}
        hasActiveFilters={activeChips.length > 0}
        resultSummary={activeChips.length > 0 ? `Hiển thị ${filteredAssignments.length} / ${assignments.length} đợt thẩm định` : undefined}
      />

      {!selectedItem ? (
        <div className="rounded-xl border border-hairline bg-card p-10 text-center text-sm text-ink-muted">
          <p>Không tìm thấy đợt thẩm định phù hợp với bộ lọc hiện tại.</p>
          <Button variant="secondary" className="mt-3" onClick={clearFilters}>Xóa bộ lọc</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* Left Column: Assigned Queue */}
          <div className="space-y-3 lg:sticky lg:top-6 lg:col-span-4">
            <div className="rounded-xl border border-hairline bg-card p-4 shadow-xs">
              <h3 className="border-b border-hairline pb-2.5 text-sm font-bold text-ink">
                Hàng đợi Thẩm định ({filteredAssignments.length})
              </h3>
              <div className="mt-3 space-y-2.5">
                {queuePager.paginatedItems.map((item) => {
                  const isSelected = item.id === selectedItem.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(item.id)
                        setActionError(null)
                        setSuccessMsg(null)
                      }}
                      className={`w-full rounded-lg p-3 text-left transition-all border ${
                        isSelected
                          ? 'border-primary bg-primary-subtle/60 shadow-2xs ring-1 ring-primary'
                          : 'border-hairline bg-card hover:bg-canvas'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-md border border-primary/20 bg-primary-subtle px-2 py-0.5 text-xs font-bold text-primary">
                          {item.gateCode}
                        </span>
                        <span className="text-xs font-semibold text-ink-muted">{displayLabel(item.scope)}</span>
                      </div>
                      <h4 className="mt-2 text-xs font-bold text-ink">{item.projectName}</h4>
                      <p className="font-mono text-xs text-ink-muted">{item.projectCode}</p>
                      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-hairline pt-2 text-xs">
                        <span className="text-ink-muted">Hạn: {dateTimeLabel(item.dueAt)}</span>
                        <StatusBadge
                          tone={itemStatusTone(item.status)}
                          label={queueStatusLabel[item.status] ?? displayLabel(item.status)}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
              {queuePager.showPagination && (
                <div className="mt-3 border-t border-hairline pt-3">
                  <Pagination
                    page={queuePager.page}
                    pages={queuePager.pages}
                    total={queuePager.total}
                    pageSize={queuePager.pageSize}
                    onPage={queuePager.setPage}
                    onPageSizeChange={queuePager.setPageSize}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Review Details & Decision */}
          <div className="space-y-4 lg:col-span-8">
            <div className="rounded-xl border border-hairline bg-card p-5 shadow-xs space-y-5">
              {/* Header */}
              <EntityIdentityStrip chips={[
                { icon: 'verified', label: 'Mốc thẩm định', value: `${selectedItem.gateCode} · ${selectedItem.gateTitle}` },
                { icon: 'topic', label: 'Đồ án', value: `${selectedItem.projectCode} · ${selectedItem.projectName}` },
                { icon: 'category', label: 'Phạm vi', value: displayLabel(selectedItem.scope) },
                { icon: 'event', label: 'Hạn thẩm định', value: dateTimeLabel(selectedItem.dueAt) },
                { icon: 'fact_check', label: 'Trạng thái', value: queueStatusLabel[selectedItem.status] ?? displayLabel(selectedItem.status) },
              ]} />

              {/* Feedback & Error alerts */}
              {actionError && (
                conflict ? (
                  <div role="alert" className="rounded-lg border border-status-warning-border bg-status-warning-bg p-4 text-xs text-status-warning-text space-y-2">
                    <div className="flex items-center gap-2 font-bold text-status-warning-text">
                      <span className="material-symbols-outlined text-base" aria-hidden="true">warning</span>
                      <span>Dữ liệu vừa được cập nhật</span>
                    </div>
                    <p>
                      Hồ sơ đợt thẩm định này đã có thay đổi mới từ người dùng khác.
                      Nội dung nhận xét bạn đang soạn thảo bên dưới <strong>vẫn được giữ nguyên</strong>.
                    </p>
                    {onReload && (
                      <button
                        type="button"
                        onClick={async () => {
                          setActionError(null)
                          await onReload()
                        }}
                        className="inline-flex min-h-10 items-center rounded-lg border border-status-warning-border bg-card px-3.5 py-2 text-xs font-bold text-status-warning-text shadow-2xs transition-colors hover:bg-canvas"
                      >
                        Tải lại dữ liệu mới nhất
                      </button>
                    )}
                  </div>
                ) : (
                  <div role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-xs font-semibold text-status-error-text">
                    {actionError}
                  </div>
                )
              )}
              {successMsg && (
                <div role="status" className="flex items-center gap-2 rounded-lg border border-hairline border-l-4 border-l-status-success-text bg-card p-3 text-xs font-semibold text-ink shadow-2xs">
                  <span className="material-symbols-outlined text-[18px] text-status-success-text" aria-hidden="true">check_circle</span>
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Requirements Checklist */}
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                    Minh chứng cần xác minh ({selectedItem.requirements.length})
                  </h4>
                  <span className="whitespace-nowrap text-xs font-semibold text-ink-muted">
                    Đã duyệt: <strong className="text-status-success-text">{acceptedMandatoryCount}</strong> / {mandatoryReqs.length} bắt buộc
                  </span>
                </div>

                <div className="space-y-3">
                  {selectedItem.requirements.map((req) => {
                    const isAccepted = req.verificationStatus === 'ACCEPTED'
                    const isRejected = req.verificationStatus === 'REJECTED'
                    return (
                      <div
                        key={req.id}
                        className={`rounded-lg border p-4 text-xs transition-all ${
                          isAccepted
                            ? 'border-hairline border-l-4 border-l-status-success-text bg-card'
                            : isRejected
                            ? 'border-hairline border-l-4 border-l-status-error-text bg-card'
                            : 'border-hairline bg-canvas/50'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className="text-xs font-bold text-ink">{req.title}</strong>
                            <span className="rounded border border-hairline bg-canvas px-1.5 py-0.5 text-xs text-ink-soft font-medium">{requirementTypeLabel(req.type)}</span>
                            {req.isMandatory && (
                              <span className="rounded border border-status-error-border bg-status-error-bg px-1.5 py-0.5 text-xs font-bold text-status-error-text">Bắt buộc</span>
                            )}
                          </div>
                          <StatusBadge
                            tone={isAccepted ? 'success' : isRejected ? 'danger' : 'warning'}
                            label={isAccepted ? 'Đã duyệt' : isRejected ? 'Yêu cầu nộp lại' : 'Đã nộp · Chờ xác minh'}
                          />
                        </div>

                        {/* Submitted artifact details */}
                        {req.latestArtifact ? (
                          <div className="mt-2.5 rounded-md border border-hairline bg-card p-2.5 text-ink-soft">
                            <div className="flex items-start justify-between gap-2">
                              <span className="min-w-0 font-semibold text-ink inline-flex flex-wrap items-center gap-1.5">
                                <span>{isLinkArtifact(req.latestArtifact) || req.type === 'LINK' ? 'Liên kết minh chứng:' : 'Tệp minh chứng:'}</span>
                                <button
                                  type="button"
                                  onClick={() => setPreviewingArtifact(req.latestArtifact!)}
                                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline cursor-pointer"
                                  title="Xem chi tiết siêu dữ liệu phiên bản minh chứng"
                                >
                                  <span className="material-symbols-outlined text-xs" aria-hidden="true">visibility</span>
                                  <span className="break-all" title={req.latestArtifact.linkUrl ?? req.latestArtifact.filename}>{evidenceArtifactLabel(req.latestArtifact)}</span>
                                </button>
                              </span>
                              <span className="shrink-0 whitespace-nowrap rounded-full bg-canvas px-2 py-0.5 text-xs font-semibold text-ink-muted">
                                Phiên bản v{req.latestArtifact.version}
                              </span>
                            </div>
                            <div className="mt-1 text-ink-muted">
                              Nộp bởi {formatSubmitter(req.latestArtifact.submittedByName, req.latestArtifact.submittedBy)} lúc {dateTimeLabel(req.latestArtifact.submittedAt)}
                            </div>
                            {req.latestArtifact.notes && (
                              <div className="mt-1 text-ink-muted italic">
                                Giải trình: "{req.latestArtifact.notes}"
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mt-2 text-ink-muted italic">Sinh viên chưa nộp minh chứng cho yêu cầu này.</div>
                        )}
                        <EvidenceDownloadButton projectId={selectedItem.projectId} gateCode={selectedItem.gateCode} requirement={req} />

                        {/* Reviewer Feedback & Actions */}
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-hairline/70 pt-2.5">
                          <input
                            type="text"
                            disabled={busy || loading || isDecided}
                            placeholder={isDecided ? 'Đợt thẩm định đã khóa chỉnh sửa.' : 'Nhận xét cụ thể cho minh chứng này (tùy chọn)...'}
                            value={feedbackInput[`${selectedItem.id}:${req.id}`] ?? req.reviewerFeedback ?? ''}
                            onChange={(e) =>
                              setFeedbackInput((prev) => ({ ...prev, [`${selectedItem.id}:${req.id}`]: e.target.value }))
                            }
                            className="min-h-9 flex-1 rounded-md border border-hairline bg-card px-2.5 py-1 text-xs text-ink focus:border-primary focus:outline-hidden disabled:bg-canvas disabled:text-ink-muted"
                          />
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busy || loading || isDecided || !req.latestArtifact || isAccepted}
                            onClick={() => handleVerify(req.id, 'ACCEPTED')}
                          >
                            ✓ Duyệt đạt
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={busy || loading || isDecided || !req.latestArtifact}
                            onClick={() => handleVerify(req.id, 'REJECTED')}
                          >
                            ✕ Yêu cầu sửa
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Decision Section */}
              <div className="border-t border-hairline pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                  Quyết định thẩm định cổng kiểm duyệt
                </h4>
                {isDecided ? (
                  <div className={`mt-2 flex items-center gap-2 rounded-lg border p-3 text-xs font-semibold ${selectedItem.status === 'REVOKED' ? 'border-status-error-border bg-status-error-bg text-status-error-text' : 'border-hairline border-l-4 border-l-status-success-text bg-card text-ink'}`}>
                    {selectedItem.status !== 'REVOKED' && (
                      <span className="material-symbols-outlined text-[18px] text-status-success-text" aria-hidden="true">verified</span>
                    )}
                    <span>
                      {selectedItem.status === 'REVOKED'
                        ? 'Phân công thẩm định này đã bị thu hồi. Quyền cập nhật đã đóng.'
                        : `Đợt thẩm định này đã ghi nhận kết luận chính thức (${selectedItem.latestDecision ? displayLabel(selectedItem.latestDecision) : 'Đã chốt'}). Quyền thẩm định đã đóng băng.`}
                    </span>
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-ink-muted">
                    Quyết định đạt cổng chỉ được kích hoạt khi <strong>toàn bộ minh chứng bắt buộc</strong> đã được xác minh đạt.
                  </p>
                )}

                <div className="mt-3">
                  <label className="block text-xs font-bold text-ink-soft">
                    Biên bản nhận xét &amp; Đánh giá chung của Hội đồng / Giảng viên thẩm định *
                  </label>
                  <textarea
                    rows={3}
                    value={reviewNotes}
                    disabled={isDecided}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder={isDecided ? 'Đợt thẩm định đã hoàn tất quyết định.' : 'Nhập chi tiết đánh giá, căn cứ quyết định, các điểm cần nhóm lưu ý...'}
                    className="mt-1 w-full rounded-lg border border-hairline bg-card p-2.5 text-xs text-ink focus:border-primary focus:outline-hidden disabled:bg-canvas disabled:text-ink-muted"
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-ink-muted">
                    {isDecided ? (
                      <span className="font-semibold text-status-success-text">
                        {selectedItem.status === 'REVOKED' ? 'Phân công đã thu hồi.' : 'Đã hoàn tất phiên thẩm định.'}
                      </span>
                    ) : !allMandatoryAccepted ? (
                      <span id="pass-eligibility-reason" className="inline-flex items-center gap-1.5 font-semibold text-status-error-text">
                        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">error_outline</span>
                        Chưa đủ điều kiện đạt cổng: Còn {mandatoryReqs.length - acceptedMandatoryCount} minh chứng bắt buộc chưa duyệt đạt.
                      </span>
                    ) : (
                      <span id="pass-eligibility-reason" className="inline-flex items-center gap-1.5 font-semibold text-status-success-text">
                        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">check_circle</span>
                        Đủ điều kiện phê duyệt đạt cổng cho đợt thẩm định này.
                      </span>
                    )}
                  </div>

                  <div className="review-gate-decisions flex min-w-0 max-w-full flex-wrap items-center gap-2.5">
                    <Button
                      variant="danger"
                      disabled={busy || loading || isDecided}
                      onClick={() => handleDecision('REVISION_REQUIRED')}
                    >
                      Yêu cầu nhóm chỉnh sửa
                    </Button>
                    <Button
                      variant="primary"
                      disabled={!allMandatoryAccepted || busy || loading || isDecided}
                      aria-describedby="pass-eligibility-reason"
                      onClick={() => handleDecision('PASSED')}
                      title={isDecided ? 'Đợt thẩm định đã hoàn tất' : !allMandatoryAccepted ? 'Cần duyệt đạt toàn bộ minh chứng bắt buộc trước' : undefined}
                    >
                      {busy ? 'Đang lưu...' : 'Xác nhận đạt cổng kiểm duyệt'}
                    </Button>
                  </div>
                </div>
              </div>
              {Number.isInteger(Number(selectedItem.id)) && Number(selectedItem.id) > 0 && (
                <div className="mt-4">
                  <GateScriptAiPanel key={selectedItem.id} gateInstanceId={Number(selectedItem.id)} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Exact Artifact Version Preview Modal */}
      {previewingArtifact && (
        <Modal
          open
          title="Chi tiết thông tin minh chứng"
          description="Xem thông tin chi tiết phiên bản tệp đã nộp"
          onClose={() => setPreviewingArtifact(null)}
        >
          <div className="space-y-3 text-xs">
            <div className="rounded-lg border border-hairline bg-canvas p-3 space-y-2">
              <div className="flex min-w-0 justify-between gap-3">
                <span className="shrink-0 text-ink-muted">{isLinkArtifact(previewingArtifact) ? 'Liên kết ngoài:' : 'Tên tệp:'}</span>
                <span className="min-w-0 break-all font-bold text-ink" title={previewingArtifact.linkUrl ?? previewingArtifact.filename}>{evidenceArtifactLabel(previewingArtifact)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Phiên bản thẩm định:</span>
                <span className="rounded-md bg-primary-subtle px-2 py-0.5 font-bold text-primary">v{previewingArtifact.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Người nộp:</span>
                <span className="font-semibold text-ink-soft">{formatSubmitter(previewingArtifact.submittedByName, previewingArtifact.submittedBy)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Thời gian nộp:</span>
                <span className="font-semibold text-ink-soft">{dateTimeLabel(previewingArtifact.submittedAt)}</span>
              </div>
              {previewingArtifact.notes && (
                <div className="border-t border-hairline/60 pt-2">
                  <span className="text-ink-muted block mb-0.5">Ghi chú nộp bài:</span>
                  <p className="italic text-ink-soft">"{previewingArtifact.notes}"</p>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary-subtle p-3 text-primary">
              <p className="font-semibold text-xs">
                {isLinkArtifact(previewingArtifact) ? 'Minh chứng dạng liên kết:' : 'Chế độ bảo mật lưu trữ:'}
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                {isLinkArtifact(previewingArtifact)
                  ? 'Minh chứng được mở ngoài hệ thống. Quyền truy cập nội dung do dịch vụ đích quản lý; không có tệp để tải từ hệ thống.'
                  : 'Tệp được tải xuống qua kết nối có xác thực. Hệ thống kiểm tra quyền truy cập và cung cấp đúng phiên bản đã nộp.'}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={() => setPreviewingArtifact(null)}>Đóng</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
