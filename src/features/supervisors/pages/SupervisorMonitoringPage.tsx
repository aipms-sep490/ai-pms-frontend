import { displayLabel } from '../../../components/ui/display-label'
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { FilterToolbar, type ActiveFilterChip } from '../../../components/ui/FilterToolbar'
import { ListLoading } from '../../../components/ui/ListLoading'
import { Pagination } from '../../../components/ui/Pagination'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { WorkspaceEmptyState } from '../../../components/ui/WorkspaceState'
import { useSupervisors } from '../hooks/useSupervisors'
import './supervisor-monitoring.css'

type SupervisorSort = 'name_asc' | 'available_first' | 'expertise_desc'

export function SupervisorMonitoringPage() {
  const { id } = useParams()
  const supervisors = useSupervisors(id ? Number(id) : undefined)
  const [sortBy, setSortBy] = useState<SupervisorSort>('name_asc')
  const isDetail = Boolean(id)

  const sortedItems = useMemo(() => {
    return [...supervisors.items].sort((a, b) => {
      if (sortBy === 'available_first') {
        if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1
        return a.fullName.localeCompare(b.fullName, 'vi')
      }
      if (sortBy === 'expertise_desc') {
        if (b.expertise.length !== a.expertise.length) return b.expertise.length - a.expertise.length
        return a.fullName.localeCompare(b.fullName, 'vi')
      }
      return a.fullName.localeCompare(b.fullName, 'vi')
    })
  }, [supervisors.items, sortBy])

  if (supervisors.isUnauthorized) return <StatePanel title="Phiên đăng nhập đã hết hạn" detail="Đăng nhập lại để tiếp tục xem danh sách giảng viên."><Link className="sup__state-link" to="/login">Đến trang đăng nhập</Link></StatePanel>
  if (supervisors.loading && isDetail) return <StatePanel title="Đang tải giảng viên" detail="Hệ thống đang đồng bộ hồ sơ và trạng thái sẵn sàng." busy />
  if (supervisors.isForbidden) return <StatePanel title="Không có quyền truy cập" detail="Tài khoản hiện tại không thuộc phạm vi bộ môn được phép xem." />
  if (supervisors.error) return <StatePanel title="Không thể tải danh sách" detail="Kết nối dữ liệu giảng viên chưa sẵn sàng."><Button onClick={() => void supervisors.refresh()}>Thử lại</Button></StatePanel>

  if (isDetail && supervisors.current) {
    const current = supervisors.current
    return (
      <WorkspacePage
        size="standard"
        className="sup"
        eyebrow="Hồ sơ giảng viên"
        title={current.fullName}
        description={current.departmentName}
        backTo="/department/supervisors"
        backLabel="Danh sách giảng viên"
        identity={<Avatar name={current.fullName} size="lg" />}
        action={<Status available={current.isAvailable} />}
      >
        <div className="sup__detail-grid">
          <section className="sup__panel"><p className="sup__section-label">Giới thiệu</p><p className="sup__bio">{current.bio ?? 'Giảng viên chưa cập nhật phần giới thiệu.'}</p></section>
          <section className="sup__panel"><p className="sup__section-label">Chuyên môn</p>{current.expertise.length ? <ul className="sup__expertise">{current.expertise.map(item => <li key={`${item.name}-${displayLabel(item.proficiencyLevel)}`}><span>{item.name}</span>{item.proficiencyLevel && <small>{displayLabel(item.proficiencyLevel)}</small>}</li>)}</ul> : <p className="sup__muted">Chưa có dữ liệu chuyên môn.</p>}</section>
        </div>
        <aside className="sup__notice"><span className="material-symbols-outlined" aria-hidden="true">info</span><p>Số đồ án đang hướng dẫn và số nhóm có thể nhận thêm được hiển thị khi chọn giảng viên cho đồ án.</p></aside>
      </WorkspacePage>
    )
  }

  if (isDetail) return <StatePanel title="Không tìm thấy giảng viên" detail="Hồ sơ có thể đã bị xóa hoặc nằm ngoài phạm vi bộ môn."><Link className="sup__state-link" to="/department/supervisors">Quay lại danh sách</Link></StatePanel>

  const availabilityTab = supervisors.filters.isAvailable === undefined
    ? 'ALL'
    : supervisors.filters.isAvailable
      ? 'AVAILABLE'
      : 'UNAVAILABLE'

  const hasActiveFilters = Boolean(supervisors.filters.search || supervisors.filters.expertise || supervisors.filters.isAvailable !== undefined)
  const activeChips: ActiveFilterChip[] = []
  if (supervisors.filters.expertise) activeChips.push({ id: 'expertise', label: 'Chuyên môn', value: supervisors.filters.expertise })
  if (supervisors.filters.isAvailable !== undefined) {
    activeChips.push({
      id: 'isAvailable',
      label: 'Trạng thái',
      value: supervisors.filters.isAvailable ? 'Sẵn sàng nhận hướng dẫn' : 'Tạm thời chưa nhận',
    })
  }

  return (
    <WorkspacePage
      size="wide"
      className="sup"
      eyebrow="Không gian bộ môn"
      title="Giảng viên hướng dẫn"
      description="Tra cứu hồ sơ, chuyên môn và trạng thái sẵn sàng của giảng viên trong bộ môn."
      action={
        <div className="flex items-center gap-3">
          <div className="sup__count"><strong>{supervisors.totalCount}</strong><span>hồ sơ</span></div>
          <Button variant="secondary" size="sm" icon="refresh" aria-label="Tải lại" disabled={supervisors.loading} onClick={() => void supervisors.refresh()} />
        </div>
      }
    >
      <FilterToolbar
        search={supervisors.filters.search ?? ''}
        onSearchChange={value => supervisors.setFilters({ ...supervisors.filters, search: value || undefined, page: 1 })}
        searchLabel="Tìm kiếm giảng viên"
        searchPlaceholder="Tên giảng viên"
        debounceMs={0}
        tabs={[
          { value: 'ALL', label: 'Tất cả' },
          { value: 'AVAILABLE', label: 'Đang nhận hướng dẫn' },
          { value: 'UNAVAILABLE', label: 'Tạm chưa nhận' },
        ]}
        activeTab={availabilityTab}
        onTabChange={tab => supervisors.setFilters({
          ...supervisors.filters,
          isAvailable: tab === 'ALL' ? undefined : tab === 'AVAILABLE',
          page: 1,
        })}
        tabsLabel="Lọc giảng viên theo trạng thái nhận hướng dẫn"
        controls={
          <>
            <label className="ft-select-wrap">
              <span className="sr-only">Bộ môn</span>
              <select
                className="ft-select"
                aria-label="Bộ môn"
                value={supervisors.filters.departmentId ?? supervisors.allowedDepartments[0]?.id ?? ''}
                onChange={event => supervisors.setFilters({ ...supervisors.filters, departmentId: Number(event.target.value), page: 1 })}
              >
                {supervisors.allowedDepartments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
              </select>
            </label>
            <label className="ft-select-wrap">
              <span className="sr-only">Chuyên môn</span>
              <input
                aria-label="Chuyên môn"
                placeholder="Lọc chuyên môn (VD: AI)..."
                className="ft-select min-w-[160px]"
                value={supervisors.filters.expertise ?? ''}
                onChange={event => supervisors.setFilters({ ...supervisors.filters, expertise: event.target.value || undefined, page: 1 })}
              />
            </label>
            <label className="ft-select-wrap">
              <span className="sr-only">Trạng thái sẵn sàng</span>
              <select
                className="ft-select"
                aria-label="Trạng thái sẵn sàng"
                value={supervisors.filters.isAvailable === undefined ? '' : String(supervisors.filters.isAvailable)}
                onChange={event => supervisors.setFilters({ ...supervisors.filters, isAvailable: event.target.value === '' ? undefined : event.target.value === 'true', page: 1 })}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="true">Sẵn sàng nhận hướng dẫn</option>
                <option value="false">Tạm thời chưa nhận</option>
              </select>
            </label>
          </>
        }
        sort={{
          value: sortBy,
          onChange: value => setSortBy(value as SupervisorSort),
          options: [
            { value: 'name_asc', label: 'Tên A–Z' },
            { value: 'available_first', label: 'Sẵn sàng trước' },
            { value: 'expertise_desc', label: 'Nhiều chuyên môn nhất' },
          ],
        }}
        activeChips={activeChips}
        onRemoveChip={chipId => {
          if (chipId === 'expertise') supervisors.setFilters({ ...supervisors.filters, expertise: undefined, page: 1 })
          if (chipId === 'isAvailable') supervisors.setFilters({ ...supervisors.filters, isAvailable: undefined, page: 1 })
        }}
        onClearAll={() => supervisors.setFilters({ ...supervisors.filters, search: undefined, expertise: undefined, isAvailable: undefined, page: 1 })}
        hasActiveFilters={hasActiveFilters}
        resultSummary={`${sortedItems.length} / ${supervisors.totalCount} hồ sơ`}
      />

      {supervisors.loading ? (
        <div className="mt-4"><ListLoading label="Đang tải giảng viên…" /></div>
      ) : sortedItems.length > 0 ? (
        <section className="sup__list" aria-label="Danh sách giảng viên">
          {sortedItems.map(supervisor => {
            const withLoad = supervisor as typeof supervisor & { activeProjectCount?: number; maxProjects?: number }
            const hasLoad = typeof withLoad.activeProjectCount === 'number' && typeof withLoad.maxProjects === 'number' && withLoad.maxProjects > 0
            const loadPct = hasLoad ? Math.min(100, Math.round((withLoad.activeProjectCount! / withLoad.maxProjects!) * 100)) : 0
            return (
              <article key={supervisor.id}>
                <Avatar name={supervisor.fullName} size="md" />
                <div className="sup__card-copy">
                  <Link to={`/department/supervisors/${supervisor.id}`}>{supervisor.fullName}</Link>
                  <p>{supervisor.departmentName}</p>
                  <div className="sup__tags">
                    {supervisor.expertise.slice(0, 3).map(expertise => <span key={expertise.name}>{expertise.name}</span>)}
                    {supervisor.expertise.length > 3 && <span>+{supervisor.expertise.length - 3}</span>}
                    {!supervisor.expertise.length && <em>Chưa cập nhật chuyên môn</em>}
                  </div>
                  {hasLoad && (
                    <div className="mt-2 flex max-w-[220px] items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-hairline">
                        <div className={`h-full rounded-full ${loadPct >= 100 ? 'bg-status-error-text' : 'bg-primary'}`} style={{ width: `${loadPct}%` }} />
                      </div>
                      <span className="font-mono text-xs font-semibold text-ink-muted">
                        {withLoad.activeProjectCount}/{withLoad.maxProjects}
                      </span>
                    </div>
                  )}
                </div>
                <Status available={supervisor.isAvailable} />
                <Link className="sup__open" aria-label={`Mở hồ sơ ${supervisor.fullName}`} to={`/department/supervisors/${supervisor.id}`}>
                  <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                </Link>
              </article>
            )
          })}
        </section>
      ) : (
        <WorkspaceEmptyState
          title="Không tìm thấy giảng viên"
          message={supervisors.filters.search || supervisors.filters.departmentId || supervisors.filters.expertise || supervisors.filters.isAvailable !== undefined ? 'Không có giảng viên khớp bộ lọc hiện tại. Thử thay đổi từ khóa hoặc điều kiện lọc.' : 'Chưa có giảng viên trong phạm vi bộ môn hiện tại.'}
        />
      )}

      {!supervisors.loading && supervisors.totalCount > supervisors.pageSize ? (
        <Pagination
          page={supervisors.page}
          pages={Math.ceil(supervisors.totalCount / supervisors.pageSize)}
          total={supervisors.totalCount}
          pageSize={supervisors.pageSize}
          busy={supervisors.loading}
          onPage={(next) => supervisors.setFilters({ ...supervisors.filters, page: next })}
          onPageSizeChange={(size) => supervisors.setFilters({ ...supervisors.filters, page: 1, pageSize: size })}
        />
      ) : null}
    </WorkspacePage>
  )
}

function Status({ available }: { available: boolean }) {
  return <span className={`sup__status ${available ? 'sup__status--available' : 'sup__status--unavailable'}`}><i aria-hidden="true" />{available ? 'Sẵn sàng' : 'Chưa sẵn sàng'}</span>
}

function StatePanel({ title, detail, busy = false, children }: { title: string; detail: string; busy?: boolean; children?: ReactNode }) {
  return <div className="workspace-page sup sup__state"><span className={`material-symbols-outlined ${busy ? 'sup__spin' : ''}`} aria-hidden="true">{busy ? 'progress_activity' : 'info'}</span><h1>{title}</h1><p>{detail}</p>{children}</div>
}
