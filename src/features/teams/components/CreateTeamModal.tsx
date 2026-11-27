import { useState, type FormEvent } from 'react'
import { Modal } from '../../../components/ui/Modal'

interface CreateTeamModalProps {
  isOpen: boolean
  semesterName: string
  onClose: () => void
  majors?: Array<{ id: number; name: string; departmentId?: number | null }>
  defaultMajorId?: number | null
  onSubmit: (data: { code: string; name: string; description?: string; academicScope?: { projectMode: 'SINGLE_MAJOR' | 'INTERDISCIPLINARY'; primaryMajorId: number | null; leadDepartmentId: number; requirements: Array<{ majorId: number; minMembers: number; maxMembers: number; responsibility: string }> } }) => Promise<void>
}

export function CreateTeamModal({
  isOpen,
  semesterName,
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
  const [selectedMajorIds, setSelectedMajorIds] = useState<number[] | null>(null)

  if (!isOpen) return null

  const effectiveSelectedMajorIds = selectedMajorIds ?? (defaultMajorId ? [defaultMajorId] : [])
  const ownMajor = defaultMajorId ? majors.find((major) => major.id === defaultMajorId) : undefined
  const ownMajorName = ownMajor?.name

  const handleModeChange = (next: 'SINGLE_MAJOR' | 'INTERDISCIPLINARY') => {
    setProjectMode(next)
    setError(null)
    if (next === 'SINGLE_MAJOR') {
      setSelectedMajorIds(defaultMajorId ? [defaultMajorId] : effectiveSelectedMajorIds.slice(0, 1))
    } else if (defaultMajorId && !effectiveSelectedMajorIds.includes(defaultMajorId)) {
      setSelectedMajorIds([defaultMajorId, ...effectiveSelectedMajorIds])
    } else {
      setSelectedMajorIds(effectiveSelectedMajorIds)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!code.trim() || !name.trim()) {
      setError('Vui lòng điền đầy đủ Mã nhóm và Tên nhóm.')
      return
    }

    const selected = effectiveSelectedMajorIds.length ? effectiveSelectedMajorIds : (defaultMajorId ? [defaultMajorId] : [])
    if (majors.length > 0) {
      if (projectMode === 'SINGLE_MAJOR') {
        if (selected.length !== 1) {
          setError(ownMajorName
            ? `Nhóm Đơn ngành cần chọn đúng chuyên ngành của bạn (${ownMajorName}).`
            : 'Vui lòng chọn đúng 1 chuyên ngành trước khi tạo nhóm.')
          return
        }
        if (defaultMajorId && selected[0] !== defaultMajorId) {
          setError(ownMajorName
            ? `Nhóm Đơn ngành phải thuộc đúng chuyên ngành của bạn (${ownMajorName}). Nếu muốn ghép cùng ngành khác, hãy chuyển Phạm vi đồ án sang "Liên ngành".`
            : 'Nhóm Đơn ngành phải thuộc đúng chuyên ngành của bạn. Nếu muốn làm cùng ngành khác, hãy chuyển Phạm vi đồ án sang "Liên ngành".')
          return
        }
      } else {
        if (defaultMajorId && !selected.includes(defaultMajorId)) {
          setError(ownMajorName
            ? `Nhóm Liên ngành bắt buộc phải bao gồm chuyên ngành của bạn (${ownMajorName}). Hãy tích chọn thêm "${ownMajorName}".`
            : 'Nhóm Liên ngành bắt buộc phải bao gồm chuyên ngành của bạn.')
          return
        }
        if (selected.length < 2) {
          setError(ownMajorName
            ? `Nhóm Liên ngành cần chọn tối thiểu 2 chuyên ngành (bao gồm ngành của bạn: ${ownMajorName}).`
            : 'Nhóm Liên ngành cần chọn tối thiểu 2 chuyên ngành khác nhau.')
          return
        }
      }

      const leadDepartmentId = (defaultMajorId && selected.includes(defaultMajorId) ? ownMajor?.departmentId : null)
        ?? majors.find((major) => selected.includes(major.id))?.departmentId
      if (!leadDepartmentId) {
        setError('Chuyên ngành đã chọn chưa gắn bộ môn chủ trì hợp lệ. Vui lòng chọn lại hoặc liên hệ bộ môn.')
        return
      }

      const orderedMajors = defaultMajorId && selected.includes(defaultMajorId)
        ? [defaultMajorId, ...selected.filter((id) => id !== defaultMajorId)]
        : selected

      setError(null)
      setIsLoading(true)
      try {
        await onSubmit({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          description: description.trim() || undefined,
          academicScope: {
            projectMode,
            primaryMajorId: projectMode === 'SINGLE_MAJOR' ? orderedMajors[0] : null,
            leadDepartmentId,
            requirements: orderedMajors.map((majorId, index) => ({ majorId, minMembers: 1, maxMembers: 5, responsibility: index === 0 ? 'Chủ trì' : 'Phối hợp' })),
          },
        })
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Tạo nhóm thất bại.')
      } finally {
        setIsLoading(false)
      }
      return
    }

    setError(null)
    setIsLoading(true)
    try {
      await onSubmit({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || undefined,
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

          {majors.length > 0 && <div>
            <label className="block text-xs font-medium text-ink-soft mb-1.5">Phạm vi đồ án *</label>
            <select value={projectMode} onChange={(event) => handleModeChange(event.target.value as 'SINGLE_MAJOR' | 'INTERDISCIPLINARY')} className="min-h-11 w-full rounded-md border border-line-strong bg-card px-3.5 py-2.5 text-sm font-normal text-ink focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20" disabled={isLoading}>
              <option value="SINGLE_MAJOR">Đơn ngành</option>
              <option value="INTERDISCIPLINARY">Liên ngành</option>
            </select>
            <p className="mt-1.5 text-xs text-ink-muted">
              {projectMode === 'SINGLE_MAJOR'
                ? (ownMajorName ? `Nhóm Đơn ngành phải thuộc chuyên ngành của bạn (${ownMajorName}).` : 'Nhóm Đơn ngành phải thuộc đúng chuyên ngành của bạn.')
                : (ownMajorName ? `Chọn tối thiểu 2 chuyên ngành, bắt buộc bao gồm chuyên ngành của bạn (${ownMajorName}).` : 'Chọn tối thiểu 2 chuyên ngành, bắt buộc bao gồm chuyên ngành của bạn.')}
            </p>
            <div className="mt-2 grid gap-1 text-sm">
              {majors.map((major) => {
                const isOwn = defaultMajorId != null && major.id === defaultMajorId
                return (
                  <label key={major.id} className="flex min-h-9 items-center gap-2">
                    <input
                      type={projectMode === 'SINGLE_MAJOR' ? 'radio' : 'checkbox'}
                      name="create-team-major"
                      checked={effectiveSelectedMajorIds.includes(major.id)}
                      onChange={() => {
                        setError(null)
                        setSelectedMajorIds((current) => {
                          const base = current ?? effectiveSelectedMajorIds
                          return projectMode === 'SINGLE_MAJOR'
                            ? [major.id]
                            : base.includes(major.id) ? base.filter((id) => id !== major.id) : [...base, major.id]
                        })
                      }}
                      disabled={isLoading}
                      className="accent-primary"
                    />
                    <span>{major.name}</span>
                    {isOwn && (
                      <span className="rounded-full bg-primary-subtle px-2 py-0.5 text-xs font-semibold text-primary">
                        Ngành của bạn
                      </span>
                    )}
                  </label>
                )
              })}
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
