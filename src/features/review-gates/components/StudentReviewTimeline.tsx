import { useState } from 'react'
import type { StudentGateRequirement, StudentReviewTimelineDto } from '../types/review-gates.types'
import { ReviewSubmissionModal } from './ReviewSubmissionModal'

interface StudentReviewTimelineProps {
  timeline: StudentReviewTimelineDto
  isLeader: boolean
  onToggleRole?: () => void
  onSubmitRevision: (gateCode: string, requirementId: string, artifactName: string, notes: string) => Promise<void>
}

export function StudentReviewTimeline({
  timeline,
  isLeader,
  onToggleRole,
  onSubmitRevision,
}: StudentReviewTimelineProps) {
  const [selectedGateCode, setSelectedGateCode] = useState(timeline.currentGateCode || timeline.gates[0]?.code)
  const [activeReqForSubmission, setActiveReqForSubmission] = useState<StudentGateRequirement | null>(null)
  const [showDefenseModal, setShowDefenseModal] = useState(false)

  const selectedGate = timeline.gates.find((g) => g.code === selectedGateCode) || timeline.gates[0]
  const completedGatesCount = timeline.gates.filter((g) => g.status === 'PASSED').length
  const totalGatesCount = timeline.gates.length
  const academicProgress = Math.round((completedGatesCount / (totalGatesCount || 1)) * 100)
  const isDefenseReady = completedGatesCount === totalGatesCount && totalGatesCount > 0

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
        return <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Chưa nộp</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Project & Policy Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-900">{timeline.projectName}</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
              {timeline.projectCode}
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
              Chính sách: v{timeline.effectivePolicyVersion} (Đã ban hành)
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Chế độ: <strong className="text-slate-700">{timeline.projectMode === 'SINGLE_MAJOR' ? 'Đơn ngành' : 'Liên ngành'}</strong> · Ngành: {timeline.major} · Đang xét duyệt: <strong className="text-primary">{selectedGate?.code}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
            Vai trò hiện tại: <strong className={isLeader ? 'text-primary' : 'text-slate-800'}>{isLeader ? 'Trưởng nhóm (Leader)' : 'Thành viên (Member)'}</strong>
          </div>
          {onToggleRole && (
            <button
              type="button"
              onClick={onToggleRole}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-2xs hover:bg-slate-50"
              title="Đổi vai trò để kiểm thử quyền Leader vs Member"
            >
              ⇄ Đổi vai trò kiểm thử
            </button>
          )}
        </div>
      </div>

      {/* Role Notice */}
      {!isLeader && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
          <strong>Thông báo quyền hạn:</strong> Bạn đang xem với vai trò Thành viên (Student Member). Bạn có thể xem toàn bộ tiến trình, lịch sử nhận xét và minh chứng. Quyền nộp hồ sơ thẩm định chính thức và bản sửa đổi Gate thuộc về Trưởng nhóm.
        </div>
      )}

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Academic Execution Progress */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Tiến độ thực hiện học vụ</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">{academicProgress}%</span>
            <span className="text-xs text-slate-400">({completedGatesCount}/{totalGatesCount} Cổng đạt)</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-600 transition-all duration-300" style={{ width: `${academicProgress}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-slate-400">Chỉ tính các cổng đã được Hội đồng duyệt PASS.</p>
        </div>

        {/* KPI 2: Task Progress */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Tiến độ công việc (Task Board)</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-700">90%</span>
            <span className="text-xs text-blue-600 font-medium">Khác với tiến độ học vụ</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{ width: '90%' }} />
          </div>
          <p className="mt-1.5 text-xs text-slate-400">Hoàn thành task kỹ thuật không đồng nghĩa với đạt cổng.</p>
        </div>

        {/* KPI 3: Current Review Gate */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Cổng thẩm định hiện tại</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-black text-slate-900">{selectedGate?.code}</span>
            <span className="text-xs font-semibold text-slate-600 truncate">{selectedGate?.title}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-500">Hạn chót thẩm định:</span>
            <span className="font-semibold text-slate-700">{selectedGate?.windowEnd || 'Theo kỳ'}</span>
          </div>
          <p className="mt-1.5 text-xs text-slate-400">Trạng thái: {selectedGate?.status}</p>
        </div>

        {/* KPI 4: Defense Readiness Advisory */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Đủ điều kiện bảo vệ (Advisory)</span>
            <button
              type="button"
              onClick={() => setShowDefenseModal(true)}
              className="text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              Chi tiết ↗
            </button>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-base font-black ${isDefenseReady ? 'text-emerald-700' : 'text-amber-700'}`}>
              {isDefenseReady ? 'ĐỦ ĐIỀU KIỆN (DỰ KIẾN)' : 'CHƯA ĐỦ ĐIỀU KIỆN'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {isDefenseReady ? 'Đã hoàn thành các cổng tiên quyết.' : `Còn ${totalGatesCount - completedGatesCount} cổng chưa hoàn tất thẩm định.`}
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
              <p className="text-xs text-slate-500">Mỗi chuyên ngành có trọng số và cổng thẩm định độc lập theo quy chế.</p>
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
              Mô hình Tích hợp Đa ngành
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Khối chung (Common)</span>
                <span>50%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-emerald-600 rounded-full" style={{ width: '50%' }} />
              </div>
              <span className="text-xs text-slate-400 mt-1 block">Trọng số: 40%</span>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Ngành Phần mềm (IT)</span>
                <span>100%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-emerald-600 rounded-full" style={{ width: '100%' }} />
              </div>
              <span className="text-xs text-slate-400 mt-1 block">Trọng số: 20%</span>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Ngành Marketing</span>
                <span>50%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '50%' }} />
              </div>
              <span className="text-xs text-slate-400 mt-1 block">Trọng số: 20%</span>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Ngành Thiết kế (Design)</span>
                <span>0%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: '0%' }} />
              </div>
              <span className="text-xs text-slate-400 mt-1 block">Trọng số: 20%</span>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            ⚠️ <strong>Quy tắc Cổng Tích hợp:</strong> Cổng đánh giá tích hợp liên ngành chỉ được thông qua khi toàn bộ các ngành thành viên bắt buộc (Common, IT, Marketing, Design) đều được phê duyệt ĐẠT.
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
              className={`rounded-xl border p-4 text-left transition-all ${
                isSelected
                  ? 'border-primary bg-primary-subtle/50 shadow-xs ring-1 ring-primary'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">{gate.code}</span>
                {getStatusBadge(gate.status)}
              </div>
              <h3 className="mt-2 text-sm font-bold text-slate-900">{gate.title}</h3>
              <p className="mt-1 text-xs text-slate-500 line-clamp-1">{gate.objective}</p>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-400">
                <span>{gate.windowStart} → {gate.windowEnd}</span>
                {gate.reviewEligibility === 'BLOCKED' && <span className="font-bold text-rose-500">🔒 Bị chặn</span>}
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
            <div className="text-right text-xs text-slate-500">
              <div>Thời gian nộp: <strong>{selectedGate.windowStart}</strong> đến <strong>{selectedGate.windowEnd}</strong></div>
              <div>Điều kiện tham gia: <strong className={selectedGate.reviewEligibility === 'BLOCKED' ? 'text-rose-600' : 'text-emerald-600'}>{selectedGate.reviewEligibility === 'BLOCKED' ? 'Đang bị chặn' : 'Sẵn sàng'}</strong></div>
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
            <h4 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              Danh mục Minh chứng Học thuật ({selectedGate.requirements.length} yêu cầu)
            </h4>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
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
                              {req.latestArtifact.notes && <div className="text-slate-500 italic mt-0.5">"{req.latestArtifact.notes}"</div>}
                            </div>
                          ) : (
                            <span className="text-slate-400">Chưa có tệp</span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-right">
                          {req.verificationStatus === 'ACCEPTED' ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                              <span className="material-symbols-outlined text-sm" aria-hidden="true">check</span>
                              Đã chấp thuận
                            </span>
                          ) : isLeader ? (
                            <button
                              type="button"
                              onClick={() => setActiveReqForSubmission(req)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all focus:outline-hidden focus:ring-2 focus:ring-offset-1 ${
                                req.verificationStatus === 'REJECTED'
                                  ? 'bg-rose-600 text-white shadow-xs hover:bg-rose-700 focus:ring-rose-500'
                                  : 'bg-primary text-white shadow-xs hover:bg-primary-hover focus:ring-primary'
                              }`}
                            >
                              {req.verificationStatus === 'REJECTED' ? 'Nộp bản sửa' : req.latestArtifact ? 'Nộp lại' : 'Nộp tài liệu'}
                            </button>
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
                                Chỉ Trưởng nhóm
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
        </div>
      )}

      {/* Submission Modal */}
      <ReviewSubmissionModal
        open={Boolean(activeReqForSubmission)}
        onClose={() => setActiveReqForSubmission(null)}
        requirement={activeReqForSubmission}
        gateCode={selectedGate?.code || ''}
        isLeader={isLeader}
        onSubmit={async (artifactName, notes) => {
          if (!activeReqForSubmission || !selectedGate) return
          await onSubmitRevision(selectedGate.code, activeReqForSubmission.id, artifactName, notes)
        }}
      />

      {/* Advisory Defense Readiness Modal (DEF-01) */}
      {showDefenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Danh mục Kiểm tra Điều kiện Bảo vệ (Advisory)</h3>
                <p className="text-xs text-slate-500">Theo dõi sự sẵn sàng cho phiên bảo vệ đồ án tốt nghiệp.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDefenseModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto">
              {timeline.gates.map((g) => (
                <div key={g.gateInstanceId} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
                  <div>
                    <strong className="text-slate-800">{g.code} — {g.title}</strong>
                    <span className="block text-slate-500">Cổng thẩm định bắt buộc</span>
                  </div>
                  {g.status === 'PASSED' ? (
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 border border-emerald-200">✓ Đạt chuẩn</span>
                  ) : (
                    <span className="rounded-md bg-amber-50 px-2 py-0.5 font-bold text-amber-700 border border-amber-200">Chưa hoàn thành</span>
                  )}
                </div>
              ))}

              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
                <div>
                  <strong className="text-slate-800">Gói Bàn giao Cuối kỳ (Final Submission Package)</strong>
                  <span className="block text-slate-500">Báo cáo, Source code, Poster & Video demo</span>
                </div>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600">Đang nhận bài</span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
                <div>
                  <strong className="text-slate-800">Xác nhận của Giảng viên hướng dẫn (Supervisor Sign-off)</strong>
                  <span className="block text-slate-500">Đồng ý cho phép bảo vệ</span>
                </div>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600">Chờ xác nhận</span>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              ℹ️ <strong>Ranh giới Học vụ:</strong> Bảng kiểm tra này mang tính chất tư vấn (Advisory) để nhóm chủ động hoàn thiện hồ sơ. Quyết định chính thức về danh sách bảo vệ thuộc thẩm quyền của Hội đồng Khoa và Ban Đào tạo.
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowDefenseModal(false)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-900 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
