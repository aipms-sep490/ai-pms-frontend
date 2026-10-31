import { useState } from 'react'
import type { AssignedReviewItem } from '../types/review-gates.types'
import { Button } from '../../../components/ui/Button'
import { HttpError } from '../../../services/http/http-client'
import { env } from '../../../app/config/env'
import { EvidenceDownloadButton } from './EvidenceDownloadButton'
import { evidenceArtifactLabel, isLinkArtifact } from '../utils/evidence-link'
import { dateTimeLabel } from '../../execution/execution-utils'

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
  const [previewingArtifact, setPreviewingArtifact] = useState<{
    filename: string
    version: number
    submittedBy: string
    submittedAt: string
    notes?: string | null
    linkUrl?: string | null
    contentType?: string
  } | null>(null)

  const selectedItem = assignments.find((a) => a.id === selectedId) || assignments[0]
  const reviewNotes = notesByAssignment[selectedItem?.id || ''] || ''
  const setReviewNotes = (value: string) => setNotesByAssignment(prev => ({ ...prev, [selectedItem.id]: value }))

  if (!selectedItem) {
    return (
      <div className="rounded-xl border border-hairline bg-card p-12 text-center text-ink-muted">
        <span className="material-symbols-outlined text-4xl text-slate-400">task_alt</span>
        <h3 className="mt-2 text-base font-bold text-ink">Không có đợt thẩm định nào được phân công</h3>
        <p className="mt-1 text-xs">Hiện tại bạn đã hoàn tất mọi nhiệm vụ review hoặc chưa có đợt phân công mới.</p>
      </div>
    )
  }

  const mandatoryReqs = selectedItem.requirements.filter((r) => r.isMandatory)
  const acceptedMandatoryCount = mandatoryReqs.filter((r) => r.verificationStatus === 'ACCEPTED').length
  const allMandatoryAccepted = acceptedMandatoryCount === mandatoryReqs.length
  const isDecided = selectedItem.status === 'DECIDED' || selectedItem.status === 'REVOKED'

  const handleVerify = async (requirementId: string, decision: 'ACCEPTED' | 'REJECTED') => {
    try {
      setBusy(true)
      setActionError(null)
      setSuccessMsg(null)
      const feedback = feedbackInput[`${selectedItem.id}:${requirementId}`]?.trim()
      await onVerifyEvidence(selectedItem.id, requirementId, decision, feedback, selectedItem.concurrencyToken)
      setSuccessMsg(`Đã cập nhật trạng thái minh chứng thành ${decision === 'ACCEPTED' ? 'Chấp thuận' : 'Yêu cầu nộp lại'}.`)
    } catch (err) {
      setConflict(err instanceof HttpError ? err.status === 409 : env.reviewGatesMockEnabled && err instanceof Error && err.message.includes('409'))
      setActionError(err instanceof Error ? err.message : 'Lỗi khi xác minh minh chứng.')
    } finally {
      setBusy(false)
    }
  }

  const handleDecision = async (decision: 'PASSED' | 'REVISION_REQUIRED') => {
    if (!reviewNotes.trim()) {
      setActionError('Bắt buộc nhập nhận xét / lý do thẩm định trước khi lưu kết quả.')
      return
    }

    try {
      setBusy(true)
      setActionError(null)
      setSuccessMsg(null)
      await onSubmitDecision(selectedItem.id, decision, reviewNotes.trim(), selectedItem.concurrencyToken)
      setSuccessMsg(`Đã lưu quyết định thẩm định Gate thành công: ${decision === 'PASSED' ? 'ĐẠT (PASSED)' : 'CẦN CHỈNH SỬA'}.`)
      setReviewNotes('')
    } catch (err) {
      setConflict(err instanceof HttpError ? err.status === 409 : env.reviewGatesMockEnabled && err instanceof Error && err.message.includes('409'))
      setActionError(err instanceof Error ? err.message : 'Lỗi khi ra quyết định thẩm định.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left Column: Assigned Queue */}
      <div className="space-y-3 lg:col-span-4">
        <div className="rounded-xl border border-hairline bg-card p-4 shadow-xs">
          <h3 className="border-b border-slate-100 pb-2.5 text-sm font-bold text-ink">
            Hàng đợi Thẩm định ({assignments.length})
          </h3>
          <div className="mt-3 space-y-2.5">
            {assignments.map((item) => {
              const isSelected = item.id === selectedId
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
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">
                      {item.gateCode}
                    </span>
                    <span className="text-xs font-semibold text-ink-muted">Scope: {item.scope}</span>
                  </div>
                  <h4 className="mt-2 text-xs font-bold text-ink">{item.projectName}</h4>
                  <p className="text-xs text-ink-muted">{item.projectCode}</p>
                  <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                    <span className="text-slate-400">Hạn: {dateTimeLabel(item.dueAt)}</span>
                    <span
                      className={`font-bold ${
                        item.status === 'DECIDED'
                          ? 'text-status-success-text'
                          : item.status === 'IN_REVIEW'
                          ? 'text-status-info-text'
                          : 'text-[var(--color-status-warning-text)] font-bold'
                      }`}
                    >
                      {item.status === 'DECIDED' ? '✓ Đã quyết định' : 'Chờ xử lý'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Right Column: Review Details & Decision */}
      <div className="space-y-4 lg:col-span-8">
        <div className="rounded-xl border border-hairline bg-card p-5 shadow-xs space-y-5">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-primary px-2.5 py-0.5 text-xs font-bold text-white">
                  {selectedItem.gateCode}
                </span>
                <h3 className="text-base font-bold text-ink">{selectedItem.projectName}</h3>
                <span className="max-w-full break-all rounded-full bg-canvas px-2.5 py-0.5 text-xs font-semibold text-ink-muted border border-hairline">
                  {selectedItem.projectCode}
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                Đợt thẩm định: <strong className="text-ink-soft">{selectedItem.gateTitle}</strong> · Phạm vi chuyên môn: <strong className="text-primary">{selectedItem.scope}</strong>
              </p>
            </div>
            <div className="text-left text-xs text-ink-muted sm:text-right">
              <div>Thời hạn chấm: <strong>{dateTimeLabel(selectedItem.dueAt)}</strong></div>
              <div>Trạng thái: <strong className="text-ink">{selectedItem.status}</strong></div>
            </div>
          </div>

          {/* Feedback & Error alerts */}
          {actionError && (
            conflict ? (
              <div role="alert" className="rounded-lg border border-warning-strong bg-status-warning-bg p-4 text-xs text-status-warning-text space-y-2">
                <div className="flex items-center gap-2 font-bold text-status-warning-text">
                  <span className="material-symbols-outlined text-base">warning</span>
                  <span>Xung đột dữ liệu (HTTP 409 Conflict)</span>
                </div>
                <p>
                  Hồ sơ đợt thẩm định này đã có thay đổi mới từ người dùng khác hoặc token phiên làm việc đã cũ.
                  Nội dung nhận xét bạn đang soạn thảo bên dưới <strong>vẫn được giữ nguyên</strong>.
                </p>
                {onReload && (
                  <button
                    type="button"
                    onClick={async () => {
                      setActionError(null)
                      await onReload()
                    }}
                    className="rounded-lg bg-warning-strong px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-warning-strong"
                  >
                    Tải lại dữ liệu mới nhất
                  </button>
                )}
              </div>
            ) : (
              <div role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-xs font-semibold text-danger-text">
                ✕ {actionError}
              </div>
            )
          )}
          {successMsg && (
            <div role="status" className="rounded-lg border border-status-success-border bg-status-success-bg p-3 text-xs font-semibold text-status-success-text">
              ✓ {successMsg}
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
                        ? 'border-status-success-border bg-status-success-bg'
                        : isRejected
                        ? 'border-status-error-border bg-status-error-bg/30'
                        : 'border-hairline bg-canvas/50'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold text-ink">{req.title}</strong>
                        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-xs text-ink-soft font-medium">{req.type}</span>
                        {req.isMandatory && (
                          <span className="rounded bg-status-error-bg px-1.5 py-0.5 text-xs font-bold text-danger-text">Bắt buộc</span>
                        )}
                      </div>
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-bold border ${
                          isAccepted
                            ? 'bg-status-success-bg text-status-success-text border-status-success-border'
                            : isRejected
                            ? 'bg-status-error-bg text-danger-text border-status-error-border'
                            : 'bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)] border-[var(--color-status-warning-border)] border-l-2 border-l-[var(--color-accent-amber)]'
                        }`}
                      >
                        {req.verificationStatus === 'ACCEPTED'
                          ? '✓ ĐÃ DUYỆT'
                          : req.verificationStatus === 'REJECTED'
                          ? '✕ TỪ CHỐI'
                          : '◷ ĐÃ NỘP (CHỜ XÁC MINH)'}
                      </span>
                    </div>

                    {/* Submitted artifact details */}
                    {req.latestArtifact ? (
                      <div className="mt-2.5 rounded-md border border-hairline bg-card p-2.5 text-ink-soft">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-ink inline-flex items-center gap-1.5">
                            <span>{isLinkArtifact(req.latestArtifact) ? 'Liên kết minh chứng:' : 'Tệp minh chứng:'}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewingArtifact(req.latestArtifact!)
                              }
                              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline cursor-pointer"
                              title="Xem chi tiết siêu dữ liệu phiên bản minh chứng"
                            >
                              <span className="material-symbols-outlined text-xs" aria-hidden="true">visibility</span>
                              <span className="break-all" title={req.latestArtifact.linkUrl ?? req.latestArtifact.filename}>{evidenceArtifactLabel(req.latestArtifact)}</span>
                            </button>
                          </span>
                          <span className="rounded-full bg-canvas px-2 py-0.5 text-xs font-semibold text-ink-muted">
                            Phiên bản v{req.latestArtifact.version}
                          </span>
                        </div>
                        <div className="mt-1 text-slate-400">
                          Nộp bởi {req.latestArtifact.submittedBy} lúc {dateTimeLabel(req.latestArtifact.submittedAt)}
                        </div>
                        {req.latestArtifact.notes && (
                          <div className="mt-1 text-ink-muted italic">
                            Giải trình: "{req.latestArtifact.notes}"
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 text-slate-400 italic">Sinh viên chưa nộp minh chứng cho yêu cầu này.</div>
                    )}
                    <EvidenceDownloadButton projectId={selectedItem.projectId} gateCode={selectedItem.gateCode} requirement={req} />

                    {/* Reviewer Feedback & Actions */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-hairline/70 pt-2.5">
                      <input
                        type="text"
                        placeholder="Nhận xét cụ thể cho minh chứng này (tùy chọn)..."
                        value={feedbackInput[`${selectedItem.id}:${req.id}`] ?? req.reviewerFeedback ?? ''}
                        onChange={(e) =>
                          setFeedbackInput((prev) => ({ ...prev, [`${selectedItem.id}:${req.id}`]: e.target.value }))
                        }
                        className="flex-1 rounded-md border border-hairline px-2.5 py-1 text-xs text-ink focus:border-primary focus:outline-hidden"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy || loading || isDecided || !req.latestArtifact}
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
              Quyết định Thẩm định Review Gate (Toàn diện)
            </h4>
            {isDecided ? (
              <div className="mt-2 rounded-lg border border-status-success-border bg-status-success-bg p-3 text-xs font-semibold text-status-success-text">
                ✓ Đợt thẩm định này đã ghi nhận kết luận chính thức ({selectedItem.latestDecision || 'ĐÃ CHỐT'}). Quyền thẩm định đã đóng băng.
              </div>
            ) : (
              <p className="mt-1 text-xs text-ink-muted">
                Quyết định Gate PASS chỉ được kích hoạt khi <strong>toàn bộ minh chứng bắt buộc</strong> đã được xác minh ĐẠT (ACCEPTED).
              </p>
            )}

            <div className="mt-3">
              <label className="block text-xs font-bold text-ink-soft">
                Biên bản nhận xét & Đánh giá chung của Hội đồng / Giảng viên thẩm định *
              </label>
              <textarea
                rows={3}
                value={reviewNotes}
                disabled={isDecided}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={isDecided ? 'Đợt thẩm định đã hoàn tất quyết định.' : 'Nhập chi tiết đánh giá, căn cứ quyết định, các điểm cần nhóm lưu ý...'}
                className="mt-1 w-full rounded-lg border border-hairline p-2.5 text-xs text-ink focus:border-primary focus:outline-hidden disabled:bg-canvas disabled:text-ink-muted"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-ink-muted">
                {isDecided ? (
                  <span className="font-semibold text-status-success-text">
                    ✓ Đã hoàn tất phiên thẩm định.
                  </span>
                ) : !allMandatoryAccepted ? (
                  <span id="pass-eligibility-reason" className="font-semibold text-danger-text">
                    ⚠️ Chưa đủ điều kiện PASS: Còn {mandatoryReqs.length - acceptedMandatoryCount} minh chứng bắt buộc chưa duyệt đạt.
                  </span>
                ) : (
                  <span id="pass-eligibility-reason" className="font-semibold text-status-success-text">
                    ✓ Đủ điều kiện phê duyệt PASS đợt thẩm định này.
                  </span>
                )}
              </div>

              <div className="review-gate-decisions flex min-w-0 max-w-full flex-wrap items-center gap-2.5">
                <Button
                  variant="danger"
                  disabled={busy || loading || isDecided}
                  onClick={() => handleDecision('REVISION_REQUIRED')}
                >
                  Yêu cầu nhóm chỉnh sửa (Revision Required)
                </Button>
                <Button
                  variant="primary"
                  disabled={!allMandatoryAccepted || busy || loading || isDecided}
                  aria-describedby="pass-eligibility-reason"
                  onClick={() => handleDecision('PASSED')}
                  title={isDecided ? 'Đợt thẩm định đã hoàn tất' : !allMandatoryAccepted ? 'Cần duyệt đạt toàn bộ minh chứng bắt buộc trước' : undefined}
                >
                  {busy ? 'Đang lưu...' : 'Xác nhận Gate PASS (Đạt)'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Exact Artifact Version Preview Modal */}
      {previewingArtifact && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Chi tiết siêu dữ liệu minh chứng"
        >
          <div className="max-h-[calc(100dvh-2rem)] w-full min-w-0 max-w-lg overflow-y-auto rounded-xl border border-hairline bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-primary">description</span>
                <div>
                  <h3 className="text-sm font-bold text-ink">Chi tiết Siêu dữ liệu Minh chứng (Metadata Preview)</h3>
                  <p className="text-xs text-ink-muted">Xem trước thông tin siêu dữ liệu phiên bản (không phải trình đọc tệp nội dung)</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Đóng chi tiết minh chứng"
                onClick={() => setPreviewingArtifact(null)}
                className="min-h-11 min-w-11 shrink-0 text-ink-muted hover:text-ink text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-lg border border-slate-100 bg-canvas p-3 space-y-1.5">
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
                  <span className="font-semibold text-ink-soft">{previewingArtifact.submittedBy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Thời gian nộp:</span>
                  <span className="font-semibold text-ink-soft">{previewingArtifact.submittedAt}</span>
                </div>
                {previewingArtifact.notes && (
                  <div className="border-t border-hairline/60 pt-1.5">
                    <span className="text-ink-muted block mb-0.5">Ghi chú nộp bài:</span>
                    <p className="italic text-ink-soft">"{previewingArtifact.notes}"</p>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-status-info-border bg-status-info-bg p-3 text-status-info-text">
                <p className="font-semibold text-xs">
                  {isLinkArtifact(previewingArtifact) ? 'Minh chứng dạng liên kết:' : 'Chế độ bảo mật lưu trữ:'}
                </p>
                <p className="mt-1 text-xs text-status-info-text">
                  {isLinkArtifact(previewingArtifact)
                    ? 'Minh chứng được mở ngoài hệ thống. Quyền truy cập nội dung do dịch vụ đích quản lý; không có tệp để tải từ hệ thống.'
                    : 'Tải tệp qua API có xác thực. Hệ thống kiểm tra quyền trên từng request và phục vụ đúng phiên bản được yêu cầu.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPreviewingArtifact(null)}
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
