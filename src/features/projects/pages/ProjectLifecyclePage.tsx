import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStudentJourney } from '../../../app/context'
import { services } from '../../../services/service-gateway'
import type { ProjectStatusHistoryDto } from '../../../types/backend'
import { projectStatusLabel } from '../utils/project-status'
import { PageLoading } from '../../../components/ui/PageLoading'
import { Pagination, StatTileRow, StatusBadge, useClientPagination } from '../../../components/ui'
import { ExecutionPage, ExState } from '../../execution/execution-ui'
import { dateTimeLabel } from '../../execution/execution-utils'
import './project-lifecycle.css'
import { ProjectResponsibilitiesPanel } from '../components/ProjectResponsibilitiesPanel'

export function ProjectLifecyclePage() {
  const journey = useStudentJourney()
  const { project, team, assignments, semester } = journey
  const [history, setHistory] = useState<ProjectStatusHistoryDto[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState('')
  const [revision, setRevision] = useState(0)
  const activeAssignments = assignments.filter((item) => !item.endedAt)
  const supervisor = activeAssignments.find((item) => item.isPrimary) ?? activeAssignments[0]
  const disciplineMentors = activeAssignments.filter((item) => !item.isPrimary)
  const historyPagination = useClientPagination(history, 8)

  useEffect(() => {
    if (!project?.id) { setHistory([]); setHistoryLoading(false); return }
    let cancelled = false
    setHistoryLoading(true); setHistoryError('')
    services.project.getHistory(project.id)
      .then(items => { if (!cancelled) setHistory([...items].sort((a,b) => Date.parse(b.changedAt) - Date.parse(a.changedAt))) })
      .catch(() => { if (!cancelled) setHistoryError('Chưa tải được lịch sử đồ án. Hãy thử lại.') })
      .finally(() => { if (!cancelled) setHistoryLoading(false) })
    return () => { cancelled = true }
  }, [project?.id, revision])

  if (journey.isLoading) return <PageLoading />
  if (journey.error) return <ExState message="Chưa tải được hồ sơ đồ án. Hãy thử lại." retry={() => void journey.refreshAll()} />
  if (!project || !team) return <ExecutionPage title="Hồ sơ đồ án"><ExState title="Nhóm chưa có hồ sơ đồ án" message="Hoàn thiện điều kiện nhóm rồi tạo đề cương để đăng ký." action={<Link className="ex-button" to="/project/register">Tạo đề cương</Link>} /></ExecutionPage>

  const leaderName = team.members.find(member => member.isLeader)?.fullName || 'Chưa có thông tin'

  return (
    <ExecutionPage title="Hồ sơ đồ án" eyebrow={project.code} description={`${project.title} · ${team.name} (${team.code})${semester?.name ? ` · ${semester.name}` : ''}`}>
      <div className="flex flex-col gap-5">
        <StatTileRow
          tiles={[
            {
              icon: 'groups',
              label: 'Thành viên nhóm',
              value: team.members.length,
              caption: `Trưởng nhóm: ${leaderName}`,
              hero: true,
            },
            {
              icon: 'school',
              label: 'Chuyên ngành',
              value: project.majors.length,
              caption: project.majors.map(major => major.majorCode || major.majorName).join(', ') || 'Chưa có thông tin',
              tone: 'info',
            },
            {
              icon: 'supervisor_account',
              label: 'Giảng viên hướng dẫn',
              value: activeAssignments.length,
              caption: supervisor
                ? disciplineMentors.length > 0
                  ? `1 GVHD chính · ${disciplineMentors.length} đồng hướng dẫn`
                  : 'Đã phân công GVHD chính'
                : 'Chưa phân công',
              tone: supervisor ? 'success' : 'warning',
            },
            {
              icon: 'history',
              label: 'Mốc lịch sử trạng thái',
              value: history.length,
              caption: history.length > 0 ? 'Đã ghi nhận thay đổi trạng thái' : 'Đang theo dõi vòng đời',
              tone: 'neutral',
            },
          ]}
        />

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
          <div className="flex flex-col gap-5 xl:col-span-8">
            <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs" aria-label="Thông tin đồ án">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
                <h2 className="text-base font-bold text-ink">Thông tin chung & mục tiêu</h2>
                <span className="rounded-md border border-primary/20 bg-primary-subtle px-2.5 py-0.5 font-mono text-xs font-bold text-primary">
                  {project.code}
                </span>
              </div>
              <dl className="lifecycle-facts">
                <div>
                  <dt>Trạng thái</dt>
                  <dd><StatusBadge tone="info" label={projectStatusLabel(project.status)} /></dd>
                </div>
                <div>
                  <dt>Trưởng nhóm</dt>
                  <dd>{leaderName}</dd>
                </div>
                <div>
                  <dt>Chuyên ngành</dt>
                  <dd>{project.majors.map(major => major.majorName || major.majorCode).join(', ') || 'Chưa có thông tin'}</dd>
                </div>
                <div>
                  <dt>Giảng viên hướng dẫn</dt>
                  <dd>
                    <span>{supervisor?.supervisorName || 'Chưa phân công'}</span>
                    {disciplineMentors.length > 0 && <span className="mt-1 block text-xs font-normal text-ink-muted">
                      {disciplineMentors.map((item) => {
                        const major = item.majorId == null ? null : project.majors.find((candidate) => candidate.majorId === item.majorId)
                        return <span key={item.id} className="block">{item.supervisorName}{major ? ` · ${major.majorName || major.majorCode}` : ''}</span>
                      })}
                    </span>}
                  </dd>
                </div>
              </dl>
              <div className="lifecycle-brief">
                <div>
                  <div className="lifecycle-subheading">
                    <span className="material-symbols-outlined text-[19px]" aria-hidden="true">flag</span>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">Mục tiêu đồ án</h2>
                  </div>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-ink-muted">{project.objectives || 'Chưa có nội dung.'}</p>
                </div>
                <div>
                  <div className="lifecycle-subheading">
                    <span className="material-symbols-outlined text-[19px]" aria-hidden="true">inventory_2</span>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">Sản phẩm kỳ vọng</h2>
                  </div>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-ink-muted">{project.expectedOutput || 'Chưa có nội dung.'}</p>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
                <h2 className="text-base font-bold text-ink">Thành viên nhóm</h2>
                <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary-subtle px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums text-primary">
                  {team.members.length} thành viên
                </span>
              </div>
              <div className="lifecycle-members">
                {team.members.map(member => (
                  <div key={member.userId} className="lifecycle-member">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/10 bg-primary-subtle text-xs font-bold text-primary">
                      {member.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{member.fullName}</span>
                      <span className="block text-xs text-ink-muted">Thành viên #{member.userId}</span>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      member.isLeader
                        ? 'border border-status-success-border bg-primary-subtle text-primary'
                        : 'border border-hairline bg-canvas text-ink-muted'
                    }`}>
                      {member.isLeader ? 'Trưởng nhóm' : 'Thành viên'}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <ProjectResponsibilitiesPanel projectId={project.id} majors={project.majors} />
          </div>

          <aside className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs xl:col-span-4">
            <div className="flex items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
              <h2 className="text-base font-bold text-ink">Lịch sử đồ án</h2>
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary-subtle px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums text-primary">
                {history.length}
              </span>
            </div>
            <div className="lifecycle-history p-5">
              {historyLoading ? (
                <ExState loading />
              ) : historyError ? (
                <ExState message={historyError} retry={() => setRevision(value => value + 1)} />
              ) : history.length ? (
                <>
                  <ol className="ex-timeline">
                    {historyPagination.paginatedItems.map(item => (
                      <li key={item.id} className="ex-timeline-item">
                        <span className="ex-timeline-dot" aria-hidden="true" />
                        <div className="lifecycle-history-content">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                            <strong className="font-semibold text-ink">
                              {item.oldStatus ? projectStatusLabel(item.oldStatus) : 'Khởi tạo'} → {projectStatusLabel(item.newStatus)}
                            </strong>
                            <time className="font-mono text-xs text-ink-muted">{dateTimeLabel(item.changedAt)}</time>
                          </div>
                          <p className="mt-1.5 text-xs text-ink-muted">
                            {item.changedByName || 'Hệ thống'}{item.reason ? ` · ${historyReasonLabel(item.reason)}` : ''}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  {historyPagination.showPagination && (
                    <div className="mt-4 border-t border-hairline pt-3">
                      <Pagination
                        page={historyPagination.page}
                        pages={historyPagination.totalPages}
                        total={historyPagination.total}
                        pageSize={historyPagination.pageSize}
                        pageSizeOptions={[8, 16, 30]}
                        onPage={historyPagination.setPage}
                        onPageSizeChange={historyPagination.setPageSize}
                      />
                    </div>
                  )}
                </>
              ) : (
                <p className="ex-muted">Chưa có lịch sử đồ án.</p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </ExecutionPage>
  )
}

const historyReasonTranslations: Record<string, string> = {
  'Primary and co-supervisor assignments were confirmed.': 'Đã xác nhận phân công giảng viên hướng dẫn chính và đồng hướng dẫn.',
  'Project moved to supervisor matching and assignment stage.': 'Đồ án chuyển sang giai đoạn ghép và phân công giảng viên hướng dẫn.',
  'Proposal satisfies multi-major capstone requirements and was approved.': 'Đề cương đáp ứng yêu cầu đồ án đa ngành và đã được phê duyệt.',
  'Department staff started proposal review.': 'Bộ môn bắt đầu thẩm định đề cương.',
  'Team completed the initial proposal and submitted it for department review.': 'Nhóm đã hoàn thiện đề cương ban đầu và gửi bộ môn thẩm định.',
  'Initial project registration created by team leader.': 'Trưởng nhóm đã khởi tạo hồ sơ đăng ký đồ án.',
}

function historyReasonLabel(reason: string) {
  const normalized = reason.trim()
  return historyReasonTranslations[normalized] ?? normalized
}
