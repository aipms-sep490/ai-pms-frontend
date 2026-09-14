import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { env } from '../../../app/config/env'
import { useStudentJourney } from '../../../app/context'
import { services } from '../../../services/service-gateway'
import { getActivePrimaryAssignment } from '../../projects/utils/project-resolution.utils'
import type {
  SupervisorCandidateDto,
  SupervisorRequestDto,
  SupervisorAssignmentDto,
} from '../../../types/backend'

export function SupervisorSelectionPage() {
  const navigate = useNavigate()
  const { project, team, refreshAll, isLoading: contextLoading } = useStudentJourney()

  const [candidates, setCandidates] = useState<SupervisorCandidateDto[]>([])
  const [requests, setRequests] = useState<SupervisorRequestDto[]>([])
  const [assignments, setAssignments] = useState<SupervisorAssignmentDto[]>([])

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedExpertise, setSelectedExpertise] = useState<string>('ALL')
  const [isLoading, setIsLoading] = useState(true)

  // Request modal
  const [selectedCandidate, setSelectedCandidate] = useState<SupervisorCandidateDto | null>(null)
  const [requestMessage, setRequestMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  const loadData = useCallback(async () => {
    if (!project?.id) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const [candRes, reqRes, assignRes] = await Promise.all([
        services.supervisor.getCandidates(project.id, {
          search: searchQuery.trim() || undefined,
          expertise: selectedExpertise !== 'ALL' ? selectedExpertise : undefined,
        }),
        services.supervisor.getRequests(project.id),
        services.supervisor.getAssignments(project.id),
      ])
      setCandidates(candRes.items)
      setRequests(reqRes.items)
      setAssignments(assignRes.items)
    } finally {
      setIsLoading(false)
    }
  }, [project?.id, searchQuery, selectedExpertise])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSendRequest = async (e: FormEvent) => {
    e.preventDefault()
    if (!project?.id || !selectedCandidate) return

    setIsSending(true)
    try {
      await services.supervisor.sendRequest(
        project.id,
        selectedCandidate.id,
        requestMessage.trim() || undefined,
      )
      setSelectedCandidate(null)
      setRequestMessage('')
      await loadData()
      await refreshAll()
      showToast('Đã gửi lời mời hướng dẫn thành công!')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gửi yêu cầu thất bại.', 'error')
    } finally {
      setIsSending(false)
    }
  }

  const handleCancelRequest = async (requestId: number) => {
    setActionLoadingId(requestId)
    try {
      await services.supervisor.cancelRequest(requestId)
      await loadData()
      await refreshAll()
      showToast('Đã hủy yêu cầu hướng dẫn.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Hủy yêu cầu thất bại.', 'error')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleSimulateResponse = async (requestId: number, accept: boolean) => {
    setActionLoadingId(requestId)
    try {
      services.supervisor.simulateSupervisorResponse(requestId, accept)
      await loadData()
      await refreshAll()
      showToast(accept ? 'Mô phỏng: Giảng viên đã chấp thuận!' : 'Mô phỏng: Giảng viên đã từ chối.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const resolveSupervisorName = (profileId: number): string => {
    const cand = candidates.find((c) => c.id === profileId)
    return cand?.fullName ?? `Giảng viên #${profileId}`
  }

  if (contextLoading || (isLoading && candidates.length === 0)) {
    return (
      <div className="max-w-5xl mx-auto p-6 flex flex-col gap-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3" />
        <div className="h-28 bg-slate-200 rounded-2xl w-full" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-56 bg-slate-200 rounded-2xl" />
          <div className="h-56 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center flex flex-col items-center gap-4 bg-white border border-slate-200 rounded-2xl shadow-xs mt-12">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
          <span className="material-symbols-outlined text-[24px]">supervisor_account</span>
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold text-slate-800">Chưa có Đề tài đủ Điều kiện chọn GVHD</h2>
          <p className="text-xs text-slate-500 max-w-md">
            Bạn cần đăng ký đề tài và được Hội đồng Bộ môn phê duyệt trước khi tiến hành gửi yêu cầu ghép cặp Giảng viên Hướng dẫn.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/projects/lifecycle')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          Xem Hồ sơ Đề tài
        </button>
      </div>
    )
  }

  const activeAssignment = getActivePrimaryAssignment(assignments)
  const hasActiveAssignment = Boolean(activeAssignment)

  const EXPERTISE_OPTIONS = ['ALL', 'AI/ML', 'Clean Architecture', 'DevOps', 'Microservices', 'Blockchain']

  return (
    <div className="max-w-5xl mx-auto pb-16 flex flex-col gap-6">
      {/* Toast */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {toastMessage.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {toastMessage.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/project/status')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Trang Trạng thái Đề cương
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Ghép cặp Giảng viên Hướng dẫn (Supervisor Matching)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Đề tài: <span className="font-semibold text-slate-700">{project?.title || 'Đề tài đồ án'}</span> • Nhóm:{' '}
            <span className="font-semibold text-slate-700">{team?.name || 'Nhóm sinh viên'}</span>
          </p>
        </div>

        {hasActiveAssignment && (
          <button
            type="button"
            onClick={() => navigate('/project/milestones/M3')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">view_kanban</span>
            Không gian Milestones & Tasks
          </button>
        )}
      </div>

      {/* Active Assignment Banner (When Accepted) */}
      {hasActiveAssignment && activeAssignment && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-[28px]">school</span>
            </div>
            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 mb-1">
                <span className="material-symbols-outlined text-[14px]">verified</span>
                Đã Phân công Hướng dẫn Chính thức
              </div>
              <h2 className="text-base font-bold text-slate-900">
                {activeAssignment.supervisorName}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Ngày bắt đầu: {new Date(activeAssignment.assignedAt).toLocaleDateString('vi-VN')} • Vai trò: Hướng dẫn chính (Primary)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/project/milestones/M3')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
              Vào Không gian Làm việc (Workspace)
            </button>
          </div>
        </div>
      )}

      {/* Requests Tracking Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-blue-600">outgoing_mail</span>
              Yêu cầu Hướng dẫn Đã gửi ({requests.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Theo dõi tiến độ phản hồi từ các giảng viên hướng dẫn
            </p>
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            Chưa gửi yêu cầu hướng dẫn nào. Hãy duyệt danh sách giảng viên bên dưới để gửi lời mời.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {requests.map((req) => (
              <div key={req.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                    <span className="material-symbols-outlined text-[20px]">person</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {resolveSupervisorName(req.supervisorProfileId)}
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      Gửi lúc: {new Date(req.requestedAt).toLocaleString('vi-VN')}
                    </span>
                    {req.requestMessage && (
                      <p className="text-[11px] text-slate-600 mt-1 italic">&ldquo;{req.requestMessage}&rdquo;</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      req.status === 'ACCEPTED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : req.status === 'PENDING'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : req.status === 'CANCELLED'
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {req.status === 'ACCEPTED'
                      ? 'Đã chấp thuận'
                      : req.status === 'PENDING'
                        ? 'Đang chờ phản hồi'
                        : req.status === 'CANCELLED'
                          ? 'Đã hủy'
                          : 'Đã từ chối'}
                  </span>

                  {req.status === 'PENDING' && (
                    <button
                      type="button"
                      disabled={actionLoadingId === req.id}
                      onClick={() => handleCancelRequest(req.id)}
                      className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-semibold transition-colors disabled:opacity-50"
                    >
                      {actionLoadingId === req.id ? 'Đang hủy...' : 'Hủy yêu cầu'}
                    </button>
                  )}

                  {/* Dev Simulation actions (Dev mode only) */}
                  {!import.meta.env.PROD && env.isMockMode && req.status === 'PENDING' && (
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => handleSimulateResponse(req.id, true)}
                        title="Mô phỏng GV Đồng ý"
                        className="p-1 hover:bg-emerald-100 text-emerald-700 rounded text-[11px] font-bold"
                      >
                        ✓ Đồng ý
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSimulateResponse(req.id, false)}
                        title="Mô phỏng GV Từ chối"
                        className="p-1 hover:bg-rose-100 text-rose-700 rounded text-[11px] font-bold"
                      >
                        ✗ Từ chối
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Supervisor Candidates Explorer */}
      {!hasActiveAssignment && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Danh mục Giảng viên Hướng dẫn Khả dụng</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tìm kiếm giảng viên có chuyên môn phù hợp và số slot đồ án còn trống
              </p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên hoặc chuyên ngành..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <select
                value={selectedExpertise}
                onChange={(e) => setSelectedExpertise(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {EXPERTISE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === 'ALL' ? 'Tất cả chuyên môn' : opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Candidates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {candidates.map((cand) => {
              const hasSentPending = requests.some(
                (r) => r.supervisorProfileId === cand.id && r.status === 'PENDING',
              )
              const isFull = cand.remainingSlots <= 0

              return (
                <div
                  key={cand.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-slate-300 transition-all"
                >
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
                          {cand.fullName.charAt(cand.fullName.lastIndexOf(' ') + 1) || 'T'}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">{cand.fullName}</h3>
                          <span className="text-[11px] text-slate-500">
                            Khoa {cand.departmentName}
                          </span>
                        </div>
                      </div>

                      {/* Remaining Slots Badge */}
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 border ${
                          isFull
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : cand.remainingSlots <= 1
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {isFull ? 'Hết slot' : `Còn ${cand.remainingSlots} slot`}
                      </span>
                    </div>

                    {cand.bio && (
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{cand.bio}</p>
                    )}

                    {/* Expertise Tags */}
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {cand.expertise.map((exp) => (
                        <span
                          key={exp.name}
                          className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700"
                        >
                          {exp.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Đang hướng dẫn: {cand.activeProjects}/{cand.semesterLimit} nhóm
                    </span>

                    <button
                      type="button"
                      disabled={isFull || hasSentPending}
                      onClick={() => setSelectedCandidate(cand)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">send</span>
                      {hasSentPending ? 'Đã gửi yêu cầu' : isFull ? 'Hết chỗ' : 'Mời hướng dẫn'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Send Request Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-blue-600">forward_to_inbox</span>
                Gửi Lời mời Hướng dẫn Đồ án
              </h3>
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                GV
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">{selectedCandidate.fullName}</h4>
                <p className="text-[11px] text-slate-500">
                  Khoa {selectedCandidate.departmentName} • Còn {selectedCandidate.remainingSlots} slot khả dụng
                </p>
              </div>
            </div>

            <form onSubmit={handleSendRequest} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Thư ngỏ / Lời nhắn tới Giảng viên *
                </label>
                <textarea
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  required
                  rows={4}
                  placeholder="Kính chào Thầy/Cô, nhóm chúng em có nguyện vọng được Thầy/Cô hướng dẫn đề tài nghiên cứu về..."
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedCandidate(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {isSending ? 'Đang gửi...' : 'Xác nhận gửi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
