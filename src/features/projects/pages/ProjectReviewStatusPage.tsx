import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { env } from '../../../app/config/env'
import { useStudentJourney } from '../../../app/context'
import { services } from '../../../services/service-gateway'
import { RevisionAlert } from '../components/RevisionAlert'
import type { ProjectStatusHistoryDto } from '../../../types/backend'

export function ProjectReviewStatusPage() {
  const navigate = useNavigate()
  const { project, team, refreshAll, isLoading: contextLoading } = useStudentJourney()
  const [history, setHistory] = useState<ProjectStatusHistoryDto[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [simulatingDecision, setSimulatingDecision] = useState(false)

  const loadHistory = useCallback(async () => {
    if (!project?.id) return
    setIsLoadingHistory(true)
    try {
      const hist = await services.project.getHistory(project.id)
      setHistory(hist)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [project?.id])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const latestRevision = history
    .filter((h) => h.newStatus.replaceAll('_', '').toUpperCase() === 'REVISIONREQUIRED')
    .pop()

  const handleSimulate = async (decision: 'REVISION_REQUIRED' | 'APPROVED' | 'REJECTED') => {
    if (!project?.id) return
    setSimulatingDecision(true)
    try {
      await services.project.simulateDepartmentReview(
        project.id,
        decision,
        decision === 'REVISION_REQUIRED'
          ? 'Cần bổ sung chi tiết sơ đồ kiến trúc Clean Architecture và ma trận truy vết RTM trong phần mục tiêu đề tài.'
          : 'Hội đồng Khoa CNTT đồng ý thông qua đề cương đề tài.',
      )
      await refreshAll()
      await loadHistory()
    } finally {
      setSimulatingDecision(false)
    }
  }

  if (contextLoading || isLoadingHistory) {
    return (
      <div className="max-w-4xl mx-auto p-6 flex flex-col gap-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3" />
        <div className="h-36 bg-slate-200 rounded-2xl w-full" />
        <div className="h-64 bg-slate-200 rounded-2xl w-full" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16 bg-white border border-slate-200 rounded-2xl p-8 shadow-xs">
        <span className="material-symbols-outlined text-[48px] text-slate-300">article</span>
        <h2 className="text-lg font-bold text-slate-900 mt-2">Chưa có Đề cương Đồ án</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Nhóm của bạn chưa đăng ký đề cương đề tài nào trong học kỳ này.
        </p>
        <button
          type="button"
          onClick={() => navigate('/project/register')}
          className="mt-5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Đăng ký đề tài mới
        </button>
      </div>
    )
  }

  const normalizedStatus = project.status.replaceAll('_', '').toUpperCase()
  const isDraft = normalizedStatus === 'DRAFT'
  const isSubmitted = normalizedStatus === 'SUBMITTED' || normalizedStatus === 'UNDERREVIEW'
  const isRevision = normalizedStatus === 'REVISIONREQUIRED'
  const reviewApproved = ['APPROVED', 'SUPERVISORPENDING', 'ACTIVE', 'FINALSUBMISSION', 'COMPLETED'].includes(normalizedStatus)
  const canChooseSupervisor = normalizedStatus === 'APPROVED' || normalizedStatus === 'SUPERVISORPENDING'
  const supervisorComplete = ['ACTIVE', 'FINALSUBMISSION', 'COMPLETED'].includes(normalizedStatus)
  const isRejected = normalizedStatus === 'REJECTED'

  return (
    <div className="max-w-4xl mx-auto pb-16 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/team')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Trang Quản lý Nhóm
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Trạng thái Xét duyệt Đề cương Đồ án
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Mã đề tài: <span className="font-mono font-bold text-slate-700">{project.code}</span> • Nhóm:{' '}
            <span className="font-semibold text-slate-700">{team?.name || project.teamName}</span>
          </p>
        </div>

        {isRevision && (
          <button
            type="button"
            onClick={() => navigate('/project/edit')}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">edit_note</span>
            Chỉnh sửa & Nộp lại
          </button>
        )}

        {isRejected && (
          <button
            type="button"
            onClick={() => navigate('/project/register')}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Đăng ký Đề tài Mới
          </button>
        )}

        {canChooseSupervisor && (
          <button
            type="button"
            onClick={() => navigate('/project/supervisor')}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">person_check</span>
            Chọn Giảng viên Hướng dẫn
          </button>
        )}
      </div>

      {/* Revision Alert Banner */}
      {isRevision && latestRevision && (
        <RevisionAlert
          reason={latestRevision.reason}
          reviewerName={latestRevision.changedByName || 'Hội đồng Khoa CNTT'}
          timestamp={latestRevision.changedAt}
          onEdit={() => navigate('/project/edit')}
        />
      )}

      {/* Rejected Banner */}
      {isRejected && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-start gap-3.5 shadow-xs">
          <span className="material-symbols-outlined text-rose-500 text-[24px] shrink-0 mt-0.5">cancel</span>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-rose-900">Đề cương bị Từ chối bởi Hội đồng Khoa</h3>
            <p className="text-xs text-rose-800 mt-1 leading-relaxed">
              Đề cương đề tài của nhóm đã bị từ chối và không thể chỉnh sửa hay nộp lại ở trạng thái này. Để tiếp tục, bạn có thể đăng ký một đề tài mới từ đầu.
            </p>
            {history.filter((h) => h.newStatus.replaceAll('_', '').toUpperCase() === 'REJECTED').slice(-1).map((h) => (
              h.reason ? (
                <p key={h.id} className="text-xs text-rose-700 mt-2 bg-rose-100 border border-rose-200 rounded-xl p-2.5">
                  <span className="font-semibold">Lý do từ chối:</span> {h.reason}
                </p>
              ) : null
            ))}
            <button
              type="button"
              onClick={() => navigate('/project/register')}
              className="mt-3 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              Đăng ký Đề tài Mới
            </button>
          </div>
        </div>
      )}

      {/* Approved Banner */}
      {canChooseSupervisor && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-3.5 shadow-xs">
          <span className="material-symbols-outlined text-emerald-600 text-[24px] shrink-0 mt-0.5">verified</span>
          <div>
            <h3 className="text-sm font-bold text-emerald-900">Đề cương đã được Phê duyệt Chính thức!</h3>
            <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
              Chúc mừng nhóm của bạn! Đề tài đã được Hội đồng Khoa phê duyệt. Bước tiếp theo là gửi thư mời hoặc xác nhận Giảng viên Hướng dẫn để chính thức bước vào giai đoạn thực hiện.
            </p>
          </div>
        </div>
      )}

      {supervisorComplete && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-3.5 shadow-xs">
          <span className="material-symbols-outlined text-emerald-600 text-[24px] shrink-0 mt-0.5">rocket_launch</span>
          <div>
            <h3 className="text-sm font-bold text-emerald-900">Đề tài đã hoàn tất ghép GVHD và đang thực hiện</h3>
            <p className="text-xs text-emerald-800 mt-1">Các bước đăng ký, thẩm định và phân công giảng viên đã hoàn thành trên backend.</p>
          </div>
        </div>
      )}

      {/* Progress Stepper */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6">
          Quy trình Thẩm định của Bộ môn
        </h3>

        <div className="relative flex items-center justify-between">
          <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-slate-100 z-0" />

          {/* Step 1: Draft */}
          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <span className="material-symbols-outlined text-[20px]">check</span>
            </div>
            <span className="text-xs font-bold text-slate-800">Khởi tạo Đề cương</span>
            <span className="text-[10px] text-slate-400 font-mono">Hoàn thành</span>
          </div>

          {/* Step 2: Submitted */}
          <div className="relative z-10 flex flex-col items-center gap-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-xs ${
                !isDraft
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 text-slate-400 border border-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {!isDraft ? 'check' : 'send'}
              </span>
            </div>
            <span className="text-xs font-bold text-slate-800">Nộp Đề cương</span>
            <span className="text-[10px] text-slate-400 font-mono">
              {!isDraft ? 'Đã nộp' : 'Chưa nộp'}
            </span>
          </div>

          {/* Step 3: Review */}
          <div className="relative z-10 flex flex-col items-center gap-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-xs ${
                reviewApproved
                  ? 'bg-emerald-500 text-white'
                  : isRevision
                    ? 'bg-amber-500 text-white'
                    : isRejected
                      ? 'bg-rose-500 text-white'
                      : isSubmitted
                        ? 'bg-blue-600 text-white animate-pulse'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {reviewApproved ? 'check' : isRevision ? 'priority_high' : isRejected ? 'close' : 'sync'}
              </span>
            </div>
            <span className="text-xs font-bold text-slate-800">Khoa Thẩm định</span>
            <span className="text-[10px] text-slate-400 font-mono">
              {reviewApproved
                ? 'Đã duyệt'
                : isRevision
                  ? 'Yêu cầu sửa'
                  : isRejected
                    ? 'Từ chối'
                    : isSubmitted
                      ? 'Đang thẩm định'
                      : 'Chờ đến lượt'}
            </span>
          </div>

          {/* Step 4: Supervisor */}
          <div className="relative z-10 flex flex-col items-center gap-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-xs ${
                supervisorComplete
                  ? 'bg-emerald-500 text-white'
                  : canChooseSupervisor
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">school</span>
            </div>
            <span className="text-xs font-bold text-slate-800">Ghép cặp GVHD</span>
            <span className="text-[10px] text-slate-400 font-mono">
              {supervisorComplete ? 'Hoàn tất' : canChooseSupervisor ? 'Sẵn sàng' : 'Chưa mở'}
            </span>
          </div>
        </div>
      </div>

      {/* Project Overview Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
              Chi tiết Đề cương Đã nộp
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-1">{project.title}</h2>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${
              reviewApproved
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : isRevision
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : isRejected
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}
          >
            {isRevision
              ? 'Yêu cầu Chỉnh sửa'
              : normalizedStatus === 'APPROVED'
                ? 'Đã Phê duyệt'
                : normalizedStatus === 'SUBMITTED'
                  ? 'Đã Nộp — Đang chờ duyệt'
                  : project.status}
          </span>
        </div>

        {project.problemStatement && (
          <div className="text-xs text-slate-600">
            <span className="font-bold text-slate-800 block mb-0.5">Bối cảnh vấn đề:</span>
            <p className="leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              {project.problemStatement}
            </p>
          </div>
        )}

        {project.objectives && (
          <div className="text-xs text-slate-600">
            <span className="font-bold text-slate-800 block mb-0.5">Mục tiêu đề tài:</span>
            <p className="leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-line">
              {project.objectives}
            </p>
          </div>
        )}

        {project.expectedOutput && (
          <div className="text-xs text-slate-600">
            <span className="font-bold text-slate-800 block mb-0.5">Sản phẩm kỳ vọng:</span>
            <p className="leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              {project.expectedOutput}
            </p>
          </div>
        )}
      </div>

      {/* Review History Log */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-blue-600">history</span>
          Lịch sử Xét duyệt & Thay đổi Trạng thái
        </h3>

        {history.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">Chưa có lịch sử thay đổi trạng thái.</div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {history.map((item) => (
              <div key={item.id} className="p-4 flex flex-col gap-1.5 hover:bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-800">
                      {item.oldStatus ? `${item.oldStatus} → ` : ''}
                      <span className="text-blue-600">{item.newStatus}</span>
                    </span>
                    <span className="text-[11px] text-slate-400">• Bởi: {item.changedByName || 'Hệ thống'}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(item.changedAt).toLocaleString('vi-VN')}
                  </span>
                </div>
                {item.reason && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="font-semibold text-slate-700">Ghi chú:</span> {item.reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dev / Test Simulation Box (Dev Mode Only - Does NOT build TinVV's UI) */}
      {!import.meta.env.PROD && env.isMockMode && (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-600 text-[18px]">terminal</span>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Khung Thử nghiệm Kiểm thử (Dev Test Simulation Bar)
              </h4>
            </div>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded">
              DEV_TEST_FIXTURE_ONLY
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Công cụ mô phỏng phản hồi từ Bộ môn nhằm kiểm chứng phản ứng giao diện phía Sinh viên (Student Journey) mà không can thiệp vào phạm vi màn hình Khoa của TinVV:
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={simulatingDecision}
              onClick={() => handleSimulate('REVISION_REQUIRED')}
              className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Mô phỏng: Yêu cầu Chỉnh sửa (RevisionRequired)
            </button>
            <button
              type="button"
              disabled={simulatingDecision}
              onClick={() => handleSimulate('APPROVED')}
              className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Mô phỏng: Khoa Phê duyệt (Approved)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
