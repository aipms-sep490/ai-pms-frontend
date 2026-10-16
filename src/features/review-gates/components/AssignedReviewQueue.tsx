import { useState } from 'react'
import type { AssignedReviewItem } from '../types/review-gates.types'
import { Button } from '../../../components/ui/Button'

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
}

export function AssignedReviewQueue({
  assignments,
  onVerifyEvidence,
  onSubmitDecision,
}: AssignedReviewQueueProps) {
  const [selectedId, setSelectedId] = useState(assignments[0]?.id || '')
  const [reviewNotes, setReviewNotes] = useState('')
  const [feedbackInput, setFeedbackInput] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const selectedItem = assignments.find((a) => a.id === selectedId) || assignments[0]

  if (!selectedItem) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">
        <span className="material-symbols-outlined text-4xl text-slate-400">task_alt</span>
        <h3 className="mt-2 text-base font-bold text-slate-800">Không có đợt thẩm định nào được phân công</h3>
        <p className="mt-1 text-xs">Hiện tại bạn đã hoàn tất mọi nhiệm vụ review hoặc chưa có đợt phân công mới.</p>
      </div>
    )
  }

  const mandatoryReqs = selectedItem.requirements.filter((r) => r.isMandatory)
  const acceptedMandatoryCount = mandatoryReqs.filter((r) => r.verificationStatus === 'ACCEPTED').length
  const allMandatoryAccepted = acceptedMandatoryCount === mandatoryReqs.length

  const handleVerify = async (requirementId: string, decision: 'ACCEPTED' | 'REJECTED') => {
    try {
      setBusy(true)
      setActionError(null)
      setSuccessMsg(null)
      const feedback = feedbackInput[requirementId]?.trim()
      await onVerifyEvidence(selectedItem.id, requirementId, decision, feedback, selectedItem.concurrencyToken)
      setSuccessMsg(`Đã cập nhật trạng thái minh chứng thành ${decision === 'ACCEPTED' ? 'Chấp thuận' : 'Yêu cầu nộp lại'}.`)
    } catch (err) {
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
      setActionError(err instanceof Error ? err.message : 'Lỗi khi ra quyết định thẩm định.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left Column: Assigned Queue */}
      <div className="space-y-3 lg:col-span-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <h3 className="border-b border-slate-100 pb-2.5 text-sm font-bold text-slate-800">
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
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">
                      {item.gateCode}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">Scope: {item.scope}</span>
                  </div>
                  <h4 className="mt-2 text-xs font-bold text-slate-900">{item.projectName}</h4>
                  <p className="text-xs text-slate-500">{item.projectCode}</p>
                  <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                    <span className="text-slate-400">Hạn: {item.dueAt}</span>
                    <span
                      className={`font-bold ${
                        item.status === 'DECIDED'
                          ? 'text-emerald-600'
                          : item.status === 'IN_REVIEW'
                          ? 'text-blue-600'
                          : 'text-amber-600'
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
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-5">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-primary px-2.5 py-0.5 text-xs font-bold text-white">
                  {selectedItem.gateCode}
                </span>
                <h3 className="text-base font-bold text-slate-900">{selectedItem.projectName}</h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
                  {selectedItem.projectCode}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Đợt thẩm định: <strong className="text-slate-700">{selectedItem.gateTitle}</strong> · Phạm vi chuyên môn: <strong className="text-primary">{selectedItem.scope}</strong>
              </p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <div>Thời hạn chấm: <strong>{selectedItem.dueAt}</strong></div>
              <div>Trạng thái: <strong className="text-slate-800">{selectedItem.status}</strong></div>
            </div>
          </div>

          {/* Feedback & Error alerts */}
          {actionError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              ✕ {actionError}
            </div>
          )}
          {successMsg && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
              ✓ {successMsg}
            </div>
          )}

          {/* Requirements Checklist */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Minh chứng cần xác minh ({selectedItem.requirements.length})
              </h4>
              <span className="text-xs font-semibold text-slate-500">
                Đã duyệt: <strong className="text-emerald-600">{acceptedMandatoryCount}</strong> / {mandatoryReqs.length} bắt buộc
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
                        ? 'border-emerald-200 bg-emerald-50/30'
                        : isRejected
                        ? 'border-rose-200 bg-rose-50/30'
                        : 'border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold text-slate-900">{req.title}</strong>
                        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-700 font-medium">{req.type}</span>
                        {req.isMandatory && (
                          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-xs font-bold text-rose-700">Bắt buộc</span>
                        )}
                      </div>
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-bold border ${
                          isAccepted
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isRejected
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
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
                      <div className="mt-2.5 rounded-md border border-slate-200 bg-white p-2.5 text-slate-700">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900">
                            Tệp minh chứng: <a href="#preview" className="text-primary hover:underline">{req.latestArtifact.filename}</a>
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                            Phiên bản v{req.latestArtifact.version}
                          </span>
                        </div>
                        <div className="mt-1 text-slate-400">
                          Nộp bởi {req.latestArtifact.submittedBy} lúc {req.latestArtifact.submittedAt}
                        </div>
                        {req.latestArtifact.notes && (
                          <div className="mt-1 text-slate-600 italic">
                            Giải trình: "{req.latestArtifact.notes}"
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 text-slate-400 italic">Sinh viên chưa nộp minh chứng cho yêu cầu này.</div>
                    )}

                    {/* Reviewer Feedback & Actions */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/70 pt-2.5">
                      <input
                        type="text"
                        placeholder="Nhận xét cụ thể cho minh chứng này (tùy chọn)..."
                        value={feedbackInput[req.id] || req.reviewerFeedback || ''}
                        onChange={(e) =>
                          setFeedbackInput((prev) => ({ ...prev, [req.id]: e.target.value }))
                        }
                        className="flex-1 rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-900 focus:border-primary focus:outline-hidden"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => handleVerify(req.id, 'ACCEPTED')}
                      >
                        ✓ Duyệt đạt
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busy}
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
          <div className="border-t border-slate-200 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Quyết định Thẩm định Review Gate (Toàn diện)
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              Quyết định Gate PASS chỉ được kích hoạt khi <strong>toàn bộ minh chứng bắt buộc</strong> đã được xác minh ĐẠT (ACCEPTED).
            </p>

            <div className="mt-3">
              <label className="block text-xs font-bold text-slate-700">
                Biên bản nhận xét & Đánh giá chung của Hội đồng / Giảng viên thẩm định *
              </label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Nhập chi tiết đánh giá, căn cứ quyết định, các điểm cần nhóm lưu ý..."
                className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-primary focus:outline-hidden"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                {!allMandatoryAccepted ? (
                  <span className="font-semibold text-rose-600">
                    ⚠️ Chưa đủ điều kiện PASS: Còn {mandatoryReqs.length - acceptedMandatoryCount} minh chứng bắt buộc chưa duyệt đạt.
                  </span>
                ) : (
                  <span className="font-semibold text-emerald-600">
                    ✓ Đủ điều kiện phê duyệt PASS đợt thẩm định này.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <Button
                  variant="danger"
                  disabled={busy}
                  onClick={() => handleDecision('REVISION_REQUIRED')}
                >
                  Yêu cầu nhóm chỉnh sửa (Revision Required)
                </Button>
                <Button
                  variant="primary"
                  disabled={!allMandatoryAccepted || busy}
                  onClick={() => handleDecision('PASSED')}
                  title={!allMandatoryAccepted ? 'Cần duyệt đạt toàn bộ minh chứng bắt buộc trước' : undefined}
                >
                  {busy ? 'Đang lưu...' : 'Xác nhận Gate PASS (Đạt)'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
