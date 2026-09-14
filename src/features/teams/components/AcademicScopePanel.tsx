import { useEffect, useState } from 'react'
import type {
  MajorDto,
  ProjectPeriodDto,
  TeamAcademicScopeDto,
  UserWorkflowContextDto,
} from '../../../types/backend'
import { services } from '../../../services/service-gateway'

interface AcademicScopePanelProps {
  teamId: number
  period: ProjectPeriodDto | null
  workflowContext: UserWorkflowContextDto | null
  scope?: TeamAcademicScopeDto | null
  canConfigure: boolean
  onSaved: () => Promise<void>
  fallbackOrganizationId?: number | null
  fallbackMajorId?: number | null
}

export function AcademicScopePanel({
  teamId, period, workflowContext, scope, canConfigure, onSaved, fallbackOrganizationId, fallbackMajorId,
}: AcademicScopePanelProps) {
  const [mode, setMode] = useState<'SINGLE_MAJOR' | 'INTERDISCIPLINARY'>(
    scope?.projectMode === 'INTERDISCIPLINARY' ? 'INTERDISCIPLINARY' : 'SINGLE_MAJOR',
  )
  const [majors, setMajors] = useState<MajorDto[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>(scope?.requirements.map((item) => item.majorId) ?? [])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const organizationId = workflowContext?.academic.organization?.id ?? fallbackOrganizationId
  const myMajorId = workflowContext?.academic.major?.id ?? fallbackMajorId
  const departmentId = workflowContext?.academic.department?.id
    ?? majors.find((major) => selectedIds.includes(major.id))?.departmentId

  useEffect(() => {
    if (!organizationId) return
    services.academic.getMajors(organizationId)
      .then((items) => {
        setMajors(items)
        setSelectedIds((current) => current.length > 0 ? current : myMajorId ? [myMajorId] : [])
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Không thể tải danh sách ngành.'))
  }, [organizationId, myMajorId])

  const toggleMajor = (majorId: number) => {
    if (mode === 'SINGLE_MAJOR') {
      setSelectedIds([majorId])
      return
    }
    setSelectedIds((current) => current.includes(majorId)
      ? current.filter((id) => id !== majorId)
      : [...current, majorId])
  }

  const save = async () => {
    const requiredCount = mode === 'INTERDISCIPLINARY' ? Math.max(2, period?.minDistinctMajors ?? 2) : 1
    if (!departmentId || selectedIds.length < requiredCount) {
      setError(mode === 'INTERDISCIPLINARY'
        ? `Vui lòng chọn ít nhất ${requiredCount} ngành.`
        : 'Không xác định được ngành hoặc bộ môn chủ trì.')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      await services.team.setAcademicScope(teamId, {
        projectMode: mode,
        primaryMajorId: mode === 'SINGLE_MAJOR' ? selectedIds[0] : null,
        leadDepartmentId: departmentId,
        requirements: selectedIds.map((majorId, index) => ({
          majorId,
          minMembers: mode === 'SINGLE_MAJOR' ? period?.minTeamSize ?? 1 : 1,
          maxMembers: period?.maxTeamSize ?? 5,
          responsibility: index === 0 ? 'Chủ trì' : 'Phối hợp',
        })),
        concurrencyToken: scope?.concurrencyToken ?? null,
      })
      await onSaved()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể lưu phạm vi học thuật.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Chế độ và phạm vi ngành</h3>
          <p className="mt-1 text-xs text-slate-500">Backend dùng cấu hình này để lọc ứng viên và kiểm tra điều kiện nhóm.</p>
        </div>
        {scope && <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">ĐÃ CẤU HÌNH</span>}
      </div>

      {canConfigure && (
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex gap-2">
            {(['SINGLE_MAJOR', 'INTERDISCIPLINARY'] as const).map((value) => (
              <button key={value} type="button" onClick={() => {
                setMode(value)
                if (value === 'SINGLE_MAJOR') setSelectedIds(myMajorId ? [myMajorId] : selectedIds.slice(0, 1))
              }} className={`rounded-lg px-3 py-2 text-xs font-bold ${mode === value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {value === 'SINGLE_MAJOR' ? 'Đơn ngành' : 'Liên ngành'}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {majors.map((major) => (
              <label key={major.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 p-3 text-xs">
                <input type={mode === 'SINGLE_MAJOR' ? 'radio' : 'checkbox'} name="academic-major"
                  checked={selectedIds.includes(major.id)} onChange={() => toggleMajor(major.id)} />
                <span><strong>{major.code}</strong> — {major.name}</span>
              </label>
            ))}
          </div>
          {error && <p className="text-xs font-medium text-rose-700">{error}</p>}
          <button type="button" onClick={save} disabled={isSaving || majors.length === 0}
            className="self-start rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            {isSaving ? 'Đang lưu...' : 'Lưu phạm vi ngành'}
          </button>
        </div>
      )}
      {!canConfigure && scope && (
        <p className="mt-3 text-xs text-slate-600">
          {scope.projectMode === 'INTERDISCIPLINARY' ? 'Liên ngành' : 'Đơn ngành'} · {scope.requirements.length} ngành tham gia
        </p>
      )}
    </section>
  )
}
