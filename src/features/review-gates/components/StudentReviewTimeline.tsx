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

  const selectedGate = timeline.gates.find((g) => g.code === selectedGateCode) || timeline.gates[0]

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
                    const canSubmit = isLeader && req.verificationStatus !== 'ACCEPTED'
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
                          <button
                            type="button"
                            disabled={!canSubmit}
                            onClick={() => setActiveReqForSubmission(req)}
                            className={`rounded-lg px-3 py-1.5 font-bold transition-all ${
                              canSubmit
                                ? req.verificationStatus === 'REJECTED'
                                  ? 'bg-rose-600 text-white shadow-xs hover:bg-rose-700'
                                  : 'bg-primary text-white shadow-xs hover:bg-primary-hover'
                                : 'cursor-not-allowed bg-slate-100 text-slate-400'
                            }`}
                          >
                            {req.verificationStatus === 'REJECTED' ? 'Nộp bản sửa' : req.latestArtifact ? 'Nộp lại' : 'Nộp tài liệu'}
                          </button>
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
    </div>
  )
}
