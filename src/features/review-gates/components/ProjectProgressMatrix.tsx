import { useState } from 'react'
import { env } from '../../../app/config/env'
import type { GateStatus, ProjectReviewMatrixRow } from '../types/review-gates.types'

interface ProjectProgressMatrixProps {
  projects: ProjectReviewMatrixRow[]
  onUpdateDecision: (
    projectId: string,
    gateCode: string,
    newStatus: 'PASSED' | 'REVISION_REQUIRED' | 'IN_REVIEW',
  ) => Promise<void> | void
  onSelectHybridProject?: (projectId: string) => void
  onSelectProject?: (projectId: string) => void
}

const statusPillClasses: Record<GateStatus, string> = {
  PASSED: 'bg-status-success-bg text-status-success-text border-status-success-border',
  REVISION_REQUIRED: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
  IN_REVIEW: 'bg-status-info-bg text-status-info-text border-status-info-border',
  PLANNED: 'bg-amber-50 text-amber-700 border-amber-200',
  LOCKED: 'bg-slate-100 text-slate-400 border-slate-200',
}

const statusLabels: Record<GateStatus, string> = {
  PASSED: 'ĐẠT (PASS)',
  REVISION_REQUIRED: 'CẦN CHỈNH SỬA',
  IN_REVIEW: 'ĐANG XÉT',
  PLANNED: 'KẾ HOẠCH',
  LOCKED: 'CHƯA MỞ',
}

export function ProjectProgressMatrix({
  projects,
  onUpdateDecision,
  onSelectHybridProject,
  onSelectProject,
}: ProjectProgressMatrixProps) {
  const [filterMode, setFilterMode] = useState<string>('ALL')
  const [inspectingProject, setInspectingProject] = useState<ProjectReviewMatrixRow | null>(null)
  const [selectedGateToDecide, setSelectedGateToDecide] = useState<string>('R2')
  const [decisionChoice, setDecisionChoice] = useState<'PASSED' | 'REVISION_REQUIRED' | 'IN_REVIEW'>('PASSED')
  const [updatingDecision, setUpdatingDecision] = useState(false)
  const [decisionError, setDecisionError] = useState<string | null>(null)

  const filteredProjects = projects.filter(p => filterMode === 'ALL' || p.mode === filterMode)

  const allGateCodes = Array.from(
    new Set(projects.flatMap(p => Object.keys(p.gateStatuses))),
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  const displayGateCodes = allGateCodes.length > 0 ? allGateCodes : ['R1', 'R2', 'R3', 'R4']

  return (
    <div className="space-y-5">
      {/* KPI Cards Bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Tổng số đồ án</span>
          <p className="mt-1 text-2xl font-black text-slate-900">{projects.length}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 shadow-2xs">
          <span className="text-xs font-semibold text-rose-700">Cần chỉnh sửa Review</span>
          <p className="mt-1 text-2xl font-black text-rose-700">
            {projects.filter(p => Object.values(p.gateStatuses).includes('REVISION_REQUIRED')).length}
          </p>
        </div>
        <div className="rounded-xl border border-status-info-border bg-status-info-bg p-4 shadow-2xs">
          <span className="text-xs font-semibold text-status-info-text">Đang thẩm định</span>
          <p className="mt-1 text-2xl font-black text-status-info-text">
            {projects.filter(p => Object.values(p.gateStatuses).includes('IN_REVIEW')).length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Đồ án liên ngành</span>
          <p className="mt-1 text-2xl font-black text-primary">
            {projects.filter(p => p.mode === 'INTERDISCIPLINARY').length}
          </p>
        </div>
      </div>

      {/* Matrix Table Section */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Ma trận tiến trình các đồ án</h3>
            <p className="text-xs text-slate-500">
              Nhấp vào từng đồ án để xem quyết định của Reviewer và nguyên nhân bị chặn.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="matrix-mode-select" className="text-xs font-semibold text-slate-600">
              Chế độ đồ án:
            </label>
            <select
              id="matrix-mode-select"
              value={filterMode}
              onChange={e => setFilterMode(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              <option value="ALL">Tất cả chế độ</option>
              <option value="SINGLE_MAJOR">Đơn ngành</option>
              <option value="INTERDISCIPLINARY">Liên ngành</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/60 font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Mã / Tên đồ án</th>
                <th className="py-3 px-4">Chuyên ngành / Mode</th>
                {displayGateCodes.map(code => (
                  <th key={code} className="py-3 px-3 text-center">{code}</th>
                ))}
                <th className="py-3 px-4">Tiến độ Task*</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredProjects.map(proj => {
                const keys = Object.keys(proj.gateStatuses)
                return (
                  <tr
                    key={proj.projectId}
                    onClick={() => {
                      setInspectingProject(proj)
                      setSelectedGateToDecide(keys[1] || keys[0] || 'R2')
                      setDecisionError(null)
                      if (onSelectProject) onSelectProject(proj.projectId)
                    }}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                  >
                    <td className="py-3.5 px-4">
                      <strong className="block font-bold text-primary">{proj.projectId}</strong>
                      <span className="text-xs text-slate-600 font-medium">{proj.projectName}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="block font-semibold text-slate-800">{proj.major}</span>
                      <span className="text-xs uppercase font-bold text-slate-400">
                        {proj.mode === 'SINGLE_MAJOR' ? 'Đơn ngành' : 'Liên ngành'}
                      </span>
                    </td>
                    {displayGateCodes.map(code => {
                      const st = proj.gateStatuses[code]
                      return (
                        <td key={code} className="py-3.5 px-3 text-center">
                          {st ? (
                            <span
                              className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                                statusPillClasses[st] || 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {statusLabels[st] ?? 'Chưa xác định'}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="py-3.5 px-4 min-w-[130px]">
                      {proj.hasTasks === false ? <span className="text-xs text-slate-600">Chưa có công việc</span> : <div className="flex items-center gap-2">
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${proj.taskProgress}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-600">{proj.taskProgress}%</span>
                      </div>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="p-3 text-xs text-slate-400 border-t border-slate-100">
          * Tiến độ Task % là số liệu quản lý nội bộ; không thay thế quyết định thẩm định chính thức của Reviewer.
        </p>
      </div>

      {/* Inspecting Project Drawer / Modal */}
      {inspectingProject && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-[2px]"
          onClick={e => {
            if (e.target === e.currentTarget) setInspectingProject(null)
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex h-full w-full max-w-md flex-col bg-white p-6 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  {inspectingProject.projectId}
                </span>
                <h3 className="text-base font-bold text-slate-800">{inspectingProject.projectName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingProject(null)}
                aria-label="Đóng chi tiết đồ án"
                className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 py-4 text-xs">
              <div>
                <h4 className="font-bold text-slate-700">Trạng thái các đợt Review Gate</h4>
                <div className="mt-2 space-y-1.5">
                  {Object.entries(inspectingProject.gateStatuses).map(([code, st]) => (
                    <div
                      key={code}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2.5"
                    >
                      <span className="font-bold text-slate-800">{code}</span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-bold ${
                          statusPillClasses[st]
                        }`}
                      >
                        {statusLabels[st]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Blockers Explanation */}
              {inspectingProject.blockingReasons && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-amber-900">
                  <strong className="block font-bold">Lý do chưa đạt / Kiến nghị của Reviewer:</strong>
                  {Object.entries(inspectingProject.blockingReasons).map(([code, reasons]) => (
                    <ul key={code} className="mt-1 list-disc pl-4 space-y-1 text-xs text-amber-800">
                      {reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  ))}
                </div>
              )}

              {/* Reviewer Action Simulation (Mock/Dev) or Read-Only Governance Notice */}
              {env.reviewGatesMockEnabled ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3.5 space-y-3">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                      Mô phỏng Sandbox
                    </span>
                    <strong className="block text-xs font-bold text-slate-800">
                      Ghi nhận kết luận thẩm định (Reviewer Scoped Decision)
                    </strong>
                  </div>
                  <p className="text-xs text-amber-800">
                    Chỉ dùng trong môi trường thử nghiệm Frontend (Sandbox / Mock). Không có giá trị phê duyệt học vụ chính thức.
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600">Chọn Gate</label>
                      <select
                        value={selectedGateToDecide}
                        onChange={e => setSelectedGateToDecide(e.target.value)}
                        className="mt-1 w-full rounded border border-slate-200 bg-white p-1.5 text-xs font-semibold"
                      >
                        {Object.keys(inspectingProject.gateStatuses).map(c => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600">Kết luận</label>
                      <select
                        value={decisionChoice}
                        onChange={e => setDecisionChoice(e.target.value as 'PASSED' | 'REVISION_REQUIRED' | 'IN_REVIEW')}
                        className="mt-1 w-full rounded border border-slate-200 bg-white p-1.5 text-xs font-semibold"
                      >
                        <option value="PASSED">ĐẠT (PASSED)</option>
                        <option value="REVISION_REQUIRED">CẦN SỬA (REVISION)</option>
                        <option value="IN_REVIEW">ĐANG XÉT (IN_REVIEW)</option>
                      </select>
                    </div>
                  </div>

                  {decisionError && (
                    <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                      <strong className="block font-bold">Lỗi cập nhật quyết định:</strong>
                      <span>{decisionError}</span>
                      {decisionError.includes('409') && (
                        <p className="mt-1 text-xs text-rose-600 italic">
                          Dữ liệu đã có thay đổi mới từ người dùng khác. Vui lòng kiểm tra lại trước khi gửi.
                        </p>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={updatingDecision}
                    onClick={async () => {
                      try {
                        setUpdatingDecision(true)
                        setDecisionError(null)
                        await onUpdateDecision(inspectingProject.projectId, selectedGateToDecide, decisionChoice)
                        setInspectingProject(prev =>
                          prev
                            ? {
                                ...prev,
                                gateStatuses: {
                                  ...prev.gateStatuses,
                                  [selectedGateToDecide]: decisionChoice,
                                },
                              }
                            : null,
                        )
                      } catch (err: unknown) {
                        const msg = err instanceof Error ? err.message : 'Không thể cập nhật quyết định thẩm định.'
                        setDecisionError(msg)
                      } finally {
                        setUpdatingDecision(false)
                      }
                    }}
                    className="w-full rounded-lg bg-primary py-2 text-xs font-bold text-white shadow-2xs hover:bg-primary-hover disabled:opacity-50"
                  >
                    {updatingDecision ? 'Đang cập nhật...' : 'Cập nhật quyết định Reviewer'}
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-slate-500">visibility</span>
                    <strong className="block text-xs font-bold text-slate-800">
                      Giám sát Tiến trình Thẩm định
                    </strong>
                  </div>
                  <p className="text-xs text-slate-600">
                    Giao diện này dành riêng cho việc giám sát tiến độ của Khoa / Bộ môn. Quyết định thẩm định chính thức chỉ được thực hiện bởi Reviewer được phân công thông qua Hàng đợi thẩm định với mã token xác thực.
                  </p>
                </div>
              )}

              {inspectingProject.mode === 'INTERDISCIPLINARY' && onSelectHybridProject && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectHybridProject(inspectingProject.projectId)
                    setInspectingProject(null)
                  }}
                  className="w-full rounded-lg border border-primary/30 bg-primary-subtle py-2 text-xs font-bold text-primary hover:bg-primary/20"
                >
                  Mở bảng kiểm duyệt liên ngành (Integration Gate) →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
