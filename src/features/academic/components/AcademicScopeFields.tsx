import { useEffect, useState } from 'react'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { getAcademicHierarchy } from '../api/academic-api'
import type { AcademicHierarchyOrganization } from '../types/academic.types'

/** Select real academic records; preserve an existing reference even when it is inactive. */
export function AcademicScopeFields({ departmentId, majorId, onChange, disabled = false, emptyLabel = 'Chưa liên kết' }: {
  departmentId: string; majorId: string; onChange: (value: { departmentId: string; majorId: string }) => void; disabled?: boolean
  /** Label of the empty choice; filters use "Tất cả" while account forms keep "Chưa liên kết". */
  emptyLabel?: string
}) {
  const { session } = useAuthSession()
  const [hierarchy, setHierarchy] = useState<AcademicHierarchyOrganization[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    if (!session) { setState('error'); return }
    const controller = new AbortController()
    setState('loading')
    getAcademicHierarchy(session.accessToken, { search: '', includeInactive: true }, controller.signal)
      .then(items => { if (!controller.signal.aborted) { setHierarchy(items); setState('ready') } })
      .catch(() => { if (!controller.signal.aborted) setState('error') })
    return () => controller.abort()
  }, [session, revision])
  const departments = hierarchy.flatMap(item => item.departments)
  const choices = departments.filter(item => item.department.isActive || String(item.department.id) === departmentId)
  const majors = departments.find(item => String(item.department.id) === departmentId)?.majors ?? []
  const eligibleMajors = majors.filter(item => item.isActive || String(item.id) === majorId)
  return <div className="academic-scope-fields">
    <label>Bộ môn<select name="departmentId" value={departmentId} disabled={disabled || state !== 'ready'} onChange={event => onChange({ departmentId: event.target.value, majorId: '' })}>
      <option value="">{emptyLabel}</option>
      {departmentId && !choices.some(item => String(item.department.id) === departmentId) && <option value={departmentId}>Bộ môn #{departmentId}</option>}
      {choices.map(({ department }) => <option key={department.id} value={department.id}>{department.name}{department.isActive ? '' : ' · Ngừng hoạt động'}</option>)}
    </select></label>
    <label>Chuyên ngành<select name="majorId" value={majorId} disabled={disabled || state !== 'ready' || !departmentId} onChange={event => onChange({ departmentId, majorId: event.target.value })}>
      <option value="">{emptyLabel}</option>
      {majorId && !eligibleMajors.some(item => String(item.id) === majorId) && <option value={majorId}>Chuyên ngành #{majorId}</option>}
      {eligibleMajors.map(major => <option key={major.id} value={major.id}>{major.code} · {major.name}{major.isActive ? '' : ' · Ngừng hoạt động'}</option>)}
    </select></label>
    {state === 'loading' && <p role="status">Đang tải bộ môn và chuyên ngành…</p>}
    {state === 'error' && <p role="alert">Chưa tải được danh mục đào tạo. <button type="button" onClick={() => setRevision(value => value + 1)} disabled={disabled}>Thử lại</button></p>}
  </div>
}
