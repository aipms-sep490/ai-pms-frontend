import { useState, type FormEvent } from 'react'
import { Modal } from '../../../components/ui/Modal'

interface CreateTeamModalProps {
  isOpen: boolean
  semesterName: string
  onClose: () => void
  onSubmit: (data: { code: string; name: string; description?: string }) => Promise<void>
}

export function CreateTeamModal({
  isOpen,
  semesterName,
  onClose,
  onSubmit,
}: CreateTeamModalProps) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!code.trim() || !name.trim()) {
      setError('Vui lòng điền đầy đủ Mã nhóm và Tên nhóm.')
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
            <label htmlFor="create-team-code" className="block text-xs font-medium text-slate-700 mb-1.5">
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
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white uppercase font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Mã định danh nhóm trong học kỳ (chữ và số viết hoa).
            </p>
          </div>

          <div>
            <label htmlFor="create-team-name" className="block text-xs font-medium text-slate-700 mb-1.5">
              Tên Nhóm *
            </label>
            <input
              type="text"
              id="create-team-name"
              disabled={isLoading}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Nhóm SE28 - Capstone Project"
              required
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div>
            <label htmlFor="create-team-description" className="block text-xs font-medium text-slate-700 mb-1.5">
              Mô tả Nhóm (Tùy chọn)
            </label>
            <textarea
              id="create-team-description"
              disabled={isLoading}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Định hướng nghiên cứu, mục tiêu đề tài của nhóm..."
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 flex items-center gap-2 text-xs text-rose-700 font-medium">
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
