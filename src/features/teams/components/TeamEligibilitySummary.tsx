import type { TeamDto } from '../../../types/backend'
import { useTeamEligibility } from '../hooks/useTeamEligibility'

interface TeamEligibilitySummaryProps {
  team: TeamDto
  majorNames?: Record<number, string>
  canRefresh: boolean
  refreshPending: boolean
  canContinueToRegistration: boolean
  onRefresh: () => Promise<void>
  onContinueToRegistration: () => void
}

export function TeamEligibilitySummary({
  team, majorNames = {}, canRefresh, refreshPending, canContinueToRegistration, onRefresh, onContinueToRegistration,
}: TeamEligibilitySummaryProps) {
  const eligibility = useTeamEligibility(team)
  if (!eligibility) return null
  const pass = eligibility.status === 'PASS'
  const refresh = async () => {
    try { await onRefresh() } catch { /* Classified feedback is rendered by the Team workspace. */ }
  }

  return (
    <section className={`rounded-md border p-5 ${pass ? 'border-status-success-border bg-status-success-bg' : 'border-status-warning-border bg-status-warning-bg'}`}>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${pass ? 'bg-status-success-bg text-status-success-text' : 'bg-status-warning-bg text-status-warning-text'}`}>
            <span className="material-symbols-outlined">{pass ? 'verified' : 'warning'}</span>
          </div>
          <div>
            <p className="text-xs font-medium text-ink-muted">Điều kiện đăng ký</p>
            <h3 className={`mt-0.5 text-base font-bold ${pass ? 'text-status-success-text' : 'text-status-warning-text'}`}>
              {pass ? 'Nhóm đủ điều kiện đăng ký' : 'Nhóm cần hoàn thiện điều kiện đăng ký'}
            </h3>
            <p className="mt-1 text-xs text-ink-muted">
              Kiểm tra các điều kiện bên dưới trước khi đăng ký đề tài.
            </p>
          </div>
        </div>
        {canRefresh && (
          <button type="button" onClick={() => void refresh()} disabled={refreshPending}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50">
            <span className={`material-symbols-outlined text-[16px] ${refreshPending ? 'animate-spin' : ''}`}>refresh</span>
            {refreshPending ? 'Đang kiểm tra...' : 'Kiểm tra lại'}
          </button>
        )}
      </div>

      {!canRefresh && !pass && (
        <p className="mt-3 text-xs text-status-warning-text">
          Bạn có thể xem kết quả kiểm tra hiện tại. Liên hệ trưởng nhóm nếu cần cập nhật thông tin.
        </p>
      )}

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="py-3">
          <p className="text-xs font-medium text-ink-muted">Hình thức đồ án</p>
          <p className="mt-1 text-sm font-medium text-ink">{eligibility.mode === 'INTERDISCIPLINARY' ? 'Liên ngành' : 'Đơn ngành'}</p>
          {eligibility.mode === 'SINGLE_MAJOR' && (
            <p className="mt-1 text-xs text-ink-muted">Các thành viên cần thuộc ngành đăng ký của nhóm.</p>
          )}
        </div>
        <div className="py-3">
          <p className="text-xs font-medium text-ink-muted">Thành viên được kiểm tra</p>
          <ul className="mt-1 space-y-1 text-xs text-ink-soft">
            {eligibility.members.map((member) => <li key={member.userId}>{member.fullName}</li>)}
          </ul>
        </div>
      </div>

      {eligibility.requirements.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-medium text-ink-muted">Yêu cầu thành viên theo ngành</h4>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {eligibility.requirements.map((requirement) => (
              <div key={requirement.majorId} className="border-b border-hairline py-3 text-xs">
                <p className="font-medium text-ink">{majorNames[requirement.majorId] ?? 'Chưa có thông tin ngành'}</p>
                <p className="mt-1 text-ink-muted">{requirement.minMembers}–{requirement.maxMembers} thành viên</p>
                <p className="mt-1 text-ink-muted">Vai trò: {requirement.responsibility}</p>
                <p className={`mt-2 font-semibold ${requirement.status === 'FAIL' ? 'text-status-error-text' : 'text-status-success-text'}`}>
                  {requirement.status === 'FAIL' ? 'Chưa đạt yêu cầu về sĩ số' : 'Không có vi phạm về sĩ số'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!pass && (
        <div className="mt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted">Điều kiện cần xử lý</h4>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {eligibility.issues.map((issue) => (
              <div key={issue.code} className="border-b border-status-warning-border py-3">
                <p className="text-xs font-bold text-status-warning-text">{issue.title}</p>
                <p className="mt-1 text-xs text-ink-soft">{issue.detail}</p>
                <p className="mt-1.5 text-xs font-medium text-status-warning-text">Tiếp theo: {issue.recovery}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 border-t border-hairline pt-4 sm:flex-row sm:items-center sm:justify-between">
        {pass && canContinueToRegistration && (
          <button type="button" onClick={onContinueToRegistration} className="shrink-0 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-white hover:bg-primary-hover">
            Tiếp tục đăng ký đề tài
          </button>
        )}
      </div>
    </section>
  )
}
