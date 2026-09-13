import { Link, useParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { useSupervisors } from '../hooks/useSupervisors'
import './supervisor-monitoring.css'

export function SupervisorMonitoringPage() {
  const { id } = useParams()
  const supervisors = useSupervisors(id ? Number(id) : undefined)
  const isDetail = Boolean(id)

  if (supervisors.isUnauthorized) return <Link to="/login">Đăng nhập</Link>
  if (supervisors.loading) return <p>Đang tải supervisors…</p>
  if (supervisors.isForbidden) return <p>Backend từ chối quyền hoặc Department scope.</p>
  if (supervisors.error) return <p>Không thể tải supervisor. <Button onClick={() => void supervisors.refresh()}>Thử lại</Button></p>

  if (isDetail && supervisors.current) {
    return <main className="sup">
      <Link to="/department/supervisors">← Directory</Link>
      <h1>{supervisors.current.fullName}</h1>
      <p>{supervisors.current.departmentName} · {supervisors.current.isAvailable ? 'Available' : 'Unavailable'}</p>
      <p>{supervisors.current.bio ?? 'Không có bio.'}</p>
      <h2>Expertise</h2>
      <p>{supervisors.current.expertise.map(item => `${item.name}${item.proficiencyLevel ? ` (${item.proficiencyLevel})` : ''}`).join(' · ') || 'Không có expertise.'}</p>
    </main>
  }

  return <main className="sup">
    <h1>Supervisor Monitoring</h1>
    <div className="sup__filters" aria-label="Supervisor filters">
      <input placeholder="Search" value={supervisors.filters.search ?? ''} onChange={event => supervisors.setFilters({ ...supervisors.filters, search: event.target.value || undefined, page: 1 })} />
      <input aria-label="Department ID" inputMode="numeric" placeholder="Department ID" value={supervisors.filters.departmentId ?? ''} onChange={event => supervisors.setFilters({ ...supervisors.filters, departmentId: event.target.value ? Number(event.target.value) : undefined, page: 1 })} />
      <input aria-label="Expertise" placeholder="Expertise" value={supervisors.filters.expertise ?? ''} onChange={event => supervisors.setFilters({ ...supervisors.filters, expertise: event.target.value || undefined, page: 1 })} />
      <select aria-label="Availability" value={supervisors.filters.isAvailable === undefined ? '' : String(supervisors.filters.isAvailable)} onChange={event => supervisors.setFilters({ ...supervisors.filters, isAvailable: event.target.value === '' ? undefined : event.target.value === 'true', page: 1 })}>
        <option value="">All availability</option>
        <option value="true">Available</option>
        <option value="false">Unavailable</option>
      </select>
    </div>
    {supervisors.items.map(supervisor => <article key={supervisor.id}>
      <Link to={`/department/supervisors/${supervisor.id}`}>{supervisor.fullName}</Link>
      <p>{supervisor.departmentName} · {supervisor.isAvailable ? 'Available' : 'Unavailable'}</p>
      <p>{supervisor.expertise.map(expertise => expertise.name).join(', ') || 'Không có expertise.'}</p>
    </article>)}
    {!supervisors.items.length ? <p>Không có supervisor.</p> : null}
    {supervisors.totalCount > supervisors.pageSize ? <nav className="sup__paging" aria-label="Supervisor pages">
      <Button disabled={supervisors.page <= 1} onClick={() => supervisors.setFilters({ ...supervisors.filters, page: supervisors.page - 1 })}>Previous</Button>
      <span>Page {supervisors.page}</span>
      <Button disabled={supervisors.page * supervisors.pageSize >= supervisors.totalCount} onClick={() => supervisors.setFilters({ ...supervisors.filters, page: supervisors.page + 1 })}>Next</Button>
    </nav> : null}
  </main>
}
