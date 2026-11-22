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
  const [resolved, setResolved] = useState<{ key: string; status: 'ready' | 'error' } | null>(null)
  const [revision, setRevision] = useState(0)
  const requestKey = session ? `${session.accessToken}:${revision}` : ''
  const state: 'loading' | 'ready' | 'error' = !session ? 'error' : resolved?.key === requestKey ? resolved.status : 'loading'
  useEffect(() => {
    if (!session) return
    const controller = new AbortController()
    const key = `${session.accessToken}:${revision}`
    getAcademicHierarchy(session.accessToken, { search: '', includeInactive: true }, controller.signal)
      .then(items => { if (!controller.signal.aborted) { setHierarchy(items); setResolved({ key, status: 'ready' }) } })
      .catch(() => { if (!controller.signal.aborted) setResolved({ key, status: 'error' }) })
    return () => controller.abort()
  }, [session, revision])
  const departments = hierarchy.flatMap(item => item.departments)
  const choices = departments.filter(item => item.department.isActive || String(item.department.id) === departmentId)
  const majors = departments.find(item => String(item.department.id) === departmentId)?.majors ?? []
  const eligibleMajors = majors.filter(item => item.isActive || String(item.id) === majorId)
  return <div className="academic-scope-fields grid gap-3 sm:grid-cols-2">
    <label className="block text-sm font-medium text-ink-soft">Bộ môn<select name="departmentId" className="mt-1 block min-h-11 w-full rounded-lg border border-hairline bg-card px-3 text-sm font-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:bg-canvas disabled:text-ink-muted" value={departmentId} disabled={disabled || state !== 'ready'} onChange={event => onChange({ departmentId: event.target.value, majorId: '' })}>
      <option value="">{emptyLabel}</option>
      {departmentId && !choices.some(item => String(item.department.id) === departmentId) && <option value={departmentId}>Bộ môn #{departmentId}</option>}
      {choices.map(({ department }) => <option key={department.id} value={department.id}>{department.name}{department.isActive ? '' : ' · Ngừng hoạt động'}</option>)}
    </select></label>
    <label className="block text-sm font-medium text-ink-soft">Chuyên ngành<select name="majorId" className="mt-1 block min-h-11 w-full rounded-lg border border-hairline bg-card px-3 text-sm font-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:bg-canvas disabled:text-ink-muted" value={majorId} disabled={disabled || state !== 'ready' || !departmentId} onChange={event => onChange({ departmentId, majorId: event.target.value })}>
      <option value="">{emptyLabel}</option>
      {majorId && !eligibleMajors.some(item => String(item.id) === majorId) && <option value={majorId}>Chuyên ngành #{majorId}</option>}
      {eligibleMajors.map(major => <option key={major.id} value={major.id}>{major.code} · {major.name}{major.isActive ? '' : ' · Ngừng hoạt động'}</option>)}
    </select></label>
    {state === 'loading' && <p role="status" className="sm:col-span-2 text-xs text-ink-muted">Đang tải bộ môn và chuyên ngành…</p>}
    {state === 'error' && <p role="alert" className="sm:col-span-2 rounded-lg border border-status-error-border bg-status-error-bg p-3 text-xs text-status-error-text">Chưa tải được danh mục đào tạo. <button type="button" className="min-h-9 rounded-md px-2 font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={() => setRevision(value => value + 1)} disabled={disabled}>Thử lại</button></p>}
  </div>
}
