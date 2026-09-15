import type { TeamDto } from '../../../types/backend'
import { useTeamEligibility } from '../hooks/useTeamEligibility'

interface TeamEligibilitySummaryProps {
  team: TeamDto
  canRefresh: boolean
  refreshPending: boolean
  canContinueToRegistration: boolean
  onRefresh: () => Promise<void>
  onContinueToRegistration: () => void
}

export function TeamEligibilitySummary({
  team, canRefresh, refreshPending, canContinueToRegistration, onRefresh, onContinueToRegistration,
}: TeamEligibilitySummaryProps) {
  const eligibility = useTeamEligibility(team)
  if (!eligibility) return null
  const pass = eligibility.status === 'PASS'
  const refresh = async () => {
    try { await onRefresh() } catch { /* Classified feedback is rendered by the Team workspace. */ }
  }

  return (
    <section className={`rounded-2xl border p-5 ${pass ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50'}`}>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${pass ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
            <span className="material-symbols-outlined">{pass ? 'verified' : 'warning'}</span>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Backend eligibility</p>
            <h3 className={`mt-0.5 text-base font-bold ${pass ? 'text-emerald-950' : 'text-amber-950'}`}>
              {pass ? 'PASS — nhóm có thể mở đăng ký đề tài' : 'FAIL — nhóm chưa thể mở đăng ký đề tài'}
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              Kết quả lấy từ Team API hiện tại{eligibility.policyVersion ? ` · Policy ${eligibility.policyVersion}` : ''}{eligibility.registrationPeriodId ? ` · Đợt #${eligibility.registrationPeriodId}` : ''}.
            </p>
          </div>
        </div>
        {canRefresh && (
          <button type="button" onClick={() => void refresh()} disabled={refreshPending}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50">
            <span className={`material-symbols-outlined text-[16px] ${refreshPending ? 'animate-spin' : ''}`}>refresh</span>
            {refreshPending ? 'Đang kiểm tra...' : 'Kiểm tra eligibility'}
          </button>
        )}
      </div>

      {!canRefresh && !pass && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-white/70 p-2.5 text-xs text-amber-900">
          Chỉ Trưởng nhóm được backend cho phép chạy kiểm tra eligibility. Bạn vẫn có thể xem kết quả và các điều kiện cần xử lý.
        </p>
      )}

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Project mode</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{eligibility.mode}</p>
          {eligibility.mode === 'SINGLE_MAJOR' && (
            <p className="mt-1 text-xs text-slate-600">Primary Major: {eligibility.primaryMajorId ? `Major #${eligibility.primaryMajorId}` : 'Backend chưa trả Primary Major'}</p>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Verified roster</p>
          <ul className="mt-1 space-y-1 text-xs text-slate-700">
            {eligibility.members.map((member) => <li key={member.userId}>{member.fullName} — {member.majorId ? `Major #${member.majorId}` : 'Backend chưa xác thực Major'}</li>)}
          </ul>
        </div>
      </div>

      {eligibility.requirements.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Major requirements do backend xác thực</h4>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {eligibility.requirements.map((requirement) => (
              <div key={requirement.majorId} className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
                <p className="font-bold text-slate-900">Major #{requirement.majorId}</p>
                <p className="mt-1 text-slate-600">Min {requirement.minMembers} · Max {requirement.maxMembers}</p>
                <p className="mt-1 text-slate-600">Vai trò: {requirement.responsibility}</p>
                <p className={`mt-2 font-semibold ${requirement.status === 'FAIL' ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {requirement.status === 'FAIL' ? 'Backend báo quota chưa đạt' : 'Backend không báo vi phạm quota'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!pass && (
        <div className="mt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Điều kiện cần xử lý</h4>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {eligibility.issues.map((issue) => (
              <div key={issue.code} className="rounded-xl border border-amber-200 bg-white p-3">
                <p className="text-xs font-bold text-amber-950">{issue.title}</p>
                <p className="mt-1 text-xs text-slate-700">{issue.detail}</p>
                <p className="mt-1.5 text-[11px] font-medium text-amber-900">Tiếp theo: {issue.recovery}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] leading-relaxed text-slate-500">Backend chưa trả `checkedAt`, snapshot version hoặc `isStale`; màn hình không tự suy diễn trạng thái stale từ roster/timestamp.</p>
        {pass && canContinueToRegistration && (
          <button type="button" onClick={onContinueToRegistration} className="shrink-0 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700">
            Tiếp tục đăng ký đề tài
          </button>
        )}
      </div>
    </section>
  )
}
