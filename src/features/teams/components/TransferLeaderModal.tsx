import { useState, type FormEvent } from 'react'
import type { TeamMemberDto } from '../../../types/backend'

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
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">{requiresMentorApproval ? 'Đề nghị thay đổi Trưởng nhóm' : 'Bàn giao quyền Trưởng nhóm'}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {requiresMentorApproval
                ? 'Yêu cầu sẽ được gửi tới Mentor hiện tại để phê duyệt trước khi thay đổi có hiệu lực.'
                : 'Chọn thành viên kế nhiệm điều phối nhóm đồ án'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-amber-700 text-[18px] mt-0.5 shrink-0">
              warning
            </span>
            <p className="text-xs text-amber-900 leading-relaxed">
              {requiresMentorApproval
                ? 'Leader hiện tại vẫn giữ quyền cho tới khi ' + (mentorName || 'Mentor') + ' phê duyệt yêu cầu. Hệ thống sẽ xác minh lại tư cách của Leader mới tại thời điểm phê duyệt.'
                : 'Sau khi chuyển quyền, bạn sẽ trở thành thành viên thông thường và không thể tự thu hồi lại quyền Trưởng nhóm.'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Chọn thành viên kế nhiệm *
            </label>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {eligibleMembers.map((m) => (
                <label
                  key={m.userId}
                  className={`flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                    selectedUserId === m.userId ? 'bg-blue-50/40' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="newLeader"
                      value={m.userId}
                      checked={selectedUserId === m.userId}
                      onChange={() => setSelectedUserId(m.userId)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{m.fullName}</p>
                      <p className="text-[11px] font-mono text-slate-500">ID: {m.userId}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {requiresMentorApproval && (
            <label className="block text-xs font-bold text-slate-700">
              Lý do / ghi chú
              <textarea
                className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Mô tả ngắn lý do đề nghị thay đổi Trưởng nhóm"
              />
            </label>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading || eligibleMembers.length === 0}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              {isLoading
                ? 'Đang xử lý...'
                : requiresMentorApproval ? 'Gửi Mentor phê duyệt' : 'Xác nhận chuyển quyền'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
