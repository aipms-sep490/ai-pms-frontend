import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { getSemesterTrackPresets, type AcademicTrackCode, type SemesterTrackPresetDto } from '../../academic/api/academic-blueprints-api'

interface CreateTeamModalProps {
  isOpen: boolean
  semesterId?: number | null
  semesterName: string
  maxTeamSize?: number | null
  onClose: () => void
  majors?: Array<{ id: number; name: string; departmentId?: number | null }>
  defaultMajorId?: number | null
  onSubmit: (data: { code: string; name: string; description?: string; academicScope?: { projectMode: 'SINGLE_MAJOR' | 'INTERDISCIPLINARY'; primaryMajorId: number | null; leadDepartmentId: number; trackCode?: AcademicTrackCode | null; requirements: Array<{ majorId: number; minMembers: number; maxMembers: number; responsibility: string }> } }) => Promise<void>
}

const trackLabels: Record<AcademicTrackCode, string> = {
  IT_ONLY: 'Đơn ngành CNTT (IT_ONLY)',
  MKT_ONLY: 'Đơn ngành Marketing (MKT_ONLY)',
  IT_MKT: 'Liên ngành IT × Marketing (IT_MKT)',
}

export function CreateTeamModal({
  isOpen,
  semesterId = null,
  semesterName,
  maxTeamSize = null,
  onClose,
  onSubmit,
  majors = [],
  defaultMajorId = null,
}: CreateTeamModalProps) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [projectMode, setProjectMode] = useState<'SINGLE_MAJOR' | 'INTERDISCIPLINARY'>('SINGLE_MAJOR')
  const [selectedMajorIds, setSelectedMajorIds] = useState<number[]>(defaultMajorId ? [defaultMajorId] : [])
  const [presets, setPresets] = useState<SemesterTrackPresetDto[]>([])
  const [selectedTrackCode, setSelectedTrackCode] = useState<AcademicTrackCode | ''>('')

  useEffect(() => {
    if (!isOpen || !semesterId) return
    let active = true
    getSemesterTrackPresets(semesterId)
      .then((items) => {
        if (active) setPresets(items ?? [])
      })
      .catch(() => {
        if (active) setPresets([])
      })
    return () => { active = false }
  }, [isOpen, semesterId])

  if (!isOpen) return null

  const activePreset = presets.find((p) => p.trackCode === selectedTrackCode) ?? null
  const effectiveMaxMembers = Math.max(1, activePreset?.maxTeamSize ?? maxTeamSize ?? 5)

  const handleSelectTrack = (trackCode: AcademicTrackCode | '') => {
    setSelectedTrackCode(trackCode)
    const preset = presets.find((p) => p.trackCode === trackCode)
    if (!preset) return
    setProjectMode(preset.projectMode)
    const presetMajorIds = preset.defaultMajorRequirements.map((r) => r.majorId)
    if (presetMajorIds.length > 0) {
      setSelectedMajorIds(presetMajorIds)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!code.trim() || !name.trim()) {
      setError('Vui lòng điền đầy đủ Mã nhóm và Tên nhóm.')
      return
    }

    setError(null)
    setIsLoading(true)
    try {
      const selected = selectedMajorIds.length ? selectedMajorIds : (defaultMajorId ? [defaultMajorId] : [])
      const leadDepartmentId = activePreset?.leadDepartmentId ?? majors.find((major) => selected.includes(major.id))?.departmentId
      if (majors.length > 0 && (!leadDepartmentId || selected.length < (projectMode === 'INTERDISCIPLINARY' ? 2 : 1))) {
        setError('Vui lòng chọn ngành hợp lệ trước khi tạo nhóm.')
        return
      }
      const requirements = selected.map((majorId, index) => {
        const presetReq = activePreset?.defaultMajorRequirements.find((r) => r.majorId === majorId)
        return {
          majorId,
          minMembers: presetReq?.minMembers ?? 1,
          maxMembers: presetReq?.maxMembers ?? effectiveMaxMembers,
          responsibility: presetReq?.responsibility ?? (index === 0 ? 'Chủ trì' : 'Phối hợp'),
        }
      })
      await onSubmit({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || undefined,
        ...(majors.length > 0 ? { academicScope: {
          projectMode,
          primaryMajorId: projectMode === 'SINGLE_MAJOR' ? selected[0] : null,
          leadDepartmentId: leadDepartmentId ?? 0,
          ...(selectedTrackCode ? { trackCode: selectedTrackCode } : {}),
          requirements,
        } } : {}),
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tạo nhóm thất bại.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal open={isOpen} title="Tạo nhóm đồ án" description={`Học kỳ: ${semesterName}`} busy={isLoading} onClose={onClose}>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="create-team-code" className="block text-xs font-medium text-ink-soft mb-1.5">
              Mã Nhóm *
            </label>
            <input
              type="text"
              id="create-team-code"
              autoFocus
              disabled={isLoading}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ví dụ: SE28 hoặc AI05"
              required
              className="min-h-11 w-full rounded-md border border-line-strong bg-card px-3.5 py-2.5 font-mono text-sm text-ink uppercase focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-xs text-ink-muted mt-1">
              Mã định danh nhóm trong học kỳ (chữ và số viết hoa).
            </p>
          </div>

          {majors.length > 0 && <div className="space-y-3">
            {presets.length > 0 && (
              <div>
                <label htmlFor="create-team-track" className="block text-xs font-medium text-ink-soft mb-1.5">
                  Lộ trình / Track học kỳ (gợi ý tự động)
                </label>
                <select
                  id="create-team-track"
                  value={selectedTrackCode}
                  onChange={(event) => handleSelectTrack(event.target.value as AcademicTrackCode | '')}
                  className="min-h-11 w-full rounded-md border border-line-strong bg-card px-3.5 py-2.5 text-sm font-normal text-ink focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  disabled={isLoading}
                >
                  <option value="">Tự cấu hình ngành</option>
                  {presets.map((preset) => (
                    <option key={preset.trackCode} value={preset.trackCode}>
                      {trackLabels[preset.trackCode] ?? preset.trackCode} ({preset.minTeamSize}–{preset.maxTeamSize} SV)
                    </option>
                  ))}
                </select>
                {activePreset && (
                  <p className="mt-1 text-xs text-ink-muted">
                    Định mức: {activePreset.minTeamSize}–{activePreset.maxTeamSize} thành viên · tối thiểu {activePreset.minDistinctMajors} chuyên ngành.
                  </p>
                )}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1.5">Phạm vi đồ án *</label>
              <select value={projectMode} onChange={(event) => { const next = event.target.value as 'SINGLE_MAJOR' | 'INTERDISCIPLINARY'; setSelectedTrackCode(''); setProjectMode(next); if (next === 'SINGLE_MAJOR' && selectedMajorIds.length > 1) setSelectedMajorIds(selectedMajorIds.slice(0, 1)) }} className="min-h-11 w-full rounded-md border border-line-strong bg-card px-3.5 py-2.5 text-sm font-normal text-ink focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20" disabled={isLoading}>
                <option value="SINGLE_MAJOR">Đơn ngành</option>
                <option value="INTERDISCIPLINARY">Liên ngành</option>
              </select>
              <div className="mt-2 grid gap-1 text-sm">
                {majors.map((major) => <label key={major.id} className="flex min-h-9 items-center gap-2"><input type={projectMode === 'SINGLE_MAJOR' ? 'radio' : 'checkbox'} name="create-team-major" checked={selectedMajorIds.includes(major.id)} onChange={() => setSelectedMajorIds((current) => projectMode === 'SINGLE_MAJOR' ? [major.id] : current.includes(major.id) ? current.filter((id) => id !== major.id) : [...current, major.id])} disabled={isLoading} className="accent-primary" />{major.name}</label>)}
              </div>
            </div>
          </div>}

          <div>
            <label htmlFor="create-team-name" className="block text-xs font-medium text-ink-soft mb-1.5">
              Tên Nhóm *
            </label>
            <input
              type="text"
              id="create-team-name"
              disabled={isLoading}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Nhóm SE28 - Capstone đồ án"
              required
              className="min-h-11 w-full rounded-md border border-line-strong bg-card px-3.5 py-2.5 text-sm text-ink focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label htmlFor="create-team-description" className="block text-xs font-medium text-ink-soft mb-1.5">
              Mô tả Nhóm (Tùy chọn)
            </label>
            <textarea
              id="create-team-description"
              disabled={isLoading}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Định hướng nghiên cứu, mục tiêu đề tài của nhóm..."
              className="w-full rounded-md border border-line-strong bg-card px-3.5 py-2.5 text-sm text-ink focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {error && (
            <div className="bg-status-error-bg border border-status-error-border rounded-lg p-2.5 flex items-center gap-2 text-xs text-status-error-text font-medium">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="app-modal__button"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="app-modal__button app-modal__button--primary"
            >
              {isLoading ? 'Đang khởi tạo...' : 'Khởi tạo nhóm'}
            </button>
          </div>
        </form>
    </Modal>
  )
}
