import { useEffect, useState, type FormEvent } from 'react'
import { getTaskCriteria, replaceTaskCriteria, toggleTaskCriterion, type TaskCriteriaList } from '../task-criteria-api'
import { HttpError } from '../../../services/http/http-client'

export function TaskCriteriaPanel({ taskId, revision = 0 }: { taskId: number; revision?: number }) {
  const [data, setData] = useState<TaskCriteriaList | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [draftText, setDraftText] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    getTaskCriteria(taskId, controller.signal)
      .then(result => {
        if (!controller.signal.aborted) {
          setData(result)
          setDraftText(result.items.map(item => item.title).join('\n'))
        }
      })
      .catch(reason => {
        if (!controller.signal.aborted) {
          setError(reason instanceof HttpError && reason.status === 403
            ? 'Bạn không có quyền xem tiêu chí công việc này.'
            : 'Chưa tải được danh sách tiêu chí hoàn thành.')
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [taskId, revision, retryKey])

  const handleToggle = async (criterionId: number, nextCompleted: boolean) => {
    if (busy || !data?.canToggle) return
    setBusy(true); setError('')
    try {
      const updated = await toggleTaskCriterion(taskId, criterionId, nextCompleted)
      setData(updated)
    } catch (reason) {
      setError(reason instanceof HttpError && reason.message ? reason.message : 'Chưa cập nhật được trạng thái tiêu chí.')
    } finally {
      setBusy(false)
    }
  }

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    if (busy || !data?.canManage) return
    const titles = draftText.split('\n').map(line => line.trim()).filter(Boolean)
    setBusy(true); setError('')
    try {
      const updated = await replaceTaskCriteria(taskId, titles.map(title => ({ title })))
      setData(updated)
      setDraftText(updated.items.map(item => item.title).join('\n'))
      setEditing(false)
    } catch (reason) {
      setError(reason instanceof HttpError && reason.message ? reason.message : 'Chưa lưu được danh sách tiêu chí. Nội dung nháp vẫn được giữ nguyên.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="ex-panel" aria-label="Tiêu chí hoàn thành công việc">
      <div className="ex-panel-heading">
        <div>
          <h2>Tiêu chí hoàn thành</h2>
          {data && data.totalCount > 0 && (
            <p>Đã đạt {data.completedCount}/{data.totalCount} tiêu chí nghiệm thu</p>
          )}
        </div>
        {data?.canManage && !editing && (
          <button type="button" className="ex-text-button" disabled={busy} onClick={() => { setDraftText(data.items.map(i => i.title).join('\n')); setEditing(true) }}>
            {data.totalCount > 0 ? 'Chỉnh sửa tiêu chí' : 'Thêm tiêu chí'}
          </button>
        )}
      </div>

      <div className="ex-padding">
        {loading && <p className="ex-muted" role="status">Đang tải tiêu chí…</p>}
        {error && (
          <p role="alert" className="ex-notice ex-notice-error">
            {error}{' '}
            {!data && <button type="button" className="underline" onClick={() => setRetryKey(v => v + 1)}>Thử lại</button>}
          </p>
        )}

        {!loading && data && !editing && (
          data.items.length === 0 ? (
            <p className="ex-muted">Chưa có tiêu chí nghiệm thu nào cho công việc này. Trưởng nhóm/GVHD có thể thêm thủ công hoặc dùng Trợ lý AI để tự động thiết lập.</p>
          ) : (
            <ul className="space-y-2">
              {data.items.map(item => (
                <li key={item.id} className="flex items-start gap-2.5 rounded-lg border border-hairline bg-canvas p-2.5 text-sm">
                  <input
                    type="checkbox"
                    aria-label={item.title}
                    checked={item.isCompleted}
                    disabled={busy || !data.canToggle}
                    onChange={e => void handleToggle(item.id, e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <span className={item.isCompleted ? 'line-through text-ink-muted' : 'text-ink'}>{item.title}</span>
                    {item.isCompleted && item.completedByName && (
                      <p className="mt-0.5 text-xs text-ink-muted">Xác nhận bởi {item.completedByName}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )
        )}

        {editing && data?.canManage && (
          <form onSubmit={e => void handleSave(e)} className="space-y-3">
            <label className="ex-field">
              Mỗi dòng một tiêu chí nghiệm thu (tối đa 30 mục)
              <textarea
                rows={5}
                value={draftText}
                disabled={busy}
                onChange={e => setDraftText(e.target.value)}
                placeholder="Ví dụ:&#10;Hoàn thiện API và test unit&#10;Kiểm tra phân quyền cho các vai trò"
              />
            </label>
            <div className="ex-form-footer">
              <button type="button" className="ex-button" disabled={busy} onClick={() => setEditing(false)}>Hủy</button>
              <button type="submit" className="ex-button ex-button-primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu tiêu chí'}</button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
