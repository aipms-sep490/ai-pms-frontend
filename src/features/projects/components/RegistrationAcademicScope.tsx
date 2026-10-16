import { useEffect, useState } from 'react'
import { services } from '../../../services/service-gateway'
import type { MajorDto, TeamAcademicScopeDto } from '../../../types/backend'

export function RegistrationAcademicScope({ scope, organizationId }: { scope: TeamAcademicScopeDto | null; organizationId?: number }) {
  const [catalog, setCatalog] = useState<{ organizationId: number; majors: MajorDto[] } | null>(null)
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setFailed(false)
    if (organizationId) {
      services.academic.getMajors(organizationId)
        .then(majors => { if (active) setCatalog({ organizationId, majors }) })
        .catch(() => { if (active) setFailed(true) })
    }
    return () => { active = false }
  }, [organizationId, retry])
  const majors = catalog?.organizationId === organizationId ? catalog?.majors ?? [] : []
  const majorName = (id: number) => {
    const major = majors.find(item => item.id === id)
    return major ? `${major.name} (${major.code})` : `Chưa tải được tên ngành (mã ${id})`
  }
  const department = majors.find(item => item.departmentId === scope?.leadDepartmentId)
  return <section className="rounded-md border border-slate-200 bg-slate-50 p-5" aria-label="Phạm vi đăng ký">
    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Phạm vi đăng ký</p>
    {scope ? <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
      <p><strong>Hình thức:</strong> {scope.projectMode === 'INTERDISCIPLINARY' ? 'Liên ngành' : 'Đơn ngành'}</p>
      <p><strong>Bộ môn phụ trách:</strong> {department ? `${department.departmentName} (${department.departmentCode})` : `Chưa tải được tên bộ môn (mã ${scope.leadDepartmentId})`}</p>
      <p className="sm:col-span-2"><strong>Ngành chính:</strong> {scope.primaryMajorId ? majorName(scope.primaryMajorId) : 'Không áp dụng'}</p>
      <div className="sm:col-span-2"><strong>Ngành tham gia:</strong><ul className="mt-2 space-y-1">{scope.requirements.map(item => <li key={item.majorId}>{majorName(item.majorId)} <span className="text-slate-500">· {item.minMembers}–{item.maxMembers} thành viên</span></li>)}</ul></div>
    </div> : <p className="mt-2 text-sm text-slate-600">Chưa tải được phạm vi đăng ký của nhóm. Thông tin này được xác định trong quá trình lập nhóm.</p>}
    {failed && <p role="status" className="mt-3 text-sm text-status-warning-text">Chưa tải được tên ngành và bộ môn. <button type="button" className="underline" onClick={() => setRetry(value => value + 1)}>Thử lại</button></p>}
  </section>
}
