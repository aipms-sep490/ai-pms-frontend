import { useState } from 'react'
import type { DefenseReadinessSummary } from '../types/review-gates.types'

interface DefenseReadinessCheckerProps {
  summary: DefenseReadinessSummary
  onRecheck?: () => void
}

export function DefenseReadinessChecker({
  summary,
  onRecheck,
}: DefenseReadinessCheckerProps) {
  const [activeTab, setActiveTab] = useState<'project' | 'student'>('project')

  return (
    <div className="space-y-6">
      {/* Top Context Header */}
      <div className="rounded-xl border border-hairline bg-card p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Nghiệm thu học thuật cuối kỳ
            </span>
            <h2 className="text-lg font-bold text-ink">
              Xét điều kiện tham gia bảo vệ đồ án tốt nghiệp (Defense Readiness)
            </h2>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold border ${
              summary.isReady
                ? 'bg-status-success-bg text-status-success-text border-status-success-border'
                : 'bg-status-error-bg text-danger-text border-status-error-border'
            }`}
          >
            {summary.isReady ? 'ĐỦ ĐIỀU KIỆN BẢO VỆ' : 'CHƯA ĐỦ ĐIỀU KIỆN'}
          </span>
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          Đồ án: <strong className="text-ink">{summary.projectId}</strong> – {summary.projectName}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Conditions Checklist */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-xl border border-hairline bg-card shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('project')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    activeTab === 'project'
                      ? 'bg-primary text-white'
                      : 'bg-canvas text-ink-muted hover:bg-slate-200'
                  }`}
                >
                  Điều kiện của nhóm đồ án
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('student')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    activeTab === 'student'
                      ? 'bg-primary text-white'
                      : 'bg-canvas text-ink-muted hover:bg-slate-200'
                  }`}
                >
                  Điều kiện từng thành viên (Per-student)
                </button>
              </div>

              {onRecheck && (
                <button
                  type="button"
                  onClick={onRecheck}
                  className="rounded-lg border border-hairline px-3 py-1 text-xs font-semibold text-ink-muted hover:bg-canvas"
                >
                  ↻ Kiểm tra lại
                </button>
              )}
            </div>

            {activeTab === 'project' ? (
              <div className="space-y-3">
                {summary.conditions.map(c => {
                  const isPass = c.satisfied === true
                  const isFail = c.satisfied === false
                  return (
                    <div
                      key={c.id}
                      className={`flex items-start justify-between gap-4 rounded-xl border p-4 transition-all ${
                        isPass
                          ? 'border-status-success-border bg-status-success-bg'
                          : isFail
                          ? 'border-status-error-border bg-status-error-bg/30'
                          : 'border-hairline bg-canvas/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${
                            isPass
                              ? 'bg-primary text-white'
                              : isFail
                              ? 'bg-danger-strong text-white'
                              : 'bg-slate-300 text-ink-soft'
                          }`}
                        >
                          {isPass ? '✓' : isFail ? '✕' : '?'}
                        </span>
                        <div>
                          <strong className="block text-xs font-bold text-ink">
                            {c.title}
                          </strong>
                          <p className="mt-1 text-xs text-ink-muted leading-relaxed">{c.detail}</p>
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold border shrink-0 ${
                          isPass
                            ? 'bg-status-success-bg text-status-success-text border-status-success-border'
                            : isFail
                            ? 'bg-status-error-bg text-danger-text border-status-error-border'
                            : 'bg-canvas text-ink-muted border-hairline'
                        }`}
                      >
                        {isPass ? 'ĐẠT (PASS)' : isFail ? 'CHƯA ĐẠT (BLOCKED)' : 'CHỜ DUYỆT'}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-hairline bg-canvas/50 p-6 text-center text-xs text-ink-muted space-y-2">
                <p className="font-semibold text-ink-soft">Xét duyệt điều kiện cá nhân từng sinh viên</p>
                <p>
                  Dữ liệu được đồng bộ từ Phòng Đào tạo (tích lũy tín chỉ, học phí, kỷ luật học vụ).
                  Hệ thống không suy luận sinh viên bị trượt chỉ dựa vào số file nộp hoặc phân tích đóng góp Task.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Readiness Evaluation Summary */}
        <div className="lg:col-span-4 space-y-4">
          <div
            className={`rounded-xl border p-5 shadow-xs ${
              summary.isReady
                ? 'border-status-success-border bg-status-success-bg text-status-success-text'
                : 'border-status-error-border bg-status-error-bg/70 text-danger-text'
            }`}
          >
            <span className="text-xs font-bold uppercase tracking-wider">
              Kết luận xét điều kiện bảo vệ
            </span>
            <div className="mt-2 text-3xl font-black">
              {summary.isReady ? 'READY FOR DEFENSE' : 'NOT READY'}
            </div>
            <p className="mt-2 text-xs leading-relaxed opacity-90">
              {summary.isReady
                ? 'Đồ án đã đáp ứng đầy đủ tất cả các điều kiện tiên quyết học thuật. Nhóm sinh viên chính thức được phép phân hội đồng và xếp lịch bảo vệ.'
                : `Có ${summary.blockedCount} điều kiện bắt buộc chưa hoàn tất. Nhóm chưa được phép xếp lịch bảo vệ chính thức.`}
            </p>
          </div>

          <div className="rounded-xl border border-hairline bg-card p-4 text-xs text-ink-muted space-y-3 shadow-xs">
            <h4 className="font-bold text-ink uppercase tracking-wider text-xs">
              Quy tắc học thuật chuẩn mực
            </h4>
            <div className="space-y-2 border-t border-slate-100 pt-2">
              <div className="flex justify-between">
                <span>Được quyền nộp Final Submission?</span>
                <span className="font-bold text-ink">
                  {summary.conditions[0]?.satisfied ? 'CÓ' : 'KHÓA'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Được xếp lịch bảo vệ?</span>
                <span className="font-bold text-ink">
                  {summary.isReady ? 'CHO PHÉP' : 'CHƯA ĐƯỢC'}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Điều kiện bảo vệ (Defense Readiness) tách biệt hoàn toàn với điểm bảo vệ (Defense Score) và xếp loại tốt nghiệp cuối cùng.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
