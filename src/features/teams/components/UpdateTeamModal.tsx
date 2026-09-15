import { useEffect, useState, type FormEvent } from 'react'
import type { TeamDto } from '../../../types/backend'

interface UpdateTeamModalProps {
  isOpen: boolean
  team: TeamDto
  onClose: () => void
  onSubmit: (data: { name: string; description?: string }) => Promise<void>
  isPending: boolean
}

export function UpdateTeamModal({ isOpen, team, onClose, onSubmit, isPending }: UpdateTeamModalProps) {
  const [name, setName] = useState(team.name)
  const [description, setDescription] = useState(team.description ?? '')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setName(team.name)
      setDescription(team.description ?? '')
      setError(null)
    }
  }, [isOpen, team])

  if (!isOpen) return null

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('Tên nhóm là bắt buộc.')
      return
    }
    try {
      setError(null)
      await onSubmit({ name: name.trim(), description: description.trim() || undefined })
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể cập nhật nhóm.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">Cập nhật thông tin nhóm</h3>
            <p className="mt-0.5 text-xs text-slate-500">Mã nhóm {team.code} không thể thay đổi.</p>
          </div>
          <button type="button" onClick={onClose} disabled={isPending} className="rounded-lg p-1 text-slate-400 hover:text-slate-600 disabled:opacity-50">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4 p-6">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Tên nhóm *
            <input value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-normal normal-case tracking-normal" />
          </label>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Mô tả
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-normal normal-case tracking-normal" />
          </label>
          {error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs font-medium text-rose-700">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={isPending} className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50">Hủy</button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{isPending ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
