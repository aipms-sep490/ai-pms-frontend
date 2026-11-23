import { useState, type FormEvent } from 'react'
import type { TeamMemberDto } from '../../../types/backend'
import { Modal } from '../../../components/ui/Modal'

interface TransferLeaderModalProps {
  isOpen: boolean
  members: TeamMemberDto[]
  currentUserId: number
  onClose: () => void
  requiresMentorApproval?: boolean
  mentorName?: string | null
  onSubmit: (newLeaderUserId: number, message?: string) => Promise<void>
}

export function TransferLeaderModal({
  isOpen,
  members,
  currentUserId,
  onClose,
  requiresMentorApproval = false,
  mentorName,
  onSubmit,
}: TransferLeaderModalProps) {
  const eligibleMembers = members.filter((m) => m.userId !== currentUserId)
  const [selectedUserId, setSelectedUserId] = useState<number>(
    eligibleMembers[0]?.userId ?? 0,
  )
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedUserId) {
      setError('Vui lòng chọn thành viên tiếp nhận vai trò Trưởng nhóm.')
      return
    }

    setError(null)
    setIsLoading(true)
    try {
      await onSubmit(selectedUserId, message.trim() || undefined)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chuyển quyền thất bại.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal open={isOpen} title={requiresMentorApproval ? 'Đề nghị thay đổi trưởng nhóm' : 'Bàn giao quyền trưởng nhóm'} description={requiresMentorApproval ? 'Yêu cầu cần giảng viên hướng dẫn phê duyệt trước khi có hiệu lực.' : 'Chọn thành viên kế nhiệm điều phối nhóm đồ án.'} busy={isLoading} onClose={onClose}>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="bg-status-warning-bg border border-status-warning-border rounded-md p-3 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-status-warning-text text-[18px] mt-0.5 shrink-0">
              warning
            </span>
            <p className="text-xs text-status-warning-text leading-relaxed">
              {requiresMentorApproval
                ? 'Trưởng nhóm hiện tại vẫn giữ quyền cho tới khi ' + (mentorName || 'Mentor') + ' phê duyệt yêu cầu. Hệ thống sẽ xác minh lại tư cách của Trưởng nhóm mới tại thời điểm phê duyệt.'
                : 'Sau khi chuyển quyền, bạn sẽ trở thành thành viên thông thường và không thể tự thu hồi lại quyền Trưởng nhóm.'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-2">
              Chọn thành viên kế nhiệm *
            </label>
            <div className="divide-y divide-hairline overflow-hidden rounded-md border border-hairline">
              {eligibleMembers.map((m) => (
                <label
                  key={m.userId}
                  className={`flex min-h-11 cursor-pointer items-center justify-between p-3 transition-colors hover:bg-canvas ${
                    selectedUserId === m.userId ? 'bg-primary-subtle' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      disabled={isLoading}
                      name="newLeader"
                      value={m.userId}
                      checked={selectedUserId === m.userId}
                      onChange={() => setSelectedUserId(m.userId)}
                      className="accent-primary focus:ring-primary"
                    />
                    <div>
                      <p className="text-xs font-semibold text-ink">{m.fullName}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {requiresMentorApproval && (
            <label className="block text-xs font-bold text-ink-soft">
              Lý do / ghi chú
              <textarea
                className="mt-2 w-full rounded-md border border-line-strong bg-card p-3 font-normal text-ink focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Mô tả ngắn lý do đề nghị thay đổi Trưởng nhóm"
              />
            </label>
          )}

          {error && (
            <div className="rounded-lg border border-status-error-border bg-status-error-bg p-2.5 text-xs font-medium text-status-error-text">
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
              disabled={isLoading || eligibleMembers.length === 0}
              className="app-modal__button app-modal__button--primary"
            >
              {isLoading
                ? 'Đang xử lý...'
                : requiresMentorApproval ? 'Gửi đề nghị' : 'Xác nhận chuyển quyền'}
            </button>
          </div>
        </form>
    </Modal>
  )
}
