import { useEffect, useState } from 'react'

interface KanbanBlockerPopoverProps {
  taskTitle: string
  onConfirm: (reason: string) => Promise<void> | void
  onCancel: () => void
}

export function KanbanBlockerPopover({ taskTitle, onConfirm, onCancel }: KanbanBlockerPopoverProps) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const trimmedLength = reason.trim().length
  const isValid = trimmedLength >= 15

  const submit = async () => {
    if (!isValid || busy) return
    setBusy(true)
    try {
      await onConfirm(reason.trim())
    } finally {
      setBusy(false)
    }
  }

  return (
    <div role="dialog" aria-label="Lý do bị chặn (BLOCKED)" className="rounded-xl border border-amber-300 bg-white p-4 shadow-lg space-y-3 max-w-md">
      <div className="text-sm font-semibold text-slate-900">Đánh dấu BLOCKED · {taskTitle}</div>
      <p className="text-xs text-slate-600">Bắt buộc nhập lý do bị chặn tối thiểu 15 ký tự để hệ thống tự cảnh báo GVHD nếu kéo dài &gt; 48 giờ.</p>
      <textarea
        aria-label="Lý do bị chặn"
        rows={3}
        value={reason}
        onChange={e => setReason(e.target.value)}
        placeholder="Mô tả vướng mắc cụ thể (ít nhất 15 ký tự)..."
        className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900"
      />
      <div className="flex items-center justify-between text-xs">
        <span className={isValid ? 'text-emerald-700' : 'text-amber-700'}>{trimmedLength}/15 ký tự</span>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-3 py-1 text-slate-700">Hủy</button>
          <button
            type="button"
            disabled={!isValid || busy}
            onClick={() => void submit()}
            className="rounded-md bg-amber-600 px-3 py-1 font-medium text-white disabled:opacity-50"
          >
            Xác nhận BLOCKED
          </button>
        </div>
      </div>
    </div>
  )
}

interface UndoableToastProps {
  message: string
  durationMs?: number
  onUndo: () => Promise<void> | void
  onExpire?: () => void
}

export function UndoableToast({ message, durationMs = 5000, onUndo, onExpire }: UndoableToastProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(false)
      onExpire?.()
    }, durationMs)
    return () => window.clearTimeout(timer)
  }, [durationMs, onExpire])

  if (!visible) return null

  return (
    <div role="status" className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-lg bg-slate-900 px-4 py-3 text-xs text-white shadow-xl">
      <span>{message}</span>
      <button
        type="button"
        onClick={() => {
          setVisible(false)
          void onUndo()
        }}
        className="rounded bg-blue-600 px-2.5 py-1 font-semibold text-white hover:bg-blue-500"
      >
        Hoàn tác (5s)
      </button>
    </div>
  )
}
