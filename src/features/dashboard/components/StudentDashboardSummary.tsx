import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { HttpError } from '../../../services/http/http-client'
import { getStudentDashboard, type StudentDashboard } from '../api/dashboard-api'
import { getStudentReviewTimeline } from '../../review-gates/api/review-gates-api'
import type { StudentReviewTimelineDto } from '../../review-gates/types/review-gates.types'
import { getWeeklyAssessmentHistory, type WeeklyAssessment } from '../../../services/api/weekly.api'
import { projectStatusLabel } from '../../projects/utils/project-status'
import { PageLoading } from '../../../components/ui/PageLoading'
import { HealthPulseBadge } from '../../../components/ui/HealthPulseBadge'

export function StudentDashboardSummary() {
  const [data, setData] = useState<StudentDashboard | null>(null)
  const [timeline, setTimeline] = useState<StudentReviewTimelineDto | null>(null)
  const [latestAssessment, setLatestAssessment] = useState<WeeklyAssessment | null>(null)
  const [weeklyStatus, setWeeklyStatus] = useState<'ok' | 'forbidden' | 'unavailable'>('ok')
  const [taskTab, setTaskTab] = useState<'urgent' | 'upcoming' | 'all'>('urgent')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const dashboard = await getStudentDashboard()
      setData(dashboard)
      setError(null)

      if (dashboard.project?.id) {
        try {
          const tl = await getStudentReviewTimeline(String(dashboard.project.id))
          setTimeline(tl)
        } catch {
          // Review timeline is optional or may be unconfigured; keep null gracefully
          setTimeline(null)
        }

        try {
          const weekly = await getWeeklyAssessmentHistory(dashboard.project.id, {}, 1, 1)
          setLatestAssessment(weekly.items[0] ?? null)
          setWeeklyStatus('ok')
        } catch (weeklyErr) {
          setLatestAssessment(null)
          setWeeklyStatus(weeklyErr instanceof HttpError && weeklyErr.status === 403 ? 'forbidden' : 'unavailable')
        }
      }
    } catch (reason) {
      setError(
        reason instanceof HttpError && reason.status === 403
          ? 'Bạn không có quyền xem tổng quan cá nhân.'
          : 'Không thể tải chỉ số cá nhân.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <PageLoading label="Đang tải tổng quan tiến độ đồ án…" />

  if (error || !data) {
    return (
      <section role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-5 text-sm text-status-error-text">
        <p className="font-semibold">Chưa tải được tổng quan cá nhân</p>
        <p className="mt-1">{error ?? 'Không có dữ liệu trả về.'}</p>
        <button
          type="button"
          className="mt-2 min-h-11 font-semibold underline underline-offset-4"
          onClick={() => void load()}
        >
          Tải lại
        </button>
      </section>
    )
  }

  const project = data.project
  const analysis = project?.analysis
  const taskProgress = analysis?.progressSummary?.progressPercentage
  const academicProgress = timeline?.academicProgress
  const blockingReasonsCount = timeline?.capabilities?.blockingReasons?.length ?? 0
  const isDefenseReady = timeline?.isDefenseReady === true && blockingReasonsCount === 0

  // Evidence counts from all available gates in review timeline
  const allRequirements = timeline?.gates.flatMap(g => g.requirements) ?? []
  const acceptedRequirements = allRequirements.filter(r => r.verificationStatus === 'ACCEPTED').length
  const totalRequirements = allRequirements.length

  // Unified task deadline slices (no more duplicate "Việc cần làm hôm nay" + "Công việc sắp đến hạn")
  const taskDeadlines = data.taskDeadlines ?? []
  const urgentTaskList = taskDeadlines.filter(t => t.isOverdue || t.status === 'BLOCKED')
  const upcomingTaskList = taskDeadlines.filter(t => !t.isOverdue && t.status !== 'BLOCKED')
  const effectiveTaskTab = taskTab === 'urgent' && urgentTaskList.length === 0 && upcomingTaskList.length > 0 ? 'upcoming' : taskTab
  const visibleTasks = effectiveTaskTab === 'urgent' ? urgentTaskList : effectiveTaskTab === 'upcoming' ? upcomingTaskList : taskDeadlines

  return (
    <section className="space-y-6" aria-label="Tổng quan tiến độ đồ án sinh viên">
      <div>
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Tổng quan tiến độ đồ án
            </h2>
            {project && (
              <span className="rounded-md border border-hairline bg-card px-2 py-0.5 text-xs font-semibold text-ink-soft">
                {project.code} · {projectStatusLabel(project.status)}
              </span>
            )}
            {(analysis?.healthPulseStatus || analysis?.riskLevel) && (
              <HealthPulseBadge
                healthPulseStatus={analysis.healthPulseStatus}
                riskLevel={analysis.riskLevel}
                signals={analysis.healthPulseSignals}
              />
            )}
          </div>
          <span className="text-xs text-ink-muted">
            Cập nhật lúc:{' '}
            {data.asOfUtc && Number.isFinite(Date.parse(data.asOfUtc))
              ? new Date(data.asOfUtc).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })
              : 'Vừa cập nhật'}
          </span>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Gauge 1: Tiến độ công việc (Tasks %) */}
          <div className="flex h-full flex-col justify-between rounded-xl border border-line-strong/75 border-t-[3px] border-t-primary bg-card p-4 shadow-xs">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.04em] text-ink-muted">Tiến độ công việc</span>
                <span className="material-symbols-outlined grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-subtle text-[18px] text-primary" aria-hidden="true">task_alt</span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-ink tabular-nums">
                  {taskProgress != null ? `${taskProgress.toFixed(0)}%` : '—'}
                </span>
                <span className="text-xs text-ink-muted">
                  {taskProgress != null ? 'thực thi nội bộ' : 'Chưa có dữ liệu'}
                </span>
              </div>
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-canvas">
                <div
                  className="shimmer-progress h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, taskProgress ?? 0))}%` }}
                />
              </div>
            </div>
            <p className="mt-2.5 text-xs text-ink-muted">
              Đang mở: <strong className="text-ink">{data.assignedOpenTasks ?? 0}</strong> · Quá hạn:{' '}
              <strong className={(data.assignedOverdueTasks ?? 0) > 0 ? 'text-status-error-text' : 'text-ink'}>
                {data.assignedOverdueTasks ?? 0}
              </strong>
            </p>
          </div>

          {/* Gauge 2: Tiến độ cổng kiểm duyệt */}
          <div className="flex h-full flex-col justify-between rounded-xl border border-line-strong/75 border-t-[3px] border-t-status-success-text bg-card p-4 shadow-xs">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.04em] text-ink-muted">Tiến độ cổng kiểm duyệt</span>
                <span className="material-symbols-outlined grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-status-success-bg text-[18px] text-status-success-text" aria-hidden="true">verified</span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-ink tabular-nums">
                  {academicProgress != null ? `${academicProgress.toFixed(0)}%` : '—'}
                </span>
                <span className="text-xs text-ink-muted">
                  {academicProgress != null ? 'trọng số đã duyệt' : 'Chưa cấu hình'}
                </span>
              </div>
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-canvas">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, academicProgress ?? 0))}%` }}
                />
              </div>
            </div>
            <p className="mt-2.5 truncate text-xs text-ink-muted" title={timeline?.academicProgressSource ?? 'Chưa cấu hình chính sách cổng'}>
              Cổng hiện tại: <strong className="text-ink">{timeline?.currentGateCode?.trim() || 'Chưa mở cổng'}</strong>
            </p>
          </div>

          {/* Gauge 3: Minh chứng đã duyệt */}
          <div className="flex h-full flex-col justify-between rounded-xl border border-line-strong/75 border-t-[3px] border-t-primary bg-card p-4 shadow-xs">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.04em] text-ink-muted">Minh chứng đã duyệt</span>
                <span className="material-symbols-outlined grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-subtle text-[18px] text-primary" aria-hidden="true">fact_check</span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-ink tabular-nums">
                  {totalRequirements > 0 ? `${acceptedRequirements}/${totalRequirements}` : '—'}
                </span>
                <span className="text-xs text-ink-muted">
                  {totalRequirements > 0 ? 'yêu cầu đạt' : 'Chưa có yêu cầu'}
                </span>
              </div>
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-canvas">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: totalRequirements > 0 ? `${Math.min(100, (acceptedRequirements / totalRequirements) * 100)}%` : '0%' }}
                />
              </div>
            </div>
            <p className="mt-2.5 text-xs text-ink-muted">
              Được hội đồng thẩm định chấp thuận
            </p>
          </div>

          {/* Gauge 4: Điều kiện bảo vệ */}
          <div className={`flex h-full flex-col justify-between rounded-xl border border-line-strong/75 border-t-[3px] ${isDefenseReady ? 'border-t-status-success-text' : 'border-t-status-warning-text'} bg-card p-4 shadow-xs`}>
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.04em] text-ink-muted">Điều kiện bảo vệ</span>
                <span className={`material-symbols-outlined grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[18px] ${isDefenseReady ? 'bg-status-success-bg text-status-success-text' : 'bg-status-warning-bg text-status-warning-text'}`} aria-hidden="true">gavel</span>
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold ${
                    isDefenseReady
                      ? 'bg-status-success-bg text-status-success-text border border-status-success-border'
                      : 'bg-status-warning-bg text-status-warning-text border border-status-warning-border'
                  }`}
                >
                  {!isDefenseReady && (
                    <span className="pulse-indicator h-1.5 w-1.5 bg-warning-strong" aria-hidden="true" />
                  )}
                  {isDefenseReady ? 'SẴN SÀNG BẢO VỆ' : 'CHƯA ĐỦ ĐIỀU KIỆN'}
                </span>
              </div>
            </div>
            <p className="mt-2.5 truncate text-xs text-ink-muted" title={timeline?.defenseReadinessStatus ?? 'Đang trong tiến trình học kỳ'}>
              {blockingReasonsCount > 0
                ? `Còn ${blockingReasonsCount} điều kiện cần hoàn thiện`
                : 'Theo dõi qua các cổng kiểm duyệt'}
            </p>
          </div>
        </div>
      </div>

      {/* CÔNG VIỆC CẦN CHÚ Ý & MỐC SẮP ĐẾN HẠN (Hợp nhất 2 cột cân bằng chiều cao) */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.9fr)] lg:items-stretch">
        <section className="space-y-3 rounded-2xl border border-hairline bg-card p-5 shadow-xs sm:p-6" aria-labelledby="flight-deck-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]" aria-hidden="true">bolt</span>
              <h2 id="flight-deck-heading" className="font-heading text-base font-bold text-ink">
                Công việc cần chú ý
              </h2>
            </div>
            {project?.status === 'ACTIVE' ? (
              <Link
                to="/project/tasks"
                className="inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-primary underline underline-offset-4 hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Xem bảng công việc →
              </Link>
            ) : project?.status === 'FINAL_SUBMISSION' ? (
              <Link
                to="/project/final-submission"
                className="inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-primary underline underline-offset-4 hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Mở bàn giao cuối kỳ →
              </Link>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Lọc công việc cần chú ý">
            {([
              ['urgent', `Quá hạn / Bị chặn (${urgentTaskList.length})`],
              ['upcoming', `Sắp đến hạn (${upcomingTaskList.length})`],
              ['all', `Tất cả (${taskDeadlines.length})`],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={effectiveTaskTab === key}
                onClick={() => setTaskTab(key)}
                className={`min-h-9 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  effectiveTaskTab === key
                    ? 'border border-primary/25 bg-primary-subtle text-primary'
                    : 'border border-transparent text-ink-muted hover:bg-canvas hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {visibleTasks.length === 0 ? (
            <div className="py-6 text-center text-xs text-ink-muted">
              <span className="material-symbols-outlined text-3xl text-status-success-text" aria-hidden="true">check_circle</span>
              <p className="mt-1 font-semibold text-ink">
                {effectiveTaskTab === 'urgent' ? 'Không có công việc nào quá hạn hoặc bị chặn!' : 'Chưa có công việc nào sắp đến hạn.'}
              </p>
              <p className="text-ink-muted">Bạn có thể tiếp tục triển khai các hạng mục tiếp theo trong kế hoạch.</p>
            </div>
          ) : (
            <ul className="divide-y divide-hairline">
              {visibleTasks.slice(0, 6).map((task) => (
                <li key={task.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        task.isOverdue
                          ? 'bg-status-error-bg text-status-error-text'
                          : task.status === 'BLOCKED'
                            ? 'bg-status-warning-bg text-status-warning-text'
                            : 'bg-primary-subtle text-primary'
                      }`}
                    >
                      {task.isOverdue ? '!' : '#'}
                    </span>
                    <div className="min-w-0">
                      <Link
                        to={project?.status === 'FINAL_SUBMISSION' ? '/project/final-submission' : `/project/tasks/${task.id}`}
                        className="font-semibold text-sm text-ink hover:text-primary line-clamp-1"
                      >
                        {task.title}
                      </Link>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                        <span className={task.isOverdue ? 'font-bold text-status-error-text' : ''}>
                          Hạn chót: {formatDate(task.dueAtUtc)}
                          {task.isOverdue && ' (Đã quá hạn)'}
                        </span>
                        {task.status === 'BLOCKED' && (
                          <>
                            <span>·</span>
                            <span className="font-semibold text-status-warning-text">Đang bị chặn</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                    <Link
                      to={project?.status === 'FINAL_SUBMISSION' ? '/project/final-submission' : `/project/tasks/${task.id}`}
                      className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-hairline bg-canvas px-3 text-xs font-semibold text-ink-soft transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      {project?.status === 'FINAL_SUBMISSION' ? 'Xem bàn giao' : 'Xử lý ngay'}
                      <span className="material-symbols-outlined text-[15px]" aria-hidden="true">arrow_forward</span>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <DeadlineList
          title="Mốc đồ án sắp đến hạn"
          empty="Chưa có mốc nào sắp đến hạn cần chú ý."
          items={(data.milestoneDeadlines ?? []).map(item => ({
            id: item.id,
            title: item.title,
            date: item.dueDate,
            overdue: item.isOverdue,
            href: project?.status === 'FINAL_SUBMISSION' ? '/project/final-submission' : `/project/milestones/${item.id}`,
          }))}
        />
      </div>

      {/* =========================================================================
          ĐÁNH GIÁ & NHẬN XÉT ĐỊNH KỲ TỪ GVHD
          ========================================================================= */}
      {project && (
        <section className="rounded-2xl border border-hairline bg-card p-5 shadow-xs sm:p-6" aria-labelledby="weekly-feedback-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]" aria-hidden="true">rate_review</span>
              <div>
                <h3 id="weekly-feedback-heading" className="font-heading text-base font-bold text-ink">
                  Đánh giá & Nhận xét tuần từ GVHD
                </h3>
                <p className="text-xs text-ink-muted">
                  Phản hồi định kỳ hằng tuần giúp theo dõi tiến độ và nhận xét học thuật từ giảng viên hướng dẫn.
                </p>
              </div>
            </div>
            <Link
              to="/project/weekly-assessments"
              className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-primary underline underline-offset-4 hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Xem chi tiết các tuần →
            </Link>
          </div>

          {latestAssessment ? (
            <div className="mt-4 rounded-xl border border-hairline bg-canvas/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-primary-subtle px-2.5 py-1 text-xs font-bold text-primary">
                    Tuần {latestAssessment.weekNumber}
                  </span>
                  <span className="text-xs text-ink-muted">
                    {formatDate(latestAssessment.startDate)} – {formatDate(latestAssessment.endDate)}
                  </span>
                </div>
                {latestAssessment.totalScore != null && (
                  <span className="rounded-full bg-status-success-bg px-3 py-1 font-mono text-xs font-bold text-status-success-text border border-status-success-border">
                    Điểm tham khảo: {latestAssessment.totalScore.toFixed(2)}/10
                  </span>
                )}
              </div>

              {latestAssessment.comments ? (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-ink-soft">Nhận xét của giảng viên hướng dẫn:</p>
                  <p className="mt-1 whitespace-pre-wrap rounded-lg bg-card p-3 text-xs leading-relaxed text-ink border border-hairline">
                    "{latestAssessment.comments}"
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-xs italic text-ink-muted">
                  Bản chấm tuần {latestAssessment.weekNumber} chưa có ghi chú chung.
                </p>
              )}

              {latestAssessment.scores.length > 0 && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {latestAssessment.scores.map(s => (
                    <div key={s.rubricCriterionId} className="rounded-lg border border-hairline bg-card p-2 text-xs">
                      <div className="flex items-center justify-between gap-1 font-medium text-ink-soft">
                        <span className="truncate" title={s.name}>{s.name}</span>
                        <strong className="font-mono text-ink shrink-0">{s.score != null ? `${s.score}/${s.maxScore}` : '—'}</strong>
                      </div>
                      {s.comments && <p className="mt-1 text-xs text-ink-muted line-clamp-2">"{s.comments}"</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : weeklyStatus === 'forbidden' ? (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-hairline bg-canvas/40 p-4 text-xs text-ink-muted" role="status">
              <span className="material-symbols-outlined text-2xl text-ink-muted" aria-hidden="true">lock</span>
              <div>
                <p className="font-semibold text-ink">Chưa mở quyền xem lịch sử đánh giá tuần</p>
                <p className="mt-0.5">Mục này chỉ hiển thị khi kỳ học vụ hoặc giảng viên bật chế độ chia sẻ đánh giá định kỳ.</p>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-hairline bg-canvas p-4 text-xs text-ink-muted">
              <span className="material-symbols-outlined text-2xl text-ink-muted" aria-hidden="true">info</span>
              <div>
                <p className="font-semibold text-ink">Chưa có đánh giá tuần nào được công bố</p>
                <p className="mt-0.5">Giảng viên hướng dẫn sẽ theo dõi và gửi phản hồi định kỳ mỗi tuần theo tiến độ đồ án.</p>
              </div>
            </div>
          )}
        </section>
      )}

      <p className="text-xs leading-5 text-ink-muted">
        Chỉ số đóng góp: {contributionStatusLabel(data.contributionDataStatus)}. Lưu ý: Chỉ báo đóng góp và tiến độ công
        việc phản ánh nhịp độ thực thi, không thay thế cho kết quả thẩm định học thuật chính thức.
      </p>
    </section>
  )
}

function DeadlineList({
  title,
  empty,
  items,
}: {
  title: string
  empty: string
  items: Array<{ id: number; title: string; date: string; overdue: boolean; href: string }>
}) {
  return (
    <section className="flex h-full flex-col rounded-2xl border border-hairline bg-card p-5 shadow-xs sm:p-6">
      <h3 className="font-heading text-sm font-bold text-ink">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-ink-muted">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-hairline text-xs">
          {items.map(item => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <Link
                to={item.href}
                className="font-medium text-ink hover:text-primary underline underline-offset-4 line-clamp-1"
              >
                {item.title}
              </Link>
              <span className={item.overdue ? 'font-bold text-status-error-text' : 'text-ink-muted'}>
                {formatDate(item.date)}
                {item.overdue ? ' · Quá hạn' : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(date)
}

function contributionStatusLabel(value: string) {
  return (
    ({
      CURRENT: 'Đã cập nhật',
      SUFFICIENT: 'Đủ dữ liệu',
      INSUFFICIENT: 'Chưa đủ dữ liệu',
      UNAVAILABLE: 'Chưa có dữ liệu',
    } as Record<string, string>)[value] ?? value
  )
}
