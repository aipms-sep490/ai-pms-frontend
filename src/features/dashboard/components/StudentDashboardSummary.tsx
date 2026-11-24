import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { HttpError } from '../../../services/http/http-client'
import { getStudentDashboard, type StudentDashboard } from '../api/dashboard-api'
import { getStudentReviewTimeline } from '../../review-gates/api/review-gates-api'
import type { StudentReviewTimelineDto } from '../../review-gates/types/review-gates.types'
import { getWeeklyAssessmentHistory, type WeeklyAssessment } from '../../../services/api/weekly.api'
import { projectStatusLabel } from '../../projects/utils/project-status'
import { PageLoading } from '../../../components/ui/PageLoading'
import { Pagination } from '../../../components/ui/Pagination'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { useClientPagination } from '../../../components/ui/useClientPagination'

export function StudentDashboardSummary() {
  const [data, setData] = useState<StudentDashboard | null>(null)
  const [timeline, setTimeline] = useState<StudentReviewTimelineDto | null>(null)
  const [latestAssessment, setLatestAssessment] = useState<WeeklyAssessment | null>(null)
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
        } catch {
          setLatestAssessment(null)
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

  const urgentTasks = useMemo(() => {
    const taskDeadlines = data?.taskDeadlines ?? []
    return [
      ...taskDeadlines.filter(t => t.isOverdue || t.status === 'BLOCKED'),
      ...taskDeadlines.filter(t => !t.isOverdue && t.status !== 'BLOCKED'),
    ]
  }, [data?.taskDeadlines])
  const urgentPagination = useClientPagination(urgentTasks, 8)

  if (loading) return <PageLoading label="Đang tải buồng lái điều hành cá nhân…" />

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
  const isDefenseReady = timeline?.isDefenseReady

  // Evidence counts from all available gates in review timeline
  const allRequirements = timeline?.gates.flatMap(g => g.requirements) ?? []
  const acceptedRequirements = allRequirements.filter(r => r.verificationStatus === 'ACCEPTED').length
  const totalRequirements = allRequirements.length
  const blockingCount = timeline?.capabilities?.blockingReasons?.length ?? 0

  return (
    <section className="space-y-5" aria-label="Buồng lái điều hành đồ án sinh viên">
      <div>
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            Chỉ số điều hành đồ án
          </h2>
          <span className="font-mono text-xs text-ink-muted tabular-nums">
            Cập nhật lúc: {data.asOfUtc && Number.isFinite(Date.parse(data.asOfUtc)) ? new Date(data.asOfUtc).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}
          </span>
        </div>

        <StatTileRow tiles={[
          {
            icon: 'task_alt',
            label: 'Tiến độ công việc (%)',
            value: taskProgress != null ? Math.round(taskProgress) : null,
            hero: true,
            caption: `Đang mở: ${data.assignedOpenTasks ?? 0} · Quá hạn: ${data.assignedOverdueTasks ?? 0}`,
          },
          {
            icon: 'verified',
            label: 'Tiến độ học vụ (%)',
            value: academicProgress != null ? Math.round(academicProgress) : null,
            tone: 'info',
            caption: `Cổng hiện tại: ${timeline?.currentGateCode ?? 'R1'}`,
          },
          {
            icon: 'fact_check',
            label: 'Minh chứng đã duyệt',
            value: totalRequirements > 0 ? acceptedRequirements : null,
            tone: 'success',
            caption: totalRequirements > 0 ? `${acceptedRequirements}/${totalRequirements} yêu cầu hội đồng chấp thuận` : 'Chưa có yêu cầu minh chứng',
          },
          {
            icon: 'gavel',
            label: 'Điều kiện bảo vệ',
            value: isDefenseReady === true ? 0 : blockingCount,
            tone: isDefenseReady === true ? 'success' : 'warning',
            caption: isDefenseReady === true
              ? 'Sẵn sàng bảo vệ'
              : blockingCount > 0
                ? `Chưa đủ điều kiện · còn ${blockingCount} mục`
                : 'Chưa đủ điều kiện · theo dõi tiến trình cổng',
          },
        ]} />
      </div>

      {/* =========================================================================
          THÔNG TIN ĐỀ TÀI COMPACT STRIP
          ========================================================================= */}
      {project && (
        <section className="workspace-surface" aria-labelledby="project-status-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-primary">{project.code}</span>
                <StatusBadge status={project.status} tone="info" label={projectStatusLabel(project.status)} />
                <StatusBadge
                  tone={isDefenseReady === true ? 'success' : 'warning'}
                  label={isDefenseReady === true ? 'Sẵn sàng bảo vệ' : 'Chưa đủ điều kiện bảo vệ'}
                />
                {analysis?.riskLevel && (
                  <StatusBadge
                    tone={analysis.riskLevel === 'HIGH' || analysis.riskLevel === 'CRITICAL' ? 'danger' : 'warning'}
                    label={`Mức rủi ro: ${riskLabel(analysis.riskLevel)}`}
                  />
                )}
              </div>
              <h3 id="project-status-heading" className="mt-1 font-heading text-base font-bold text-ink">
                {project.title}
              </h3>
            </div>
            <Link
              to="/project/overview"
              className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-hairline bg-canvas px-3.5 text-xs font-semibold text-primary transition-colors hover:border-primary/40 hover:bg-primary-subtle"
            >
              Không gian đồ án
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span>
            </Link>
          </div>
        </section>
      )}

      {/* =========================================================================
          BENTO 2 CỘT: FLIGHT DECK + DEADLINES (TRÁI 7) | GVHD FEEDBACK + MILESTONES (PHẢI 5)
          ========================================================================= */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 items-start">
        {/* Left Bento Column: Flight Deck & Task Deadlines */}
        <div className="xl:col-span-7 space-y-5">
          <section className="workspace-surface" aria-labelledby="flight-deck-heading">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-canvas/70 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">bolt</span>
                <h2 id="flight-deck-heading" className="font-heading text-sm font-bold text-ink">
                  Việc cần làm hôm nay (Flight Deck)
                </h2>
                <span className="inline-flex items-center rounded-full border border-hairline bg-card px-2 py-0.5 text-xs font-bold tabular-nums text-ink-soft">
                  {urgentTasks.length}
                </span>
              </div>
              <Link
                to="/project/tasks"
                className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Xem toàn bộ bảng công việc →
              </Link>
            </div>

            <div className="px-5 py-3">
              {urgentTasks.length === 0 ? (
                <div className="py-6 text-center text-xs text-ink-muted">
                  <span className="material-symbols-outlined text-3xl text-status-success-text" aria-hidden="true">check_circle</span>
                  <p className="mt-1 font-semibold text-ink">Không có công việc nào bị quá hạn hoặc bị chặn!</p>
                  <p className="text-ink-muted">Bạn có thể tiếp tục triển khai các hạng mục tiếp theo trong kế hoạch.</p>
                </div>
              ) : (
                <>
                  <ul className="divide-y divide-hairline">
                    {urgentPagination.paginatedItems.map((task) => (
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
                              to={`/project/tasks/${task.id}`}
                              className="font-semibold text-sm text-ink hover:text-primary line-clamp-1"
                            >
                              {task.title}
                            </Link>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                              <span className="font-mono">Mã: #{task.id}</span>
                              <span>·</span>
                              <span className={task.isOverdue ? 'font-bold text-status-error-text tabular-nums' : 'tabular-nums'}>
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
                            to={`/project/tasks/${task.id}`}
                            className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-hairline bg-canvas px-3 text-xs font-semibold text-ink-soft transition-colors hover:border-primary/40 hover:bg-primary-subtle hover:text-primary"
                          >
                            Xử lý ngay
                            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">arrow_forward</span>
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {urgentPagination.showPagination && (
                    <Pagination
                      page={urgentPagination.page}
                      pages={urgentPagination.totalPages}
                      total={urgentPagination.total}
                      pageSize={urgentPagination.pageSize}
                      onPage={urgentPagination.setPage}
                      className="mt-3"
                    />
                  )}
                </>
              )}
            </div>
          </section>

          <DeadlineList
            title="Công việc sắp đến hạn"
            icon="schedule"
            empty="Chưa có công việc nào sắp đến hạn cần chú ý."
            allowPageSizeChange
            items={(data.taskDeadlines ?? []).map(task => ({
              id: task.id,
              title: task.title,
              date: task.dueAtUtc,
              overdue: task.isOverdue,
              href: `/project/tasks/${task.id}`,
            }))}
          />
        </div>

        {/* Right Bento Column: Weekly Assessment Feedback & Milestone Deadlines */}
        <div className="xl:col-span-5 space-y-5">
          {project && (
            <section className="workspace-surface" aria-labelledby="weekly-feedback-heading">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">rate_review</span>
                  <h3 id="weekly-feedback-heading" className="font-heading text-sm font-bold text-ink">
                    Đánh giá &amp; Nhận xét tuần từ GVHD
                  </h3>
                </div>
                <Link
                  to="/project/weekly-assessments"
                  className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Xem chi tiết các tuần →
                </Link>
              </div>

              <div className="p-5">
                {latestAssessment ? (
                  <div className="rounded-xl border border-hairline bg-canvas/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-primary-subtle px-2.5 py-1 text-xs font-bold text-primary">
                          Tuần {latestAssessment.weekNumber}
                        </span>
                        <span className="text-xs text-ink-muted tabular-nums">
                          {formatDate(latestAssessment.startDate)} – {formatDate(latestAssessment.endDate)}
                        </span>
                      </div>
                      {latestAssessment.totalScore != null && (
                        <span className="rounded-full bg-status-success-bg px-3 py-1 font-mono text-xs font-bold text-status-success-text border border-status-success-border tabular-nums">
                          Điểm tham khảo: {latestAssessment.totalScore.toFixed(2)}/10
                        </span>
                      )}
                    </div>

                    {latestAssessment.comments ? (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-ink-soft">Nhận xét của giảng viên hướng dẫn:</p>
                        <p className="mt-1 whitespace-pre-wrap rounded-lg bg-card p-3 text-xs leading-relaxed text-ink border border-hairline">
                          &ldquo;{latestAssessment.comments}&rdquo;
                        </p>
                      </div>
                    ) : (
                      <p className="mt-3 text-xs italic text-ink-muted">
                        Bản chấm tuần {latestAssessment.weekNumber} chưa có ghi chú chung.
                      </p>
                    )}

                    {latestAssessment.scores.length > 0 && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {latestAssessment.scores.map(s => (
                          <div key={s.rubricCriterionId} className="rounded-lg border border-hairline bg-card p-2.5 text-xs">
                            <div className="flex items-center justify-between gap-1 font-medium text-ink-soft">
                              <span className="truncate" title={s.name}>{s.name}</span>
                              <strong className="font-mono text-ink shrink-0 tabular-nums">{s.score != null ? `${s.score}/${s.maxScore}` : '—'}</strong>
                            </div>
                            {s.comments && <p className="mt-1 text-xs text-ink-muted line-clamp-2">&ldquo;{s.comments}&rdquo;</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-hairline bg-canvas p-4 text-xs text-ink-muted">
                    <span className="material-symbols-outlined text-2xl text-ink-muted" aria-hidden="true">info</span>
                    <div>
                      <p className="font-semibold text-ink">Chưa có đánh giá tuần nào được công bố</p>
                      <p className="mt-0.5">Giảng viên hướng dẫn sẽ theo dõi và gửi phản hồi định kỳ mỗi tuần theo tiến độ đồ án.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          <DeadlineList
            title="Mốc sắp đến hạn (Milestones)"
            icon="flag"
            empty="Chưa có mốc nào sắp đến hạn cần chú ý."
            items={(data.milestoneDeadlines ?? []).map(item => ({
              id: item.id,
              title: item.title,
              date: item.dueDate,
              overdue: item.isOverdue,
              href: `/project/milestones/${item.id}`,
            }))}
          />
        </div>
      </div>

      <p className="text-xs leading-5 text-ink-muted">
        Chỉ số đóng góp: {contributionStatusLabel(data.contributionDataStatus)}. Lưu ý: Chỉ báo đóng góp và tiến độ công
        việc phản ánh nhịp độ thực thi, không thay thế cho kết quả thẩm định học thuật chính thức.
      </p>
    </section>
  )
}

function DeadlineList({
  title,
  icon,
  empty,
  items,
  allowPageSizeChange = false,
}: {
  title: string
  icon: string
  empty: string
  items: Array<{ id: number; title: string; date: string; overdue: boolean; href: string }>
  allowPageSizeChange?: boolean
}) {
  const pagination = useClientPagination(items, 8)

  return (
    <section className="workspace-surface">
      <div className="flex items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">{icon}</span>
          <h3 className="font-heading text-sm font-bold text-ink">{title}</h3>
        </div>
        <span className="inline-flex items-center rounded-full border border-hairline bg-card px-2.5 py-0.5 text-xs font-bold tabular-nums text-ink-soft">
          {items.length}
        </span>
      </div>
      <div className="px-5 py-3">
        {items.length === 0 ? (
          <p className="py-3 text-xs text-ink-muted">{empty}</p>
        ) : (
          <>
            <ul className="divide-y divide-hairline text-xs">
              {pagination.paginatedItems.map(item => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <Link
                    to={item.href}
                    className="font-medium text-ink hover:text-primary line-clamp-1"
                  >
                    {item.title}
                  </Link>
                  <span className={item.overdue ? 'font-bold text-status-error-text tabular-nums' : 'text-ink-muted tabular-nums'}>
                    {formatDate(item.date)}
                    {item.overdue ? ' · Quá hạn' : ''}
                  </span>
                </li>
              ))}
            </ul>
            {pagination.showPagination && (
              <Pagination
                page={pagination.page}
                pages={pagination.totalPages}
                total={pagination.total}
                pageSize={pagination.pageSize}
                pageSizeOptions={[8, 16, 30]}
                onPage={pagination.setPage}
                onPageSizeChange={allowPageSizeChange ? pagination.setPageSize : undefined}
                className="mt-3"
              />
            )}
          </>
        )}
      </div>
    </section>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short' }).format(date)
}

function riskLabel(value: string) {
  return ({ CRITICAL: 'Nghiêm trọng', HIGH: 'Cao', MEDIUM: 'Trung bình', LOW: 'Thấp' } as Record<string, string>)[value] ?? value
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
