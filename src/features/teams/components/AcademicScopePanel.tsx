import { useEffect, useState } from 'react'
import type {
  MajorDto,
  ProjectPeriodDto,
  TeamAcademicScopeDto,
  UserWorkflowContextDto,
} from '../../../types/backend'
import { services } from '../../../services/service-gateway'
import { humanizeHttpError } from '../../../services/http/humanize-http-error'
import { resolveTeamProblemMessage } from '../hooks/useTeamManagement'

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
  const ownMajor = myMajorId ? majors.find((major) => major.id === myMajorId) : undefined
  const ownMajorName = ownMajor?.name ?? workflowContext?.academic.major?.name
  const departmentId = (myMajorId && selectedIds.includes(myMajorId)
    ? (ownMajor?.departmentId ?? workflowContext?.academic.department?.id)
    : null)
    ?? majors.find((major) => selectedIds.includes(major.id))?.departmentId
    ?? workflowContext?.academic.department?.id

  useEffect(() => {
    if (!organizationId) return
    services.academic.getMajors(organizationId)
      .then((items) => {
        setMajors(items)
        setSelectedIds((current) => current.length > 0 ? current : myMajorId ? [myMajorId] : [])
      })
      .catch((reason: unknown) => setError(humanizeHttpError(reason, 'Không thể tải danh sách ngành.')))
  }, [organizationId, myMajorId])

  const toggleMajor = (majorId: number) => {
    setError(null)
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
    if (mode === 'SINGLE_MAJOR') {
      if (selectedIds.length !== 1) {
        setError(ownMajorName
          ? `Nhóm Đơn ngành cần chọn đúng chuyên ngành của bạn (${ownMajorName}).`
          : 'Vui lòng chọn đúng 1 chuyên ngành trước khi lưu.')
        return
      }
      if (myMajorId && selectedIds[0] !== myMajorId) {
        setError(ownMajorName
          ? `Nhóm Đơn ngành phải thuộc đúng chuyên ngành của bạn (${ownMajorName}). Nếu muốn ghép cùng ngành khác, hãy chuyển sang chế độ "Liên ngành".`
          : 'Nhóm Đơn ngành phải thuộc đúng chuyên ngành của bạn. Nếu muốn ghép cùng ngành khác, hãy chuyển sang chế độ "Liên ngành".')
        return
      }
    } else {
      if (myMajorId && !selectedIds.includes(myMajorId)) {
        setError(ownMajorName
          ? `Nhóm Liên ngành bắt buộc phải bao gồm chuyên ngành của bạn (${ownMajorName}). Hãy tích chọn thêm "${ownMajorName}".`
          : 'Nhóm Liên ngành bắt buộc phải bao gồm chuyên ngành của bạn.')
        return
      }
      if (selectedIds.length < requiredCount) {
        setError(ownMajorName
          ? `Nhóm Liên ngành cần chọn tối thiểu ${requiredCount} chuyên ngành (bao gồm ngành của bạn: ${ownMajorName}).`
          : `Vui lòng chọn tối thiểu ${requiredCount} chuyên ngành khác nhau.`)
        return
      }
    }
    if (!departmentId) {
      setError('Không xác định được bộ môn chủ trì hợp lệ cho chuyên ngành đã chọn.')
      return
    }
    const orderedIds = myMajorId && selectedIds.includes(myMajorId)
      ? [myMajorId, ...selectedIds.filter((id) => id !== myMajorId)]
      : selectedIds
    setIsSaving(true)
    setError(null)
    try {
      await services.team.setAcademicScope(teamId, {
        projectMode: mode,
        primaryMajorId: mode === 'SINGLE_MAJOR' ? orderedIds[0] : null,
        leadDepartmentId: departmentId,
        requirements: orderedIds.map((majorId, index) => ({
          majorId,
          minMembers: mode === 'SINGLE_MAJOR' ? period?.minTeamSize ?? 1 : 1,
          maxMembers: period?.maxTeamSize ?? 5,
          responsibility: index === 0 ? 'Chủ trì' : 'Phối hợp',
        })),
        concurrencyToken: scope?.concurrencyToken ?? null,
      })
      await onSaved()
    } catch (reason) {
      setError(resolveTeamProblemMessage(reason) ?? humanizeHttpError(reason, 'Không thể lưu phạm vi học thuật.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="rounded-xl border border-hairline bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-ink">Chế độ và phạm vi ngành</h3>
          <p className="mt-1 text-xs text-ink-muted">Chọn hình thức đồ án và các ngành tham gia để tìm thành viên phù hợp.</p>
        </div>
        {scope && <span className="rounded-md border border-hairline bg-canvas px-2.5 py-1 text-xs font-bold text-ink-muted">ĐÃ CẤU HÌNH</span>}
      </div>

      {canConfigure && (
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {(['SINGLE_MAJOR', 'INTERDISCIPLINARY'] as const).map((value) => (
              <button key={value} type="button" onClick={() => {
                setMode(value)
                setError(null)
                if (value === 'SINGLE_MAJOR') {
                  setSelectedIds(myMajorId ? [myMajorId] : selectedIds.slice(0, 1))
                } else if (myMajorId && !selectedIds.includes(myMajorId)) {
                  setSelectedIds([myMajorId, ...selectedIds])
                }
              }} className={`min-h-11 rounded-lg px-3.5 py-2 text-xs font-bold transition-colors ${mode === value ? 'bg-primary text-white shadow-primary' : 'border border-hairline bg-canvas text-ink-soft hover:border-primary hover:bg-primary-subtle hover:text-primary'}`}>
                {value === 'SINGLE_MAJOR' ? 'Đơn ngành' : 'Liên ngành'}
              </button>
            ))}
          </div>
          <p className="text-xs text-ink-muted">
            {mode === 'SINGLE_MAJOR'
              ? (ownMajorName ? `Nhóm Đơn ngành phải thuộc chuyên ngành của bạn (${ownMajorName}).` : 'Nhóm Đơn ngành phải thuộc đúng chuyên ngành của bạn.')
              : (ownMajorName ? `Chọn tối thiểu ${Math.max(2, period?.minDistinctMajors ?? 2)} chuyên ngành, bắt buộc bao gồm chuyên ngành của bạn (${ownMajorName}).` : `Chọn tối thiểu ${Math.max(2, period?.minDistinctMajors ?? 2)} chuyên ngành, bắt buộc bao gồm chuyên ngành của bạn.`)}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {majors.map((major) => {
              const isOwn = myMajorId != null && major.id === myMajorId
              return (
                <label key={major.id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-hairline bg-card p-3 text-xs text-ink-soft hover:bg-canvas">
                  <input type={mode === 'SINGLE_MAJOR' ? 'radio' : 'checkbox'} name="academic-major"
                    checked={selectedIds.includes(major.id)} onChange={() => toggleMajor(major.id)} className="accent-primary" />
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span><strong className="text-ink">{major.code}</strong> — {major.name}</span>
                    {isOwn && (
                      <span className="rounded-full bg-primary-subtle px-2 py-0.5 text-xs font-semibold text-primary">
                        Ngành của bạn
                      </span>
                    )}
                  </span>
                </label>
              )
            })}
          </div>
          {error && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg px-3 py-2 text-xs font-medium text-status-error-text">{error}</p>}
          <button type="button" onClick={save} disabled={isSaving || majors.length === 0}
            className="min-h-11 self-start rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white shadow-primary transition-colors hover:bg-primary-hover disabled:opacity-50">
            {isSaving ? 'Đang lưu...' : 'Lưu phạm vi ngành'}
          </button>
        </div>
      )}
      {!canConfigure && scope && (
        <p className="mt-3 text-xs text-ink-muted">
          {scope.projectMode === 'INTERDISCIPLINARY' ? 'Liên ngành' : 'Đơn ngành'} · {scope.requirements.length} ngành tham gia
        </p>
      )}
    </section>
  )
}
