import { useEffect, useState, type FormEvent } from 'react'
import type { TeamDto } from '../../../types/backend'
import { Modal } from '../../../components/ui/Modal'

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
    <Modal open={isOpen} title="Cập nhật thông tin nhóm" description={`Mã nhóm ${team.code} không thể thay đổi.`} busy={isPending} onClose={onClose}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Tên nhóm *
            <input autoFocus disabled={isPending} value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 w-full rounded-md border border-slate-300 px-3.5 py-2.5 text-sm font-normal normal-case tracking-normal" />
          </label>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Mô tả
            <textarea disabled={isPending} value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="mt-1.5 w-full rounded-md border border-slate-300 px-3.5 py-2.5 text-sm font-normal normal-case tracking-normal" />
          </label>
          {error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs font-medium text-rose-700">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={isPending} className="app-modal__button">Hủy</button>
            <button type="submit" disabled={isPending} className="app-modal__button app-modal__button--primary">{isPending ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
          </div>
        </form>
    </Modal>
  )
}
