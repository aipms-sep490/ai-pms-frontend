import { displayLabel } from '../../../components/ui/display-label'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { Pagination } from '../../../components/ui/Pagination'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { WorkspaceEmptyState } from '../../../components/ui/WorkspaceState'
import { useSupervisors } from '../hooks/useSupervisors'
import './supervisor-monitoring.css'

export function SupervisorMonitoringPage() {
  const { id } = useParams()
  const supervisors = useSupervisors(id ? Number(id) : undefined)
  const isDetail = Boolean(id)
  const [previewId, setPreviewId] = useState<number | null>(null)

  if (supervisors.isUnauthorized) return <StatePanel title="Phiên đăng nhập đã hết hạn" detail="Đăng nhập lại để tiếp tục xem danh sách giảng viên."><Link className="sup__state-link" to="/login">Đến trang đăng nhập</Link></StatePanel>
  if (supervisors.loading) return <StatePanel title="Đang tải giảng viên" detail="Hệ thống đang đồng bộ hồ sơ và trạng thái sẵn sàng." busy />
  if (supervisors.isForbidden) return <StatePanel title="Không có quyền truy cập" detail="Tài khoản hiện tại không thuộc phạm vi bộ môn được phép xem." />
  if (supervisors.error) return <StatePanel title="Không thể tải danh sách" detail="Kết nối dữ liệu giảng viên chưa sẵn sàng."><Button onClick={() => void supervisors.refresh()}>Thử lại</Button></StatePanel>

  if (isDetail && supervisors.current) {
    const current = supervisors.current
    return (
      <div className="workspace-page sup">
        <Link className="sup__back" to="/department/supervisors">
          <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>Danh sách giảng viên
        </Link>
        <header className="workspace-heading sup__profile-header">
          <span className="sup__avatar" aria-hidden="true">{initials(current.fullName)}</span>
          <div className="sup__profile-copy">
            <p className="workspace-kicker sup__eyebrow">Hồ sơ giảng viên · #{current.id}</p>
            <h1>{current.fullName}</h1>
            <p>{current.departmentName}</p>
          </div>
          <Status available={current.isAvailable} />
        </header>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <section className="lg:col-span-7 overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
            <div className="bg-canvas/70 border-b border-hairline px-5 py-3.5">
              <p className="sup__section-label">Giới thiệu</p>
            </div>
            <div className="p-5">
              <p className="text-sm leading-7 text-ink-soft">{current.bio ?? 'Giảng viên chưa cập nhật phần giới thiệu.'}</p>
            </div>
          </section>
          <section className="lg:col-span-5 overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
            <div className="flex items-center justify-between gap-2 bg-canvas/70 border-b border-hairline px-5 py-3.5">
              <p className="sup__section-label">Chuyên môn</p>
              <StatusBadge tone="info" label={`${current.expertise.length} lĩnh vực`} />
            </div>
            <div className="p-5">
              {current.expertise.length ? (
                <ul className="sup__expertise">
                  {current.expertise.map(item => (
                    <li key={`${item.name}-${displayLabel(item.proficiencyLevel)}`}>
                      <span>{item.name}</span>
                      {item.proficiencyLevel && <small>{item.proficiencyLevel}</small>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-muted">Chưa có dữ liệu chuyên môn.</p>
              )}
            </div>
          </section>
        </div>

        <aside className="sup__notice">
          <span className="material-symbols-outlined" aria-hidden="true">info</span>
          <p>Số đồ án đang hướng dẫn và số nhóm có thể nhận thêm được hiển thị khi chọn giảng viên cho đồ án.</p>
        </aside>
      </div>
    )
  }

  if (isDetail) return <StatePanel title="Không tìm thấy giảng viên" detail="Hồ sơ có thể đã bị xóa hoặc nằm ngoài phạm vi bộ môn."><Link className="sup__state-link" to="/department/supervisors">Quay lại danh sách</Link></StatePanel>

  const availableCount = supervisors.items.filter(item => item.isAvailable).length
  const unavailableCount = supervisors.items.filter(item => !item.isAvailable).length
  const totalPages = Math.max(1, Math.ceil(supervisors.totalCount / Math.max(1, supervisors.pageSize)))
  const previewedSupervisor = previewId != null ? supervisors.items.find(item => item.id === previewId) ?? null : null

  return (
    <div className="workspace-page sup">
      <header className="workspace-heading sup__header">
        <div>
          <p className="workspace-kicker sup__eyebrow">Không gian bộ môn</p>
          <h1>Giảng viên hướng dẫn</h1>
          <p>Tra cứu hồ sơ, chuyên môn và trạng thái sẵn sàng của giảng viên trong bộ môn.</p>
        </div>
      </header>

      <StatTileRow
        tiles={[
          {
            icon: 'groups',
            label: 'Tổng GVHD',
            value: supervisors.totalCount,
            caption: 'Hồ sơ trong phạm vi bộ môn',
            hero: true,
          },
          {
            icon: 'check_circle',
            label: 'Đang mở nhận',
            value: availableCount,
            tone: 'success',
            caption: 'Có thể tiếp nhận thêm đồ án (trang này)',
          },
          {
            icon: 'pause_circle',
            label: 'Tạm ngưng / Đầy tải',
            value: unavailableCount,
            tone: unavailableCount > 0 ? 'warning' : 'neutral',
            caption: 'Chưa mở slot hướng dẫn mới (trang này)',
          },
          {
            icon: 'school',
            label: 'Bộ môn phụ trách',
            value: supervisors.allowedDepartments.length,
            tone: 'info',
            caption: 'Phạm vi tra cứu được cấp quyền',
          },
        ]}
      />

      <div className="sup__filters" aria-label="Lọc giảng viên hướng dẫn">
        <label>
          <span>Tìm kiếm</span>
          <input
            placeholder="Tên giảng viên"
            value={supervisors.filters.search ?? ''}
            onChange={event => supervisors.setFilters({ ...supervisors.filters, search: event.target.value || undefined, page: 1 })}
          />
        </label>
        <label>
          <span>Bộ môn</span>
          <select
            aria-label="Bộ môn"
            value={supervisors.filters.departmentId ?? supervisors.allowedDepartments[0]?.id ?? ''}
            onChange={event => supervisors.setFilters({ ...supervisors.filters, departmentId: Number(event.target.value), page: 1 })}
          >
            {supervisors.allowedDepartments.map(department => (
              <option key={department.id} value={department.id}>{department.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Chuyên môn</span>
          <input
            aria-label="Chuyên môn"
            placeholder="Ví dụ: AI"
            value={supervisors.filters.expertise ?? ''}
            onChange={event => supervisors.setFilters({ ...supervisors.filters, expertise: event.target.value || undefined, page: 1 })}
          />
        </label>
        <label>
          <span>Trạng thái</span>
          <select
            aria-label="Trạng thái sẵn sàng"
            value={supervisors.filters.isAvailable === undefined ? '' : String(supervisors.filters.isAvailable)}
            onChange={event => supervisors.setFilters({ ...supervisors.filters, isAvailable: event.target.value === '' ? undefined : event.target.value === 'true', page: 1 })}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Sẵn sàng nhận hướng dẫn</option>
            <option value="false">Tạm thời chưa nhận</option>
          </select>
        </label>
      </div>

      {/* Bento 2-column master-detail layout */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 items-start">
        <div className="xl:col-span-8 space-y-4">
          {supervisors.items.length > 0 ? (
            <section className="sup__list overflow-hidden rounded-xl border border-hairline bg-card shadow-xs" aria-label="Danh sách giảng viên">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-canvas/70 border-b border-hairline px-5 py-3.5">
                <h2 className="text-sm font-bold text-ink">Danh sách giảng viên</h2>
                <StatusBadge tone="neutral" label={`${supervisors.items.length} / ${supervisors.totalCount}`} />
              </div>
              {supervisors.items.map(supervisor => (
                <article key={supervisor.id}>
                  <span className="sup__avatar sup__avatar--small" aria-hidden="true">{initials(supervisor.fullName)}</span>
                  <div className="sup__card-copy">
                    <Link to={`/department/supervisors/${supervisor.id}`}>{supervisor.fullName}</Link>
                    <p>{supervisor.departmentName}</p>
                    <div className="sup__tags">
                      {supervisor.expertise.slice(0, 3).map(expertise => <span key={expertise.name}>{expertise.name}</span>)}
                      {supervisor.expertise.length > 3 && <span>+{supervisor.expertise.length - 3}</span>}
                      {!supervisor.expertise.length && <em>Chưa cập nhật chuyên môn</em>}
                    </div>
                  </div>
                  <Status available={supervisor.isAvailable} />
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className="sup__open"
                      aria-label={`Xem nhanh ${supervisor.fullName}`}
                      aria-pressed={previewId === supervisor.id}
                      onClick={() => setPreviewId(current => current === supervisor.id ? null : supervisor.id)}
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">visibility</span>
                    </button>
                    <Link className="sup__open" aria-label={`Mở hồ sơ ${supervisor.fullName}`} to={`/department/supervisors/${supervisor.id}`}>
                      <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                    </Link>
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <WorkspaceEmptyState
              title="Không tìm thấy giảng viên"
              message={supervisors.filters.search || supervisors.filters.departmentId || supervisors.filters.expertise || supervisors.filters.isAvailable !== undefined
                ? 'Không có giảng viên khớp bộ lọc hiện tại. Thử thay đổi từ khóa hoặc điều kiện lọc.'
                : 'Chưa có giảng viên trong phạm vi bộ môn hiện tại.'}
            />
          )}

          {supervisors.totalCount > supervisors.pageSize ? (
            <Pagination
              page={supervisors.page}
              pages={totalPages}
              total={supervisors.totalCount}
              pageSize={supervisors.pageSize}
              pageSizeOptions={[10, 20, 50]}
              onPage={nextPage => supervisors.setFilters({ ...supervisors.filters, page: nextPage })}
              onPageSizeChange={nextSize => supervisors.setFilters({ ...supervisors.filters, pageSize: nextSize, page: 1 })}
            />
          ) : null}
        </div>

        {/* Right Bento column: Quick Profile Preview / Department Capacity Summary */}
        <aside className="xl:col-span-4 space-y-4">
          <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
            <div className="flex items-center justify-between gap-2 bg-canvas/70 border-b border-hairline px-5 py-3.5">
              <h2 className="text-sm font-bold text-ink">
                {previewedSupervisor ? 'Xem nhanh hồ sơ' : 'Tổng quan khả năng hướng dẫn'}
              </h2>
              {previewedSupervisor && (
                <button
                  type="button"
                  className="text-xs font-semibold text-primary hover:underline"
                  onClick={() => setPreviewId(null)}
                >
                  Đóng
                </button>
              )}
            </div>
            <div className="p-5 space-y-4">
              {previewedSupervisor ? (
                <>
                  <div className="flex items-center gap-3">
                    <span className="sup__avatar sup__avatar--small" aria-hidden="true">{initials(previewedSupervisor.fullName)}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-ink truncate">{previewedSupervisor.fullName}</p>
                      <p className="text-xs text-ink-muted truncate">{previewedSupervisor.departmentName}</p>
                    </div>
                  </div>
                  <p className="text-xs leading-6 text-ink-soft">
                    {previewedSupervisor.bio ?? 'Giảng viên chưa cập nhật phần giới thiệu.'}
                  </p>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">Chuyên môn</p>
                    {previewedSupervisor.expertise.length > 0 ? (
                      <ul className="sup__expertise">
                        {previewedSupervisor.expertise.map(item => (
                          <li key={`${item.name}-${item.proficiencyLevel ?? ''}`}>
                            <span>{item.name}</span>
                            {item.proficiencyLevel && <small>{item.proficiencyLevel}</small>}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-ink-muted">Chưa khai báo chuyên môn.</p>
                    )}
                  </div>
                  <Link
                    to={`/department/supervisors/${previewedSupervisor.id}`}
                    className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-hover"
                  >
                    Mở trang hồ sơ chi tiết
                    <span className="material-symbols-outlined text-sm" aria-hidden="true">arrow_forward</span>
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-xs leading-6 text-ink-muted">
                    Nhấn biểu tượng xem nhanh trên mỗi dòng để xem tóm tắt chuyên môn tại đây, hoặc mở trực tiếp hồ sơ chi tiết.
                  </p>
                  <div className="rounded-lg border border-hairline bg-canvas p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-ink-muted">Đang hiển thị</span>
                      <strong className="text-ink tabular-nums">{supervisors.items.length} hồ sơ</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ink-muted">Tỷ lệ mở nhận (trang này)</span>
                      <strong className="text-status-success-text tabular-nums">
                        {supervisors.items.length > 0 ? Math.round((availableCount / supervisors.items.length) * 100) : 0}%
                      </strong>
                    </div>
                  </div>
                  <aside className="sup__notice">
                    <span className="material-symbols-outlined" aria-hidden="true">info</span>
                    <p>Hạn mức và số đồ án thực tế được đối chiếu trực tiếp khi phân công đồ án trong học kỳ.</p>
                  </aside>
                </>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

function Status({ available }: { available: boolean }) {
  return <StatusBadge tone={available ? 'success' : 'neutral'} label={available ? 'Sẵn sàng' : 'Chưa sẵn sàng'} />
}

function StatePanel({ title, detail, busy = false, children }: { title: string; detail: string; busy?: boolean; children?: ReactNode }) {
  return <div className="workspace-page sup sup__state"><span className={`material-symbols-outlined ${busy ? 'sup__spin' : ''}`} aria-hidden="true">{busy ? 'progress_activity' : 'info'}</span><h1>{title}</h1><p>{detail}</p>{children}</div>
}

function initials(value: string) {
  return value.trim().split(/\s+/).slice(-2).map(part => part[0]?.toUpperCase()).join('') || '—'
}
