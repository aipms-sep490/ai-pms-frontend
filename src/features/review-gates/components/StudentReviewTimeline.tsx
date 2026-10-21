import { useState } from 'react'
import type { DefenseReadinessSummary, StudentGateRequirement, StudentReviewTimelineDto } from '../types/review-gates.types'
import { ReviewSubmissionModal, type ReviewSubmissionPayload } from './ReviewSubmissionModal'
import { EvidenceDownloadButton } from './EvidenceDownloadButton'
import { DefenseReadinessChecker } from './DefenseReadinessChecker'
import { Modal } from '../../../components/ui/Modal'
import { env } from '../../../app/config/env'

interface StudentReviewTimelineProps {
  timeline: StudentReviewTimelineDto
  isLeader: boolean
  isAuthenticated?: boolean
  onToggleRole?: () => void
  onSubmitRevision: (gateCode: string, requirementId: string, payload: ReviewSubmissionPayload) => Promise<void>
  onSubmitForReview?: (gateCode: string) => Promise<void>
  readiness?: DefenseReadinessSummary | null
  onReload?: () => Promise<void>
}

export function StudentReviewTimeline({
  timeline,
  isLeader,
  isAuthenticated = true,
  onToggleRole,
  onSubmitRevision,
  onSubmitForReview,
  readiness,
  onReload,
}: StudentReviewTimelineProps) {
  const [selectedGateCode, setSelectedGateCode] = useState(timeline.currentGateCode || timeline.gates[0]?.code)
  const [activeReqForSubmission, setActiveReqForSubmission] = useState<StudentGateRequirement | null>(null)
  const [showDefenseModal, setShowDefenseModal] = useState(false)
  const [submittingGate, setSubmittingGate] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const selectedGate = timeline.gates.find((g) => g.code === selectedGateCode) || timeline.gates[0]
  const submissionRequirement = selectedGate?.requirements.find(req => req.id === activeReqForSubmission?.id) ?? null
  const completedGatesCount = timeline.gates.filter((g) => g.status === 'PASSED').length
  const totalGatesCount = timeline.gates.length
  // Server-authoritative values (no client calculation or fallback heuristics)
  const academicProgress = timeline.academicProgress
  const isDefenseReady = readiness?.isReady ?? timeline.isDefenseReady
  const canSubmitSelectedGate = Boolean(isAuthenticated && isLeader && selectedGate
    && selectedGate.code === timeline.currentGateCode && selectedGate.status !== 'LOCKED' && selectedGate.status !== 'PASSED'
    && (selectedGate.status === 'REVISION_REQUIRED' ? timeline.capabilities.canSubmitRevision : timeline.capabilities.canSubmitPackage))

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASSED':
        return <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">✓ ĐÃ ĐẠT (PASSED)</span>
      case 'REVISION_REQUIRED':
        return <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 border border-rose-200">! CẦN CHỈNH SỬA</span>
      case 'IN_REVIEW':
        return <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">◷ ĐANG THẨM ĐỊNH</span>
      case 'PLANNED':
        return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">KẾ HOẠCH</span>
      default:
        return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{status}</span>
    }
  }

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">✓ Chấp thuận</span>
      case 'REJECTED':
        return <span className="rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">✕ Cần nộp lại</span>
      case 'SUBMITTED':
        return <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">◷ Đã nộp (chờ duyệt)</span>
      default:
        return <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Chưa nộp</span>
    }
  }

  return (
    <div className="review-gates-surface min-w-0 space-y-6">
      {/* Project & Policy Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-900">{timeline.projectName}</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
              {timeline.projectCode}
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
              {env.reviewGatesMockEnabled ? `Chính sách: v${timeline.effectivePolicyVersion} (Đã ban hành)` : `Phiên bản cấu hình: ${timeline.effectivePolicyVersion}`}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Chế độ: <strong className="text-slate-700">{timeline.projectMode === 'SINGLE_MAJOR' ? 'Đơn ngành' : 'Liên ngành'}</strong> · Ngành: {timeline.major} · Đang xét duyệt: <strong className="text-primary">{selectedGate?.code}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
            Vai trò hiện tại: <strong className={isLeader ? 'text-primary' : 'text-slate-800'}>{isLeader ? 'Trưởng nhóm (Leader)' : isAuthenticated ? 'Thành viên (Member)' : 'Chưa xác thực (Guest)'}</strong>
          </div>
          {onToggleRole && (
            <div className="flex items-center gap-1.5">
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-800 uppercase tracking-wider">
                Mô phỏng
              </span>
              <button
                type="button"
                onClick={onToggleRole}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-2xs hover:bg-slate-50 cursor-pointer"
                title="Đổi vai trò để kiểm thử quyền Leader vs Member (Chế độ mô phỏng)"
              >
                ⇄ Đổi vai trò kiểm thử
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Role Notice */}
      {!isAuthenticated ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
          <strong>Thông báo phân quyền:</strong> Chưa phát hiện phiên làm việc sinh viên hợp lệ. Quyền nộp hồ sơ, sửa đổi minh chứng và các thao tác thẩm định chỉ dành cho sinh viên thuộc nhóm đồ án.
        </div>
      ) : !isLeader ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
          <strong>Thông báo quyền hạn:</strong> Bạn đang xem với vai trò Thành viên (Student Member). Bạn có thể xem toàn bộ tiến trình, lịch sử nhận xét và minh chứng. Quyền nộp hồ sơ thẩm định chính thức và bản sửa đổi Gate thuộc về Trưởng nhóm.
        </div>
      ) : null}

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Academic Execution Progress */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-600">Tiến độ thực hiện học vụ</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">
              {academicProgress != null ? `${academicProgress}%` : timeline.academicProgressSource === 'NOT_CONFIGURED' ? 'Chưa áp dụng quy chế Cổng thẩm định' : 'Chưa có dữ liệu'}
            </span>
            <span className="text-xs text-slate-400">({completedGatesCount}/{totalGatesCount} Cổng đạt)</span>
          </div>
          {academicProgress != null && <div role="progressbar" aria-label="Tiến độ học vụ" aria-valuenow={academicProgress} aria-valuemin={0} aria-valuemax={100} className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all duration-300"
              style={{ width: `${academicProgress}%` }}
            />
          </div>}
          <p className="mt-1.5 text-xs text-slate-400">
            {timeline.academicProgressSource
              ? `Nguồn: ${timeline.academicProgressSource}`
              : 'Dữ liệu tiến độ học thuật chính thức do Hội đồng thẩm định phê duyệt.'}
          </p>
        </div>

        {/* KPI 2: Task Progress */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-600">Tiến độ công việc (Task Board)</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-700">
              {timeline.taskProgress != null ? `${timeline.taskProgress}%` : 'Chưa đồng bộ'}
            </span>
            <span className="text-xs text-blue-600 font-medium">Khác với tiến độ học vụ</span>
          </div>
          {timeline.taskProgress != null && <div role="progressbar" aria-label="Tiến độ công việc" aria-valuenow={timeline.taskProgress} aria-valuemin={0} aria-valuemax={100} className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${timeline.taskProgress}%` }}
            />
          </div>}
          <p className="mt-1.5 text-xs text-slate-400">
            {timeline.taskProgress != null
              ? 'Dữ liệu từ task board; hoàn thành task kỹ thuật không thay thế đạt cổng học vụ.'
              : 'Chưa kết nối dữ liệu Task Board.'}
          </p>
        </div>

        {/* KPI 3: Current Review Gate */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-600">Cổng thẩm định hiện tại</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-black text-slate-900">{selectedGate?.code}</span>
            <span className="text-xs font-semibold text-slate-600 truncate">{selectedGate?.title}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-600">Hạn chót thẩm định:</span>
            <span className="font-semibold text-slate-700">{selectedGate?.windowEnd || 'Theo kỳ'}</span>
          </div>
          <p className="mt-1.5 text-xs text-slate-400">Trạng thái: {selectedGate?.status}</p>
        </div>

        {/* KPI 4: Defense Readiness Advisory */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Đủ điều kiện bảo vệ (Advisory)</span>
            <button
              type="button"
              onClick={() => setShowDefenseModal(true)}
              className="text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              Chi tiết ↗
            </button>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`text-base font-black ${
                isDefenseReady === true
                  ? 'text-emerald-700'
                  : isDefenseReady === false
                  ? 'text-amber-700'
                  : 'text-slate-600'
              }`}
            >
              {timeline.defenseReadinessStatus ||
                (isDefenseReady === true
                  ? 'ĐỦ ĐIỀU KIỆN (DỰ KIẾN)'
                  : isDefenseReady === false
                  ? 'CHƯA ĐỦ ĐIỀU KIỆN'
                  : 'CHƯA ĐƯỢC ĐÁNH GIÁ')}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            {readiness && !readiness.isReady
              ? `Chưa đạt: ${readiness.conditions.filter(condition => condition.isMandatory && condition.satisfied !== true).map(condition => condition.title).join(', ') || 'Xem chi tiết điều kiện từ hệ thống.'}`
              : isDefenseReady === true
              ? 'Đã hoàn thành các cổng thẩm định tiên quyết.'
              : isDefenseReady === false
              ? `Còn ${totalGatesCount - completedGatesCount} cổng chưa hoàn tất thẩm định.`
              : 'Chưa có kết luận chính thức từ Hội đồng học thuật.'}
          </p>
          <p className="mt-1 text-xs text-slate-400 italic">Đánh giá tư vấn; không tự ý khóa cổng nộp cuối.</p>
        </div>
      </div>

      {/* Interdisciplinary Multi-branch Progress (F5) */}
      {timeline.projectMode === 'INTERDISCIPLINARY' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Tiến độ Các Phân nhánh Chuyên môn (Liên ngành)</h3>
              <p className="text-xs text-slate-600">Mỗi chuyên ngành có trọng số và cổng thẩm định độc lập theo quy chế.</p>
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
              Mô hình Tích hợp Đa ngành
            </span>
          </div>

          {timeline.disciplineProgress && timeline.disciplineProgress.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {timeline.disciplineProgress.map((branch) => (
                <div key={branch.scope}>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>{branch.name}</span>
                    <span>{branch.progress != null ? `${branch.progress}%` : 'Chưa có dữ liệu'}</span>
                  </div>
                  {branch.progress != null && <div role="progressbar" aria-label={`Tiến độ ${branch.name}`} aria-valuenow={branch.progress} aria-valuemin={0} aria-valuemax={100} className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                      style={{ width: `${branch.progress}%` }}
                    />
                  </div>}
                  {branch.weight != null && (
                    <span className="text-xs text-slate-400 mt-1 block">Trọng số: {branch.weight}%</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
              ℹ️ Đồ án liên ngành đang chờ Hội đồng công bố cấu trúc phân nhánh và trọng số chuyên môn theo snapshot kỳ học.
            </div>
          )}

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            ⚠️ <strong>Quy tắc Cổng Tích hợp:</strong> Cổng đánh giá tích hợp liên ngành chỉ được thông qua khi toàn bộ các ngành thành viên bắt buộc đều được phê duyệt ĐẠT.
          </div>
        </div>
      )}

      {/* Timeline Steps */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {timeline.gates.map((gate) => {
          const isSelected = gate.code === selectedGateCode
          return (
            <button
              key={gate.gateInstanceId}
              type="button"
              onClick={() => setSelectedGateCode(gate.code)}
              className={`rounded-xl border p-4 text-left transition-all duration-200 motion-reduce:transition-none ${
                isSelected
                  ? 'border-primary bg-primary-subtle/50 shadow-xs ring-1 ring-primary'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">{gate.code}</span>
                {getStatusBadge(gate.status)}
              </div>
              <h3 className="mt-2 text-sm font-bold text-slate-900">{gate.title}</h3>
              <p className="mt-1 text-xs text-slate-600 line-clamp-1">{gate.objective}</p>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-400">
                <span>{gate.windowStart || 'Chưa xác định'} → {gate.windowEnd || 'Chưa xác định'}</span>
                {gate.reviewEligibility === 'BLOCKED' && <span className="font-bold text-rose-500">{gate.status === 'REVISION_REQUIRED' ? 'Chờ bản sửa' : '🔒 Bị chặn'}</span>}
              </div>
            </button>
          )
        })}
      </div>

      {/* Selected Gate Details */}
      {selectedGate && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">
                  {selectedGate.code}
                </span>
                <h3 className="text-base font-bold text-slate-900">{selectedGate.title}</h3>
                {getStatusBadge(selectedGate.status)}
              </div>
              <p className="mt-1 text-xs text-slate-600">{selectedGate.objective}</p>
            </div>
            <div className="text-right text-xs text-slate-600">
              <div>Thời gian nộp: <strong>{selectedGate.windowStart || 'Chưa xác định'}</strong> đến <strong>{selectedGate.windowEnd || 'Chưa xác định'}</strong></div>
              <div>Điều kiện tham gia: <strong className={canSubmitSelectedGate ? 'text-emerald-700' : 'text-rose-600'}>{selectedGate.status === 'REVISION_REQUIRED' && canSubmitSelectedGate ? 'Được nộp bản sửa' : selectedGate.reviewEligibility === 'BLOCKED' ? 'Đang bị chặn' : 'Sẵn sàng'}</strong></div>
            </div>
          </div>

          {/* Blocker alert if any */}
          {selectedGate.blockingReasons.length > 0 && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
              <h4 className="font-bold">Lý do bị chặn / Yêu cầu khắc phục:</h4>
              <ul className="mt-1.5 list-disc pl-5 space-y-1">
                {selectedGate.blockingReasons.map((br, idx) => (
                  <li key={idx}>
                    {br.requirementCode && <strong>[{br.requirementCode}]: </strong>}
                    {br.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Requirements Checklist */}
          <div>
            <h4 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              Danh mục Minh chứng Học thuật ({selectedGate.requirements.length} yêu cầu)
            </h4>
            <p className="mb-2 text-xs text-slate-600 sm:hidden">Cuộn ngang để xem tệp và thao tác.</p>
            <div role="region" aria-label="Danh mục minh chứng, có thể cuộn ngang" tabIndex={0} className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                  <tr>
                    <th className="px-3.5 py-2.5">Yêu cầu minh chứng</th>
                    <th className="px-3 py-2.5">Loại & Phạm vi</th>
                    <th className="px-3 py-2.5">Bắt buộc</th>
                    <th className="px-3 py-2.5">Trạng thái thẩm định</th>
                    <th className="px-3.5 py-2.5">Phiên bản đã nộp</th>
                    <th className="px-3.5 py-2.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedGate.requirements.map((req) => {
                    return (
                      <tr key={req.id} className="hover:bg-slate-50/70">
                        <td className="px-3.5 py-3">
                          <strong className="block font-semibold text-slate-900">{req.title}</strong>
                          <span className="text-slate-400">{req.code}</span>
                          {req.reviewerFeedback && (
                            <p className="mt-1 text-rose-700 bg-rose-50/70 p-1.5 rounded-sm border border-rose-100">
                              <strong>Nhận xét:</strong> {req.reviewerFeedback}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                            {req.type}
                          </span>
                          <span className="ml-1 text-slate-400">({req.scope})</span>
                        </td>
                        <td className="px-3 py-3 font-semibold text-slate-700">
                          {req.isMandatory ? <span className="text-rose-600 font-bold">Bắt buộc</span> : 'Tùy chọn'}
                        </td>
                        <td className="px-3 py-3">
                          {getVerificationBadge(req.verificationStatus)}
                        </td>
                        <td className="px-3.5 py-3">
                          {req.latestArtifact ? (
                            <div>
                              <strong className="text-slate-800">v{req.latestArtifact.version}: {req.latestArtifact.filename}</strong>
                              <div className="text-slate-400">{req.latestArtifact.submittedAt} · {req.latestArtifact.submittedBy}</div>
                              {req.latestArtifact.notes && <div className="text-slate-600 italic mt-0.5">"{req.latestArtifact.notes}"</div>}
                              <EvidenceDownloadButton projectId={timeline.projectId} gateCode={selectedGate.code} requirement={req} />
                            </div>
                          ) : (
                            <span className="text-slate-400">Chưa có tệp</span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-right">
                          {req.verificationStatus === 'ACCEPTED' && selectedGate.status !== 'REVISION_REQUIRED' ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                              <span className="material-symbols-outlined text-sm" aria-hidden="true">check</span>
                              Đã chấp thuận
                            </span>
                          ) : isLeader ? (
                            (() => {
                              const isRevision = selectedGate.status === 'REVISION_REQUIRED' || req.verificationStatus === 'REJECTED'
                              const unsupportedLink = !env.reviewGatesMockEnabled && (req.type === 'EXTERNAL_LINK' || req.type === 'LINK')
                              const canSubmitThis = canSubmitSelectedGate && !unsupportedLink
                              const blockingReason = unsupportedLink ? 'Chưa hỗ trợ nộp liên kết qua API.' : timeline.capabilities?.blockingReasons?.[0]

                              if (!canSubmitThis) {
                                return (
                                  <div className="flex flex-col items-end gap-0.5">
                                    <button
                                      type="button"
                                      disabled
                                      aria-disabled="true"
                                      title={blockingReason || 'Hồ sơ hiện bị khóa nộp'}
                                      className="cursor-not-allowed rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-400"
                                    >
                                      {isRevision ? 'Nộp bản sửa' : req.latestArtifact ? 'Nộp lại' : 'Nộp tài liệu'}
                                    </button>
                                    <span className="max-w-[180px] truncate text-right text-xs text-rose-500 italic" title={blockingReason}>
                                      {blockingReason || 'Bị chặn nộp'}
                                    </span>
                                  </div>
                                )
                              }

                              return (
                                <button
                                  type="button"
                                  onClick={() => setActiveReqForSubmission(req)}
                                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all focus:outline-hidden focus:ring-2 focus:ring-offset-1 ${
                                    isRevision
                                      ? 'bg-rose-600 text-white shadow-xs hover:bg-rose-700 focus:ring-rose-500'
                                      : 'bg-primary text-white shadow-xs hover:bg-primary-hover focus:ring-primary'
                                  }`}
                                >
                                  {isRevision ? 'Nộp bản sửa' : req.latestArtifact ? 'Nộp lại' : 'Nộp tài liệu'}
                                </button>
                              )
                            })()
                          ) : (
                            <div className="flex flex-col items-end gap-0.5">
                              <button
                                type="button"
                                disabled
                                aria-disabled="true"
                                aria-describedby={`member-only-notice-${req.id}`}
                                className="cursor-not-allowed rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-400"
                              >
                                {req.verificationStatus === 'REJECTED' ? 'Nộp bản sửa' : req.latestArtifact ? 'Nộp lại' : 'Nộp tài liệu'}
                              </button>
                              <span id={`member-only-notice-${req.id}`} className="text-xs text-slate-400 italic">
                                {isAuthenticated ? 'Chỉ Trưởng nhóm' : 'Chưa đăng nhập'}
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {onSubmitForReview && (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <button type="button" disabled={!canSubmitSelectedGate || submittingGate || selectedGate.requirements.some(req => req.isMandatory && !req.latestArtifact)}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white disabled:bg-slate-200 disabled:text-slate-600"
                onClick={async () => {
                  setSubmittingGate(true); setSubmitError(null)
                  try { await onSubmitForReview(selectedGate.code) }
                  catch (err) { setSubmitError(err instanceof Error ? err.message : 'Không thể gửi hồ sơ thẩm định.') }
                  finally { setSubmittingGate(false) }
                }}>
                {submittingGate ? 'Đang gửi...' : 'Gửi hồ sơ thẩm định'}
              </button>
              {submitError && <p role="alert" className="text-xs text-rose-700">{submitError}</p>}
            </div>
          )}
        </div>
      )}

      {/* Submission Modal */}
      <ReviewSubmissionModal
        key={activeReqForSubmission?.id || 'closed'}
        open={Boolean(activeReqForSubmission)}
        onClose={() => setActiveReqForSubmission(null)}
        requirement={submissionRequirement}
        gateCode={selectedGate?.code || ''}
        isLeader={isLeader}
        canSubmit={canSubmitSelectedGate}
        blockingMessage={timeline.capabilities?.blockingReasons?.[0]}
        revisionRequired={selectedGate?.status === 'REVISION_REQUIRED'}
        onReload={onReload}
        onSubmit={async (payload) => {
          if (!activeReqForSubmission || !selectedGate) return
          await onSubmitRevision(selectedGate.code, activeReqForSubmission.id, payload)
        }}
      />

      {/* Advisory Defense Readiness Modal (DEF-01) */}
      {showDefenseModal && readiness ? (
        <Modal open onClose={() => setShowDefenseModal(false)} title="Điều kiện bảo vệ từ hệ thống">
          <DefenseReadinessChecker summary={readiness} />
        </Modal>
      ) : showDefenseModal && (
        <Modal open onClose={() => setShowDefenseModal(false)} title="Điều kiện bảo vệ từ hệ thống">
          <p className="text-sm text-slate-600">Chưa tải được kết luận điều kiện bảo vệ từ hệ thống. Vui lòng tải lại tiến trình.</p>
        </Modal>
      )}
    </div>
  )
}
