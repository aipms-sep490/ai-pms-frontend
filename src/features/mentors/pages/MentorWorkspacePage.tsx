import { SpotlightLink } from '../../../components/ui/SpotlightLink'
import { ButtonLink } from '../../../components/ui/ButtonLink'
import { Pagination } from '../../../components/ui/Pagination'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { useClientPagination } from '../../../components/ui/useClientPagination'
import { projectStatusLabel } from '../../projects/utils/project-status'
import { Button } from '../../../components/ui/Button'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { ListLoading } from '../../../components/ui/ListLoading'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { HttpError } from '../../../services/http/http-client'
import { services } from '../../../services/service-gateway'
import type { ProjectDto, SupervisorAssignmentDto } from '../../../types/backend'
import { loadOwnSupervisorAssignments } from '../../supervisors/utils/loadOwnSupervisorAssignments'
import { useExecutionAccess } from '../../execution/context/ExecutionAccessContext'
import { AuthSessionContext } from '../../auth/context/auth-session-context'
import { getAcademicHierarchy } from '../../academic/api/academic-api'
import type { AcademicHierarchyOrganization } from '../../academic/types/academic.types'
import { createAcademicNameResolver } from '../../projects/components/academic-name-resolver'

type AssignmentProject = { assignment: SupervisorAssignmentDto; project: ProjectDto | null; error: string | null }
const isMentor = (assignment: SupervisorAssignmentDto) => assignment.assignmentType === 'DISCIPLINE_MENTOR' && assignment.majorId != null && !assignment.endedAt

export function MentorWorkspacePage() {
  const [items, setItems] = useState<AssignmentProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const authSession = useContext(AuthSessionContext)
  const token = authSession?.session?.accessToken
  const [hierarchy, setHierarchy] = useState<AcademicHierarchyOrganization[]>([])

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    getAcademicHierarchy(token, { search: '', includeInactive: true }, controller.signal)
      .then(data => { if (!controller.signal.aborted) setHierarchy(data) })
      .catch(() => { /* silent fallback */ })
    return () => controller.abort()
  }, [token])

  const academicResolver = useMemo(() => createAcademicNameResolver(hierarchy), [hierarchy])

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const assignments = (await loadOwnSupervisorAssignments({ status: 'ACTIVE' })).filter(isMentor)
      const resolved = await Promise.all(assignments.map(async assignment => {
        try { return { assignment, project: await services.project.getProject(assignment.projectId), error: null } }
        catch (reason) { return { assignment, project: null, error: reason instanceof HttpError && reason.status === 403 ? 'Hệ thống không cấp quyền đọc đồ án này.' : 'Không thể tải đồ án.' } }
      }))
      setItems(resolved)
    } catch (reason) {
      setItems([])
      setError(reason instanceof HttpError && reason.status === 403 ? 'Bạn chưa có quyền xem phân công hướng dẫn chuyên ngành.' : 'Chưa tải được phân công hướng dẫn chuyên ngành.')
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const pagination = useClientPagination(items, 8)
  const activeCount = items.filter(({ project }) => project?.status?.replaceAll('_', '').toUpperCase() === 'ACTIVE').length
  const interdisciplinaryCount = items.filter(({ project }) => project?.academicScope?.projectMode === 'INTERDISCIPLINARY').length
  const distinctMajorsCount = new Set(items.map(({ assignment }) => assignment.majorId).filter(Boolean)).size

  return (
    <WorkspacePage
      className="space-y-5"
      title="Hướng dẫn chuyên ngành"
      eyebrow="Phân công chuyên ngành"
      description="Theo dõi công việc và tiến độ của các chuyên ngành bạn được phân công hướng dẫn."
      action={<Button variant="secondary" icon="refresh" disabled={loading} onClick={() => void load()}>Tải lại</Button>}
    >
      {error && (
        <section role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">
          {error}{' '}
          <button type="button" onClick={() => void load()} className="ml-2 min-h-11 font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            Thử lại
          </button>
        </section>
      )}
      {loading && <ListLoading label="Đang tải phân công hướng dẫn…" />}

      {!loading && !error && (
        <StatTileRow
          tiles={[
            {
              icon: 'hub',
              label: 'Phân công chuyên ngành',
              value: items.length,
              caption: 'Phân công Discipline Mentor đang hiệu lực',
              hero: true,
            },
            {
              icon: 'play_circle',
              label: 'Đồ án đang thực hiện',
              value: activeCount,
              tone: activeCount > 0 ? 'success' : 'neutral',
              caption: 'Sẵn sàng mở không gian theo dõi',
            },
            {
              icon: 'diversity_3',
              label: 'Đồ án liên ngành',
              value: interdisciplinaryCount,
              tone: 'info',
              caption: 'Phối hợp chuyên môn đa ngành',
            },
            {
              icon: 'school',
              label: 'Chuyên ngành phụ trách',
              value: distinctMajorsCount,
              tone: 'neutral',
              caption: 'Số ngành khác nhau trong học kỳ',
            },
          ]}
        />
      )}

      {!loading && !error && !items.length && (
        <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
          <div className="bg-canvas/70 border-b border-hairline px-5 py-3.5">
            <h2 className="text-base font-bold text-ink">Chưa có phân công hướng dẫn chuyên ngành</h2>
          </div>
          <p className="p-5 text-sm leading-6 text-ink-soft">Bạn sẽ thấy đồ án ở đây khi được phân công hướng dẫn chuyên ngành.</p>
        </section>
      )}

      {!loading && items.length > 0 ? (
        <div className="space-y-5">
          <details className="rounded-xl border border-primary/20 bg-primary-subtle px-5 py-3 text-xs leading-relaxed text-primary shadow-2xs">
            <summary className="cursor-pointer font-bold">
              Thông tin điều phối Đồ án Liên ngành (Discipline Mentor)
            </summary>
            <p className="mt-2">
              Giảng viên hướng dẫn chuyên ngành (Discipline Mentor) theo dõi, đôn đốc và ký duyệt các nội dung công việc trong phạm vi chuyên môn được phân công. Tiến độ chung và đánh giá toàn diện do Giảng viên hướng dẫn chính (Primary Supervisor) và Hội đồng thẩm định quản trị.
            </p>
          </details>

          <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-canvas/70 border-b border-hairline px-5 py-3.5">
              <div>
                <h2 className="text-base font-bold text-ink">Danh sách phân công chuyên ngành</h2>
                <p className="mt-0.5 text-xs text-ink-muted">Truy cập nhanh công việc, báo cáo và lịch họp của từng đồ án.</p>
              </div>
              <StatusBadge tone="info" label={`${items.length} phân công`} />
            </div>

            <div className="p-5">
              <ul className="grid gap-4 md:grid-cols-2">
                {pagination.paginatedItems.map(({ assignment, project, error: projectError }) => {
                  const majorName = assignment.majorId ? academicResolver.major(assignment.majorId) : `Chuyên ngành #${assignment.majorId}`
                  const isInterdisciplinary = project?.academicScope?.projectMode === 'INTERDISCIPLINARY'
                  const isActive = project?.status?.replaceAll('_', '').toUpperCase() === 'ACTIVE'
                  return (
                    <li key={assignment.id} className="min-w-0 overflow-hidden rounded-xl border border-hairline bg-card shadow-xs transition-colors hover:border-line-strong">
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-canvas/70 border-b border-hairline px-4 py-3">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                          Phân công: {majorName}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {isInterdisciplinary && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-tag-se/25 bg-tag-se-bg px-2.5 py-0.5 text-xs font-bold text-tag-se">
                              <span className="material-symbols-outlined text-sm" aria-hidden="true">hub</span>
                              Liên ngành
                            </span>
                          )}
                          <StatusBadge
                            tone={isActive ? 'success' : 'neutral'}
                            label={project?.status ? projectStatusLabel(project.status) : 'Chưa tải trạng thái'}
                          />
                        </div>
                      </div>

                      <div className="p-4">
                        <h3 className="break-words text-base font-bold text-ink">
                          {project?.title ?? `Đồ án #${assignment.projectId}`}
                        </h3>
                        <p className="mt-1 text-xs font-mono text-ink-muted">
                          {project?.code ?? `#${assignment.projectId}`}
                        </p>
                        {projectError ? (
                          <p role="alert" className="mt-3 text-sm text-status-error-text">{projectError}</p>
                        ) : !isActive ? (
                          <p className="mt-3 text-sm text-ink-muted">Đồ án hiện không trong giai đoạn thực hiện. Chưa thể mở không gian theo dõi.</p>
                        ) : (
                          <nav className="mt-4 flex flex-wrap gap-2 border-t border-hairline pt-3.5" aria-label="Chức năng hướng dẫn chuyên ngành">
                            <ButtonLink variant="primary" to={`/mentor/projects/${assignment.projectId}/majors/${assignment.majorId}/workspace`}>Mở phạm vi theo dõi</ButtonLink>
                            <ButtonLink to={`/mentor/projects/${assignment.projectId}/majors/${assignment.majorId}/tasks`}>Công việc</ButtonLink>
                            <ButtonLink to={`/mentor/projects/${assignment.projectId}/majors/${assignment.majorId}/reports`}>Báo cáo tiến độ</ButtonLink>
                            <ButtonLink to={`/mentor/projects/${assignment.projectId}/majors/${assignment.majorId}/meetings`}>Lịch họp</ButtonLink>
                          </nav>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>

              {pagination.showPagination ? (
                <Pagination
                  className="mt-4"
                  page={pagination.page}
                  pages={pagination.totalPages}
                  total={pagination.total}
                  pageSize={pagination.pageSize}
                  pageSizeOptions={[8, 16, 30]}
                  onPage={pagination.setPage}
                  onPageSizeChange={pagination.setPageSize}
                />
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </WorkspacePage>
  )
}

export function MentorProjectWorkspacePage() {
  const access = useExecutionAccess()
  const areas = [
    ['tasks', 'Công việc theo phạm vi', 'Theo dõi phần việc trong chuyên ngành được phân công.', 'checklist'],
    ['reports', 'Báo cáo tiến độ', 'Theo dõi báo cáo và kết quả thực hiện của nhóm.', 'description'],
    ['meetings', 'Cuộc họp', 'Xem lịch trao đổi và nội dung đã thống nhất.', 'groups'],
    ['evidence', 'Sổ minh chứng', 'Đối chiếu tài liệu và kết quả theo nguồn, chuyên ngành.', 'fact_check'],
  ] as const

  const memberCount = access.team?.members.length ?? null

  return (
    <WorkspacePage
      className="space-y-5"
      title={access.project.title}
      eyebrow={`Theo dõi theo chuyên ngành · ${access.project.code}`}
      description="Theo dõi công việc, báo cáo và minh chứng trong phạm vi bạn được phân công."
      backTo="/mentor/workspace"
    >
      <StatTileRow
        tiles={[
          {
            icon: 'apps',
            label: 'Khu vực chức năng',
            value: areas.length,
            caption: 'Công việc, báo cáo, cuộc họp và sổ minh chứng',
            hero: true,
          },
          {
            icon: 'groups',
            label: 'Thành viên nhóm',
            value: memberCount,
            tone: 'info',
            caption: access.team?.name ?? 'Nhóm thực hiện đồ án',
          },
          {
            icon: 'verified',
            label: 'Quyền thao tác',
            value: access.readOnly ? 0 : 1,
            tone: access.readOnly ? 'warning' : 'success',
            caption: access.readOnly ? 'Chế độ chỉ đọc (đã khóa chỉnh sửa)' : 'Đang hoạt động theo phạm vi chuyên ngành',
          },
          {
            icon: 'assignment',
            label: 'Trạng thái đồ án',
            value: 1,
            tone: 'neutral',
            caption: projectStatusLabel(access.project.status),
          },
        ]}
      />

      {/* Bento 2-column layout */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 items-start">
        <div className="xl:col-span-4 space-y-5">
          <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
            <div className="bg-canvas/70 border-b border-hairline px-5 py-3.5">
              <h2 className="text-base font-bold text-ink">Phạm vi hướng dẫn</h2>
            </div>
            <p className="p-5 text-sm leading-6 text-ink-muted">
              Bạn có thể theo dõi phần việc của chuyên ngành. Kế hoạch chung và kết quả đánh giá do người phụ trách đồ án quản lý.
            </p>
          </section>

          <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
            <div className="bg-canvas/70 border-b border-hairline px-5 py-3.5">
              <h2 className="text-base font-bold text-ink">Phân công chuyên ngành</h2>
            </div>
            <p className="p-5 text-sm leading-6 text-ink-muted">
              Mở công việc để xem ngành phụ trách và phần việc của thành viên. Các thao tác được hiển thị theo quyền của bạn.
            </p>
          </section>
        </div>

        <section className="xl:col-span-8 overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-canvas/70 border-b border-hairline px-5 py-3.5">
            <div>
              <h2 className="text-base font-bold text-ink">Không gian theo dõi chuyên ngành</h2>
              <p className="mt-0.5 text-xs text-ink-muted">Chọn hạng mục để xem chi tiết và phản hồi trong phạm vi được giao.</p>
            </div>
            <StatusBadge tone="info" label={`${areas.length} khu vực`} />
          </div>
          <nav className="workspace-launchpad grid sm:grid-cols-2" aria-label="Khu vực hướng dẫn chuyên ngành">
            {areas.map(([path, title, description, icon]) => (
              <SpotlightLink
                key={path}
                to={`${access.routeBase}/${path}`}
                className="group flex flex-col gap-2.5 min-w-0 border-b border-hairline p-5 hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary sm:odd:border-r"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-primary" aria-hidden="true">{icon}</span>
                  <span className="block break-words font-semibold text-ink group-hover:text-primary">{title}</span>
                </div>
                <span className="block break-words text-sm leading-6 text-ink-muted">{description}</span>
                <span className="workspace-action-link mt-2">
                  Xem chi tiết<span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                </span>
              </SpotlightLink>
            ))}
          </nav>
        </section>
      </div>
    </WorkspacePage>
  )
}
