import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { dateTimeLabel, executionError } from '../../execution/execution-utils'
import { ExState } from '../../execution/execution-ui'
import { taskStatusLabel } from '../../projects/utils/collaboration-workspace'
import {
  getTaskDependencyImpacts, resolveTaskDependencyImpact,
  type DependencyImpactDecision, type TaskDependencyImpacts,
} from '../task-dependency-impacts-api'

const verdictLabels = {
  PENDING: 'Cần kiểm tra ảnh hưởng',
  CONFIRMED_VALID: 'Đã xác nhận vẫn hợp lệ',
  REWORK_REQUIRED: 'Đã yêu cầu làm lại',
}

export function TaskDependencyImpactPanel({ taskId, taskStatus, concurrencyToken, routeBase, revision, canReview = false, onTaskUpdated }: {
  taskId: number
  taskStatus: string
  concurrencyToken?: string
  routeBase: string
  revision: number
  canReview?: boolean
  onTaskUpdated: () => void
}) {
  const [data, setData] = useState<TaskDependencyImpacts | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [localRevision, setLocalRevision] = useState(0)
  const [selected, setSelected] = useState<{ id: number; decision: DependencyImpactDecision } | null>(null)
  const [reason, setReason] = useState('')
  const [mutationError, setMutationError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const sending = useRef(false)
  const currentTask = useRef<number | null>(taskId)
  const canRework = ['DONE', 'IN_PROGRESS', 'TODO', 'BLOCKED'].includes(taskStatus)

  useEffect(() => {
    currentTask.current = taskId
    setSelected(null); setReason(''); setMutationError(''); setNotice('')
    return () => { currentTask.current = null }
  }, [taskId])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setLoadError(''); setData(null)
    getTaskDependencyImpacts(taskId, controller.signal).then(next => {
      if (controller.signal.aborted) return
      if (next.taskId !== taskId) throw new Error('Task mismatch')
      setData(next)
    }).catch(error => {
      if (!controller.signal.aborted) setLoadError(executionError(error, 'tải thông tin ảnh hưởng'))
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [taskId, revision, localRevision])

  function selectImpact(id: number, decision: DependencyImpactDecision) {
    if (selected?.id !== id) setReason('')
    setSelected({ id, decision }); setMutationError(''); setNotice('')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const item = data?.items.find(candidate => candidate.id === selected?.id)
    if (sending.current || loading || !canReview || !data?.canReview || !selected || !item?.canResolve) return
    if (selected.decision === 'REWORK_REQUIRED' && !canRework) return
    if (!reason.trim()) { setMutationError('Nhập lý do và kết quả đối chiếu trước khi xác nhận.'); return }
    const savingTaskId = taskId
    sending.current = true; setBusy(true); setMutationError(''); setNotice('')
    try {
      await resolveTaskDependencyImpact(taskId, selected.id, {
        decision: selected.decision, reason: reason.trim(), concurrencyToken,
      })
      if (currentTask.current !== savingTaskId) return
      setNotice(selected.decision === 'REWORK_REQUIRED'
        ? 'Đã ghi nhận đánh giá và yêu cầu làm lại công việc.'
        : 'Đã ghi nhận xác nhận kết quả vẫn hợp lệ.')
      setSelected(null); setReason('')
      setLocalRevision(value => value + 1)
      onTaskUpdated()
    } catch (error) {
      if (currentTask.current === savingTaskId) setMutationError(executionError(error, 'lưu đánh giá ảnh hưởng'))
    } finally {
      sending.current = false
      if (currentTask.current === savingTaskId) setBusy(false)
    }
  }

  const pending = data?.items.filter(item => item.status === 'PENDING') ?? []
  const reviewed = data?.items.filter(item => item.status !== 'PENDING') ?? []

  return <section className="ex-panel" aria-label="Kiểm tra ảnh hưởng từ công việc tiền nhiệm">
    <div className="ex-panel-heading"><h3>Ảnh hưởng từ công việc tiền nhiệm</h3>
      <button type="button" className="ex-text-button" disabled={loading || busy} onClick={() => { setLocalRevision(value => value + 1); onTaskUpdated() }}>Tải lại</button>
    </div>
    <div className="ex-padding ex-stack">
      {loading ? <ExState loading message="Đang kiểm tra ảnh hưởng…" />
        : loadError ? <ExState message={loadError} retry={() => setLocalRevision(value => value + 1)} />
        : data && <>
          {pending.length > 0 && <p role="status" className="ex-notice">Có {pending.length} thay đổi từ công việc tiền nhiệm cần đối chiếu. Trạng thái hoàn thành được giữ nguyên cho đến khi trưởng nhóm hoặc GVHD đánh giá; chưa thể coi kết quả là đã được xác nhận lại.</p>}
          {data.items.length === 0 && <p className="ex-muted">Chưa ghi nhận công việc tiền nhiệm được mở lại cần kiểm tra.</p>}
          {pending.map(item => <article key={item.id} className="rounded-lg border border-hairline p-3 ex-stack">
            <p className="font-semibold text-status-warning-text">{verdictLabels[item.status]}</p>
            <p><Link className="ex-link" to={`${routeBase}/tasks/${item.predecessorTaskId}`}>{item.predecessorTitle}</Link> · {taskStatusLabel(item.predecessorStatus)}</p>
            <p className="ex-muted">Mở lại lúc {dateTimeLabel(item.reopenedAt)}</p>
            <p className="whitespace-pre-wrap">Lý do: {item.reopenReason}</p>
            {!item.canResolve && <p className="ex-muted">{item.blockedReason || 'Hoàn tất công việc tiền nhiệm trước khi kết luận ảnh hưởng.'}</p>}
            {canReview && data.canReview ? <div className="ex-actions flex-wrap">
              <button type="button" className="ex-button" disabled={busy || !item.canResolve} onClick={() => selectImpact(item.id, 'CONFIRMED_VALID')}>Giữ kết quả hoàn thành</button>
              <button type="button" className="ex-button" disabled={busy || !item.canResolve || !canRework} onClick={() => selectImpact(item.id, 'REWORK_REQUIRED')}>Yêu cầu làm lại</button>
            </div> : <p className="ex-muted">Trưởng nhóm hoặc GVHD có quyền đánh giá ảnh hưởng và yêu cầu làm lại.</p>}
            {canReview && data.canReview && !canRework && <p className="ex-muted">Cần xử lý bước nghiệm thu hoặc khôi phục công việc trước khi yêu cầu làm lại.</p>}
            {selected?.id === item.id && canReview && data.canReview && item.canResolve && <form className="ex-stack" onSubmit={event => void submit(event)}>
              <p>{selected.decision === 'REWORK_REQUIRED'
                ? taskStatus === 'DONE'
                  ? 'Xác nhận sẽ mở lại công việc đã hoàn thành để chỉnh sửa và nghiệm thu lại. Các công việc hoàn thành phụ thuộc vào kết quả này sẽ được cảnh báo để kiểm tra.'
                  : 'Xác nhận ghi nhận yêu cầu làm lại; công việc tiếp tục giữ trạng thái hiện tại để người phụ trách bổ sung kết quả.'
                : 'Chỉ xác nhận sau khi đối chiếu kết quả đã nghiệm thu với thay đổi của công việc tiền nhiệm.'}</p>
              <label className="ex-field">Lý do đánh giá<textarea value={reason} maxLength={1000} rows={3} disabled={busy} onChange={event => { setReason(event.target.value); setMutationError('') }} /></label>
              <div className="ex-actions"><button type="button" className="ex-button" disabled={busy} onClick={() => { setSelected(null); setMutationError('') }}>Hủy đánh giá</button>
                <button type="submit" className="ex-button ex-button-primary" disabled={busy}>{busy ? 'Đang lưu…' : selected.decision === 'REWORK_REQUIRED' ? 'Xác nhận yêu cầu làm lại' : 'Xác nhận vẫn hợp lệ'}</button></div>
            </form>}
          </article>)}
          {reviewed.length > 0 && <details><summary className="ex-link">Lịch sử đánh giá ảnh hưởng ({reviewed.length})</summary><ol className="ex-history">{reviewed.map(item => <li key={item.id}>
            <strong>{verdictLabels[item.status]}</strong><p>{item.predecessorTitle}</p>
            <time>{dateTimeLabel(item.reviewedAt)}{item.reviewedBy ? ` · Người đánh giá #${item.reviewedBy}` : ''}</time>
            <p className="whitespace-pre-wrap">{item.reviewReason}</p>
          </li>)}</ol></details>}
        </>}
      {mutationError && <p role="alert" className="ex-notice ex-notice-error">{mutationError} Nếu dữ liệu đã thay đổi, chọn Tải lại để đối chiếu trước khi gửi lại. Lý do đang nhập được giữ lại.</p>}
      {notice && <p role="status" className="ex-notice">{notice}</p>}
    </div>
  </section>
}
