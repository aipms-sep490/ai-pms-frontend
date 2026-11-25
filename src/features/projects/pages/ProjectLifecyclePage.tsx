import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStudentJourney } from '../../../app/context'
import { services } from '../../../services/service-gateway'
import type { ProjectStatusHistoryDto } from '../../../types/backend'
import { projectStatusLabel } from '../utils/project-status'
import { PageLoading } from '../../../components/ui/PageLoading'
import { Avatar } from '../../../components/ui/Avatar'
import { Pagination, StatTileRow, useClientPagination } from '../../../components/ui'
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
  const historyPager = useClientPagination(history, 10)
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
  if (journey.error) return <ExecutionPage title="Hồ sơ đồ án"><ExState message="Chưa tải được hồ sơ đồ án. Hãy thử lại." retry={() => void journey.refreshAll()} /></ExecutionPage>
  if (!project || !team) return <ExecutionPage title="Hồ sơ đồ án"><ExState title="Nhóm chưa có hồ sơ đồ án" message="Hoàn thiện điều kiện nhóm rồi tạo đề cương để đăng ký." action={<Link className="ex-button" to="/project/register">Tạo đề cương</Link>} /></ExecutionPage>
  return <ExecutionPage
    title="Hồ sơ đồ án"
    eyebrow={project.code}
    description={`${project.title} · ${team.name} (${team.code})${semester?.name ? ` · ${semester.name}` : ''}`}
    action={
      <button
        type="button"
        className="ex-button ex-button-icon"
        aria-label="Làm mới"
        title="Làm mới"
        onClick={() => { void journey.refreshAll(); setRevision(value => value + 1) }}
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">refresh</span>
      </button>
    }
  >
    <div className="flex flex-col gap-5">
      <StatTileRow
        tiles={[
          { icon: 'badge', label: 'Mã hồ sơ đồ án', value: project.code, caption: project.majors.map(m => m.majorCode).filter(Boolean).join(' · ') || 'Hồ sơ đề tài hiện tại', hero: true },
          { icon: 'groups', label: 'Thành viên nhóm', value: team.members.length, caption: team.name, tone: 'info' },
          { icon: 'school', label: 'Phân công hướng dẫn', value: activeAssignments.length, caption: activeAssignments.length > 0 ? 'Giảng viên hướng dẫn đang phụ trách' : 'Chưa phân công GVHD chính', tone: 'neutral' },
          { icon: 'history', label: 'Mốc lịch sử trạng thái', value: history.length, caption: 'Các bước chuyển trạng thái hồ sơ', tone: 'neutral' },
        ]}
      />

      <div className="grid grid-cols-1 items-stretch gap-5 xl:grid-cols-12">
        <div className="flex flex-col gap-5 xl:col-span-8">
          <section className="workspace-surface p-5 sm:p-6" aria-label="Thông tin đồ án">
            <dl className="lifecycle-facts">
              <div>
                <dt>Trạng thái</dt>
                <dd><span className={`ex-badge ex-badge-${project.status}`}>{projectStatusLabel(project.status)}</span></dd>
              </div>
              <div>
                <dt>Trưởng nhóm</dt>
                <dd>{team.members.find(member => member.isLeader)?.fullName || 'Chưa có thông tin'}</dd>
              </div>
              <div>
                <dt>Chuyên ngành</dt>
                <dd>
                  {project.majors.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {project.majors.map((major) => (
                        <span key={major.majorId} className="inline-flex items-center rounded-md border border-hairline bg-canvas px-2.5 py-0.5 text-xs font-semibold text-ink-soft">
                          {major.majorName || major.majorCode}
                        </span>
                      ))}
                    </div>
                  ) : (
                    'Chưa có thông tin'
                  )}
                </dd>
              </div>
              <div>
                <dt>Giảng viên hướng dẫn</dt>
                <dd>
                  <span>{supervisor?.supervisorName || 'Chưa phân công'}</span>
                  {disciplineMentors.length > 0 && <span className="mt-1.5 flex flex-col gap-0.5 text-xs font-normal text-ink-muted">
                    {disciplineMentors.map((item) => {
                      const major = item.majorId == null ? null : project.majors.find((candidate) => candidate.majorId === item.majorId)
                      return <span key={item.id} className="block">{item.supervisorName}{major ? ` · ${major.majorName || major.majorCode}` : ''}</span>
                    })}
                  </span>}
                </dd>
              </div>
            </dl>
            <div className="mt-5 grid grid-cols-1 gap-4 border-t border-hairline pt-5 sm:grid-cols-2">
              <div className="rounded-xl border border-hairline/80 bg-canvas/65 p-4">
                <div className="lifecycle-subheading">
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">flag</span>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">Mục tiêu đồ án</h2>
                </div>
                <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">{project.objectives || 'Chưa có nội dung.'}</p>
              </div>
              <div className="rounded-xl border border-hairline/80 bg-canvas/65 p-4">
                <div className="lifecycle-subheading">
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">inventory_2</span>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">Sản phẩm kỳ vọng</h2>
                </div>
                <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">{project.expectedOutput || 'Chưa có nội dung.'}</p>
              </div>
            </div>
          </section>

          <ProjectResponsibilitiesPanel projectId={project.id} majors={project.majors} className="flex-1" />
        </div>

        <aside className="flex flex-col gap-5 xl:col-span-4">
          <section className="workspace-surface p-5">
            <div className="mb-3 flex items-center justify-between border-b border-hairline pb-3">
              <h2 className="text-base font-bold text-ink">Thành viên nhóm</h2>
              <span className="rounded-full border border-hairline bg-canvas px-2.5 py-0.5 font-mono text-xs font-semibold text-ink-soft">
                {team.members.length} thành viên
              </span>
            </div>
            <div className="flex flex-col gap-2.5">
              {team.members.map(member => (
                <div key={member.userId} className="flex items-center justify-between gap-2.5 rounded-lg border border-hairline bg-canvas/60 px-3 py-2.5">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <Avatar name={member.fullName} toneSeed={member.userId} size="sm" shape="circle" />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold leading-snug text-ink" title={member.fullName}>{member.fullName}</span>
                      <span className="mt-0.5 block truncate text-xs text-ink-muted">{project.majors?.find(m => m.majorId === member.majorId)?.majorName ?? (member.isLeader ? 'Trưởng nhóm' : 'Thành viên nhóm')}</span>
                    </div>
                  </div>
                  <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${
                    member.isLeader
                      ? 'border border-primary/25 bg-primary-subtle text-primary'
                      : 'border border-hairline bg-card text-ink-muted'
                  }`}>
                    {member.isLeader ? 'Trưởng nhóm' : 'Thành viên'}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="workspace-surface flex flex-1 flex-col p-5">
            <div className="mb-3.5 flex items-center justify-between border-b border-hairline pb-3">
              <h2 className="text-base font-bold text-ink">Lịch sử đồ án</h2>
              {history.length > 0 && (
                <span className="font-mono text-xs font-semibold text-ink-muted">{history.length} mốc</span>
              )}
            </div>
            {historyLoading ? (
              <ExState loading />
            ) : historyError ? (
              <ExState message={historyError} retry={() => setRevision(value => value + 1)} />
            ) : history.length ? (
              <>
                <ol className="lifecycle-timeline">
                  {historyPager.paginatedItems.map(item => (
                    <li key={item.id} className="lifecycle-timeline-item">
                      <span className="lifecycle-timeline-dot" aria-hidden="true" />
                      <div className="lifecycle-history-content">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                          <strong className="text-sm font-semibold text-ink">
                            {item.oldStatus ? projectStatusLabel(item.oldStatus) : 'Khởi tạo'} → {projectStatusLabel(item.newStatus)}
                          </strong>
                          <time className="shrink-0 font-mono text-xs text-ink-muted">{dateTimeLabel(item.changedAt)}</time>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                          <span className="font-medium text-ink-soft">{item.changedByName || 'Hệ thống'}</span>
                          {item.reason ? ` · ${historyReasonLabel(item.reason)}` : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
                {historyPager.showPagination && (
                  <div className="mt-3 border-t border-hairline pt-3">
                    <Pagination
                      page={historyPager.page}
                      pages={historyPager.pages}
                      total={historyPager.total}
                      pageSize={historyPager.pageSize}
                      onPage={historyPager.setPage}
                      onPageSizeChange={historyPager.setPageSize}
                    />
                  </div>
                )}
              </>
            ) : (
              <p className="ex-muted">Chưa có lịch sử đồ án.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  </ExecutionPage>
}

const historyReasonTranslations: Record<string, string> = {
  'Primary and co-supervisor assignments were confirmed.': 'Đã xác nhận phân công giảng viên hướng dẫn chính và đồng hướng dẫn.',
  'Project moved to supervisor matching and assignment stage.': 'Đồ án chuyển sang giai đoạn ghép và phân công giảng viên hướng dẫn.',
  'Proposal satisfies multi-major capstone requirements and was approved.': 'Đề cương đáp ứng yêu cầu đồ án đa ngành và đã được phê duyệt.',
  'Department staff started proposal review.': 'Bộ môn bắt đầu thẩm định đề cương.',
  'Team completed the initial proposal and submitted it for department review.': 'Nhóm đã hoàn thiện đề cương ban đầu và gửi bộ môn thẩm định.',
  'Initial project registration created by team leader.': 'Trưởng nhóm đã khởi tạo hồ sơ đăng ký đồ án.',
  'Final package submitted': 'Đã nộp và khóa gói bàn giao cuối kỳ.',
  'Final package submitted.': 'Đã nộp và khóa gói bàn giao cuối kỳ.',
  'Confirm pre-approval supervision.': 'Đã xác nhận giảng viên hướng dẫn trước khi thẩm định đề cương.',
  'Supervision confirmed before academic approval.': 'Giảng viên hướng dẫn đã được xác nhận trước bước phê duyệt học vụ.',
  'Project submitted for review.': 'Đã nộp đề cương để bộ môn thẩm định.',
  'Project approved.': 'Đề cương đồ án đã được phê duyệt.',
  'Project rejected.': 'Đề cương đồ án chưa được chấp thuận.',
  'Revision requested.': 'Bộ môn yêu cầu chỉnh sửa đề cương.',
  'Revision submitted.': 'Nhóm đã nộp bản chỉnh sửa đề cương.',
  'Supervisor assigned.': 'Đã phân công giảng viên hướng dẫn.',
  'Project activated.': 'Đồ án đã chuyển sang giai đoạn thực hiện.',
}

function historyReasonLabel(reason: string) {
  const normalized = reason.trim()
  return historyReasonTranslations[normalized] ?? normalized
}
