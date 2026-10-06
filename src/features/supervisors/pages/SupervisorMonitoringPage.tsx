import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { useSupervisors } from '../hooks/useSupervisors'
import './supervisor-monitoring.css'

export function SupervisorMonitoringPage() {
  const { id } = useParams()
  const supervisors = useSupervisors(id ? Number(id) : undefined)
  const isDetail = Boolean(id)

  if (supervisors.isUnauthorized) return <StatePanel title="Phiên đăng nhập đã hết hạn" detail="Đăng nhập lại để tiếp tục xem danh sách giảng viên."><Link className="sup__state-link" to="/login">Đến trang đăng nhập</Link></StatePanel>
  if (supervisors.loading) return <StatePanel title="Đang tải giảng viên" detail="Hệ thống đang đồng bộ hồ sơ và trạng thái sẵn sàng." busy />
  if (supervisors.isForbidden) return <StatePanel title="Không có quyền truy cập" detail="Tài khoản hiện tại không thuộc phạm vi bộ môn được phép xem." />
  if (supervisors.error) return <StatePanel title="Không thể tải danh sách" detail="Kết nối dữ liệu giảng viên chưa sẵn sàng."><Button onClick={() => void supervisors.refresh()}>Thử lại</Button></StatePanel>

  if (isDetail && supervisors.current) {
    const current = supervisors.current
    return <main className="sup">
      <Link className="sup__back" to="/department/supervisors"><span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>Danh sách giảng viên</Link>
      <header className="sup__profile-header">
        <span className="sup__avatar" aria-hidden="true">{initials(current.fullName)}</span>
        <div className="sup__profile-copy"><p className="sup__eyebrow">Hồ sơ giảng viên · #{current.id}</p><h1>{current.fullName}</h1><p>{current.departmentName}</p></div>
        <Status available={current.isAvailable} />
      </header>
      <div className="sup__detail-grid">
        <section className="sup__panel"><p className="sup__section-label">Giới thiệu</p><p className="sup__bio">{current.bio ?? 'Giảng viên chưa cập nhật phần giới thiệu.'}</p></section>
        <section className="sup__panel"><p className="sup__section-label">Chuyên môn</p>{current.expertise.length ? <ul className="sup__expertise">{current.expertise.map(item => <li key={`${item.name}-${item.proficiencyLevel}`}><span>{item.name}</span>{item.proficiencyLevel && <small>{item.proficiencyLevel}</small>}</li>)}</ul> : <p className="sup__muted">Chưa có dữ liệu chuyên môn.</p>}</section>
      </div>
      <aside className="sup__notice"><span className="material-symbols-outlined" aria-hidden="true">info</span><p>Tải công việc và sức chứa chỉ xuất hiện trong màn chọn giảng viên theo từng đồ án khi hệ thống cung cấp dữ liệu.</p></aside>
    </main>
  }

  if (isDetail) return <StatePanel title="Không tìm thấy giảng viên" detail="Hồ sơ có thể đã bị xóa hoặc nằm ngoài phạm vi bộ môn."><Link className="sup__state-link" to="/department/supervisors">Quay lại danh sách</Link></StatePanel>

  return <main className="sup">
    <header className="sup__header"><div><p className="sup__eyebrow">Không gian bộ môn</p><h1>Giảng viên hướng dẫn</h1><p>Tra cứu hồ sơ, chuyên môn và trạng thái sẵn sàng của giảng viên trong bộ môn.</p></div><div className="sup__count"><strong>{supervisors.totalCount}</strong><span>hồ sơ</span></div></header>
    <div className="sup__filters" aria-label="Lọc giảng viên hướng dẫn">
      <label><span>Tìm kiếm</span><input placeholder="Tên giảng viên" value={supervisors.filters.search ?? ''} onChange={event => supervisors.setFilters({ ...supervisors.filters, search: event.target.value || undefined, page: 1 })} /></label>
      <label><span>Mã bộ môn</span><input aria-label="Mã bộ môn" inputMode="numeric" placeholder="Tất cả" value={supervisors.filters.departmentId ?? ''} onChange={event => supervisors.setFilters({ ...supervisors.filters, departmentId: event.target.value ? Number(event.target.value) : undefined, page: 1 })} /></label>
      <label><span>Chuyên môn</span><input aria-label="Chuyên môn" placeholder="Ví dụ: AI" value={supervisors.filters.expertise ?? ''} onChange={event => supervisors.setFilters({ ...supervisors.filters, expertise: event.target.value || undefined, page: 1 })} /></label>
      <label><span>Trạng thái</span><select aria-label="Trạng thái sẵn sàng" value={supervisors.filters.isAvailable === undefined ? '' : String(supervisors.filters.isAvailable)} onChange={event => supervisors.setFilters({ ...supervisors.filters, isAvailable: event.target.value === '' ? undefined : event.target.value === 'true', page: 1 })}>
        <option value="">Tất cả trạng thái</option>
        <option value="true">Sẵn sàng nhận hướng dẫn</option>
        <option value="false">Tạm thời chưa nhận</option>
      </select>
      </label>
    </div>
    <section className="sup__list" aria-label="Danh sách giảng viên">{supervisors.items.map(supervisor => <article key={supervisor.id}>
      <span className="sup__avatar sup__avatar--small" aria-hidden="true">{initials(supervisor.fullName)}</span>
      <div className="sup__card-copy"><Link to={`/department/supervisors/${supervisor.id}`}>{supervisor.fullName}</Link><p>{supervisor.departmentName}</p><div className="sup__tags">{supervisor.expertise.slice(0, 3).map(expertise => <span key={expertise.name}>{expertise.name}</span>)}{supervisor.expertise.length > 3 && <span>+{supervisor.expertise.length - 3}</span>}{!supervisor.expertise.length && <em>Chưa cập nhật chuyên môn</em>}</div></div>
      <Status available={supervisor.isAvailable} />
      <Link className="sup__open" aria-label={`Mở hồ sơ ${supervisor.fullName}`} to={`/department/supervisors/${supervisor.id}`}><span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span></Link>
    </article>)}</section>
    {!supervisors.items.length ? <div className="sup__empty"><span className="material-symbols-outlined" aria-hidden="true">person_search</span><strong>Không tìm thấy giảng viên</strong><p>Thử thay đổi từ khóa hoặc bộ lọc đang chọn.</p></div> : null}
    {supervisors.totalCount > supervisors.pageSize ? <nav className="sup__paging" aria-label="Phân trang giảng viên">
      <Button variant="secondary" disabled={supervisors.page <= 1} onClick={() => supervisors.setFilters({ ...supervisors.filters, page: supervisors.page - 1 })}>Trang trước</Button>
      <span>Trang {supervisors.page} / {Math.ceil(supervisors.totalCount / supervisors.pageSize)}</span>
      <Button variant="secondary" disabled={supervisors.page * supervisors.pageSize >= supervisors.totalCount} onClick={() => supervisors.setFilters({ ...supervisors.filters, page: supervisors.page + 1 })}>Trang sau</Button>
    </nav> : null}
  </main>
}

function Status({ available }: { available: boolean }) {
  return <span className={`sup__status ${available ? 'sup__status--available' : 'sup__status--unavailable'}`}><i aria-hidden="true" />{available ? 'Sẵn sàng' : 'Chưa sẵn sàng'}</span>
}

function StatePanel({ title, detail, busy = false, children }: { title: string; detail: string; busy?: boolean; children?: ReactNode }) {
  return <main className="sup sup__state"><span className={`material-symbols-outlined ${busy ? 'sup__spin' : ''}`} aria-hidden="true">{busy ? 'progress_activity' : 'info'}</span><h1>{title}</h1><p>{detail}</p>{children}</main>
}

function initials(value: string) {
  return value.trim().split(/\s+/).slice(-2).map(part => part[0]?.toUpperCase()).join('') || '—'
}
