import { useState } from 'react'
import { Link } from 'react-router-dom'
import type {
  StudentGateInstance,
  StudentGateRequirement,
  StudentReviewTimelineDto,
} from '../../review-gates/types/review-gates.types'
import { ReviewSubmissionModal, type ReviewSubmissionPayload } from '../../review-gates/components/ReviewSubmissionModal'

export interface NextActionBannerProps {
  timeline: StudentReviewTimelineDto | null
  activeGate?: StudentGateInstance | null
  isLeader: boolean
  closestMilestone?: {
    id: number
    title: string
    dueDate?: string | null
    status: string
  } | null
  taskAttentionCount?: {
    overdue: number
    blocked: number
  }
  onSubmitRevision?: (
    gateCode: string,
    requirementId: string,
    payload: ReviewSubmissionPayload,
  ) => Promise<void>
}

export function NextActionBanner({
  timeline,
  activeGate,
  isLeader,
  closestMilestone,
  taskAttentionCount,
  onSubmitRevision,
}: NextActionBannerProps) {
  const [submissionReq, setSubmissionReq] = useState<StudentGateRequirement | null>(null)

  // Fallback when review gates have not been configured for the project
  if (!activeGate) {
    return (
      <section
        className="mb-6 rounded-xl border border-hairline bg-card p-5 shadow-xs"
        aria-label="Khối việc cần làm tiếp theo"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl" aria-hidden="true">
                task_alt
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Việc cần làm tiếp theo
              </span>
            </div>
            <h2 className="text-base font-bold text-ink">
              {closestMilestone ? `Mốc công việc: ${closestMilestone.title}` : 'Đồ án đang trong giai đoạn triển khai'}
            </h2>
            <p className="text-xs text-ink-muted">
              {closestMilestone?.dueDate
                ? `Hạn hoàn thành mốc tiếp theo: ${closestMilestone.dueDate}.`
                : 'Tiếp tục thực hiện các công việc kỹ thuật trên Task board.'}
              {taskAttentionCount && taskAttentionCount.overdue > 0 && (
                <span className="ml-1 font-semibold text-rose-600">
                  (Có {taskAttentionCount.overdue} việc quá hạn cần xử lý)
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/project/tasks"
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover focus:outline-hidden focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Xem bảng công việc
              <span className="material-symbols-outlined text-base" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </div>
      </section>
    )
  }

  // Gate-specific analysis
  const status = activeGate.status
  const isRevisionRequired = status === 'REVISION_REQUIRED'
  const isInReview = status === 'IN_REVIEW'
  const isPassed = status === 'PASSED'
  const isPlanned = status === 'PLANNED'

  const rejectedReqs = activeGate.requirements.filter((r) => r.verificationStatus === 'REJECTED')
  const pendingMandatoryReqs = activeGate.requirements.filter(
    (r) => r.isMandatory && r.verificationStatus === 'PENDING',
  )
  const submittedReqs = activeGate.requirements.filter((r) => r.verificationStatus === 'SUBMITTED')
  const acceptedReqs = activeGate.requirements.filter((r) => r.verificationStatus === 'ACCEPTED')

  // Theme styling based on gate status
  const cardBorderClass = isRevisionRequired
    ? 'border-[var(--color-status-warning-border)] bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)] border-l-4 border-l-[var(--color-accent-amber)]'
    : isInReview
    ? 'border-status-info-border bg-status-info-bg text-status-info-text'
    : isPassed
    ? 'border-status-success-border bg-status-success-bg text-status-success-text'
    : 'border-hairline bg-card text-ink'

  const badgeClass = isRevisionRequired
    ? 'border-[var(--color-status-warning-border)] bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)] border-l-2 border-l-[var(--color-accent-amber)]'
    : isInReview
    ? 'border-status-info-border bg-status-info-bg text-status-info-text'
    : isPassed
    ? 'border-status-success-border bg-status-success-bg text-status-success-text'
    : 'border-hairline bg-canvas text-ink-soft'

  const iconName = isRevisionRequired
    ? 'warning'
    : isInReview
    ? 'pending_actions'
    : isPassed
    ? 'check_circle'
    : 'flag'

  const statusLabel = isRevisionRequired
    ? 'YÊU CẦU CHỈNH SỬA MINH CHỨNG'
    : isInReview
    ? 'ĐANG TRONG PHIÊN THẨM ĐỊNH HỘI ĐỒNG'
    : isPassed
    ? 'ĐÃ ĐẠT CỔNG THẨM ĐỊNH'
    : isPlanned
    ? 'KẾ HOẠCH HỌC KỲ'
    : status

  // Responsible actor explanation
  const responsibleActorText = isRevisionRequired
    ? 'Trưởng nhóm sinh viên (Leader) nộp lại minh chứng bổ sung; thành viên hỗ trợ nội dung.'
    : isInReview
    ? 'Hội đồng thẩm định / Cán bộ phản biện đang chấm hồ sơ. Nhóm không cần thao tác thêm.'
    : isPassed
    ? 'Hệ thống / Bộ môn sẽ kích hoạt đợt thẩm định tiếp theo theo tiến độ học kỳ.'
    : 'Nhóm sinh viên thực hiện công việc và tải minh chứng theo hạn định.'

  return (
    <>
      <section
        className={`mb-6 rounded-xl border p-5 shadow-xs transition-all ${cardBorderClass}`}
        aria-label="Khối việc cần làm tiếp theo"
      >
        {/* Header: Eyebrow, Gate Info, Status Badge */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg" aria-hidden="true">
                {iconName}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                Việc cần làm tiếp theo · Next Action
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-md bg-slate-900 px-2.5 py-0.5 text-xs font-bold text-white">
                {activeGate.code}
              </span>
              <h2 className="text-base font-bold text-ink sm:text-lg">
                {activeGate.title}
              </h2>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${badgeClass}`}
              >
                <span className="material-symbols-outlined text-sm" aria-hidden="true">
                  {iconName}
                </span>
                {statusLabel}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-ink-soft">
              {activeGate.objective}
            </p>
          </div>

          <div className="text-right text-xs text-ink-muted sm:shrink-0">
            <div>
              Hạn cổng:{' '}
              <strong className="text-ink">
                {activeGate.windowEnd || 'Đang cập nhật'}
              </strong>
            </div>
            {closestMilestone?.dueDate && (
              <div className="mt-0.5 text-ink-muted">
                Mốc task: {closestMilestone.dueDate}
              </div>
            )}
          </div>
        </div>

        {/* Content Grid: Requirements Status & Action Context */}
        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-hairline/80 pt-4 lg:grid-cols-12">
          {/* Left: Requirements Detail */}
          <div className="space-y-2 lg:col-span-7">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              {isRevisionRequired
                ? 'Minh chứng cần chỉnh sửa & nộp lại'
                : 'Trạng thái minh chứng học thuật'}
            </h3>

            {isRevisionRequired && rejectedReqs.length > 0 ? (
              <div className="space-y-2">
                {rejectedReqs.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-lg border border-rose-200 bg-card p-3 shadow-2xs space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800">
                          {req.code}
                        </span>
                        <strong className="text-xs font-bold text-ink">
                          {req.title}
                        </strong>
                      </div>
                      {isLeader && onSubmitRevision && (
                        <button
                          type="button"
                          onClick={() => setSubmissionReq(req)}
                          className="inline-flex min-h-9 items-center gap-1 rounded-md bg-rose-600 px-3 py-1 text-xs font-bold text-white shadow-2xs hover:bg-rose-700 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:ring-offset-1"
                        >
                          <span className="material-symbols-outlined text-sm" aria-hidden="true">
                            upload_file
                          </span>
                          Nộp bản sửa đổi v{(req.latestArtifact?.version ?? 0) + 1}
                        </button>
                      )}
                    </div>
                    {req.reviewerFeedback && (
                      <p className="rounded-md bg-rose-50 p-2 text-xs text-rose-800 border border-rose-100">
                        <strong>Nhận xét từ Hội đồng:</strong> "{req.reviewerFeedback}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : isRevisionRequired ? (
              <p className="text-xs text-ink-muted">
                Hội đồng yêu cầu nhóm rà soát lại hồ sơ trước khi chốt kết quả đợt thẩm định.
              </p>
            ) : isInReview ? (
              <div className="rounded-lg border border-status-info-border bg-card p-3 text-xs text-status-info-text shadow-2xs space-y-1">
                <p>
                  <strong>{submittedReqs.length + acceptedReqs.length}/{activeGate.requirements.length} minh chứng</strong> đã được gửi lên hệ thống.
                </p>
                <p className="text-ink-muted">
                  Hội đồng đang thẩm định và sẽ phản hồi khi có kết luận chính thức.
                </p>
              </div>
            ) : isPassed ? (
              <div className="rounded-lg border border-status-success-border bg-card p-3 text-xs text-status-success-text shadow-2xs">
                ✓ Nhóm đã hoàn thành toàn bộ yêu cầu chất lượng của cổng {activeGate.code}. Điểm số và nhận xét đã được lưu vào hồ sơ đồ án.
              </div>
            ) : (
              <div className="rounded-lg border border-hairline bg-card p-3 text-xs text-ink-soft shadow-2xs space-y-1">
                <p>
                  Còn <strong>{pendingMandatoryReqs.length} minh chứng bắt buộc</strong> cần hoàn thiện trước ngày {activeGate.windowEnd}.
                </p>
                <p className="text-ink-muted">
                  Tổng số yêu cầu: {activeGate.requirements.length} mục (Bắt buộc: {activeGate.requirements.filter((r) => r.isMandatory).length}).
                </p>
              </div>
            )}
          </div>

          {/* Right: Coordination, Actor, Blockers */}
          <div className="space-y-3 rounded-lg border border-hairline bg-card/80 p-3.5 shadow-2xs lg:col-span-5">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Bên chịu trách nhiệm xử lý
              </span>
              <p className="mt-1 text-xs font-medium text-ink">
                {responsibleActorText}
              </p>
            </div>

            {/* Blocking reasons */}
            {activeGate.blockingReasons.length > 0 && (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
                <strong className="block font-bold">Rào cản học thuật (Blocking):</strong>
                <ul className="mt-1 list-disc pl-4 space-y-0.5">
                  {activeGate.blockingReasons.map((br, idx) => (
                    <li key={idx}>
                      {br.requirementCode ? `[${br.requirementCode}] ` : ''}
                      {br.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Technical task attention */}
            {taskAttentionCount && (taskAttentionCount.blocked > 0 || taskAttentionCount.overdue > 0) && (
              <div className="text-xs text-ink-muted">
                {taskAttentionCount.blocked > 0 && (
                  <span className="block font-semibold text-amber-700">
                    ⚠️ Có {taskAttentionCount.blocked} công việc bị vướng mắc (Blocked) trên bảng task.
                  </span>
                )}
                {taskAttentionCount.overdue > 0 && (
                  <span className="block text-ink-muted">
                    Có {taskAttentionCount.overdue} công việc đã quá hạn.
                  </span>
                )}
              </div>
            )}

            {/* Non-leader role clarity */}
            {!isLeader && isRevisionRequired && (
              <p className="text-xs text-ink-muted italic">
                * Bạn đang ở vai trò Thành viên (Member). Quyền nộp bản sửa đổi chính thức thuộc về Trưởng nhóm.
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-hairline/80 pt-3">
          <div className="text-xs text-ink-muted">
            {timeline?.projectMode === 'INTERDISCIPLINARY'
              ? 'Đồ án Liên ngành · Cần sự phối hợp đồng bộ giữa các chuyên ngành.'
              : 'Đồ án Đơn ngành · Theo dõi tiến độ theo chuẩn quy chế học vụ.'}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/project/timeline"
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-hairline bg-card px-3.5 py-2 text-xs font-bold text-ink-soft shadow-2xs hover:bg-canvas focus:outline-hidden focus:ring-2 focus:ring-slate-400 focus:ring-offset-1"
            >
              <span>Xem Dòng thời gian Cổng</span>
              <span className="material-symbols-outlined text-base" aria-hidden="true">
                open_in_new
              </span>
            </Link>

            {isRevisionRequired && isLeader && rejectedReqs[0] && onSubmitRevision && (
              <button
                type="button"
                onClick={() => setSubmissionReq(rejectedReqs[0])}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">
                  upload_file
                </span>
                <span>Nộp lại minh chứng ({rejectedReqs[0].code})</span>
              </button>
            )}

            {isRevisionRequired && !isLeader && (
              <div
                tabIndex={0}
                role="note"
                aria-label="Thông báo phân quyền"
                className="rounded-lg bg-canvas px-3 py-2 text-xs font-semibold text-ink-muted border border-hairline"
              >
                Trưởng nhóm nộp bản sửa đổi
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Direct Submission Modal triggered from Banner */}
      {submissionReq && (
        <ReviewSubmissionModal
          open={Boolean(submissionReq)}
          onClose={() => setSubmissionReq(null)}
          requirement={submissionReq}
          gateCode={activeGate.code}
          isLeader={isLeader}
          revisionRequired={activeGate.status === 'REVISION_REQUIRED'}
          canSubmit={isLeader && Boolean(timeline?.capabilities.canSubmitRevision)}
          onSubmit={async (payload) => {
            if (onSubmitRevision) {
              await onSubmitRevision(activeGate.code, submissionReq.id, payload)
            }
          }}
        />
      )}
    </>
  )
}
