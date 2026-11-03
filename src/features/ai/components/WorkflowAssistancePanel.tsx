import { useEffect, useState } from 'react'
import type { AssistantDraft } from '../academic-ai-api'
import { getWorkflowAssistance, workflowModes, workflowTarget, type WorkflowAssistance, type WorkflowMode } from '../workflow-assistance-api'
import { AssistantDraftCard } from './AssistantDraftCard'
import { HttpError } from '../../../services/http/http-client'
import { env } from '../../../app/config/env'

export function WorkflowAssistancePanel(props: { projectId: number; routeBase?: string; onNavigate: (path: string) => void; onUseDraft?: (draft: AssistantDraft) => void }) {
  return <WorkflowView key={props.projectId} {...props} />
}

function WorkflowView({ projectId, routeBase, onNavigate, onUseDraft }: { projectId: number; routeBase?: string; onNavigate: (path: string) => void; onUseDraft?: (draft: AssistantDraft) => void }) {
  const [mode, setMode] = useState<WorkflowMode>('NEXT_STEPS')
  const [meetingId, setMeetingId] = useState<number>()
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<WorkflowAssistance>()
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [action, setAction] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    setBusy(true); setError(''); setResult(undefined)
    getWorkflowAssistance(projectId, mode, meetingId, controller.signal).then(data => {
      if (controller.signal.aborted) return
      if (data.projectId !== projectId || data.mode !== mode) throw new Error('Scope mismatch')
      setResult(data)
    }).catch(err => {
      if (!controller.signal.aborted) setError(err instanceof HttpError && [401, 403].includes(err.status)
        ? 'Bạn chưa có quyền xem phần hỗ trợ này trong đồ án.' : 'Chưa kiểm tra được dữ liệu. Vui lòng thử lại; chưa thể kết luận điều kiện nghiệp vụ.')
    }).finally(() => { if (!controller.signal.aborted) setBusy(false) })
    return () => controller.abort()
  }, [projectId, mode, meetingId, revision])
  const labels: Record<string, string> = { AVAILABLE: 'Có thể thao tác', BLOCKED: 'Cần xử lý', READY: 'Đủ điều kiện hiện tại', MISSING: 'Còn thiếu', REVIEW: 'Cần xem xét' }
  return <section className="assistant-workflow" aria-label="Hỗ trợ nghiệp vụ đồ án">
    <header><h2>Cùng hoàn thành đúng bước</h2><p>Kiểm tra dữ liệu theo quyền của bạn. Mở biểu mẫu, kiểm tra rồi tự lưu hoặc nộp.</p></header>
    <label>Nhu cầu hỗ trợ<select aria-label="Nhu cầu hỗ trợ" value={mode} onChange={event => { setMode(event.target.value as WorkflowMode); setMeetingId(undefined); setResult(undefined); setAction('') }}>
      {Object.entries(workflowModes).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
    </select></label>
    <button type="button" disabled={busy} onClick={() => setRevision(r => r + 1)}>{busy ? 'Đang kiểm tra…' : 'Kiểm tra lại'}</button>
    {busy && <p role="status">Đang đọc dữ liệu hiện hành của đồ án…</p>}
    {error && <p role="alert">{error}</p>}
    {!busy && result && <>
      <p className="assistant-workflow-summary">{result.summary}</p>
      <small>Kiểm tra lúc {new Date(result.generatedAt.endsWith('Z') || /[+-]\d\d:\d\d$/.test(result.generatedAt) ? result.generatedAt : `${result.generatedAt}Z`).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} · giờ Việt Nam</small>
      {mode === 'MEETING_FOLLOWUP' && <label>Cuộc họp<select aria-label="Cuộc họp cần theo dõi" value={meetingId ?? ''} onChange={event => setMeetingId(event.target.value ? Number(event.target.value) : undefined)}>
        <option value="">Chọn cuộc họp có bạn tham gia</option>
        {result.meetings?.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
      </select></label>}
      {mode === 'BLOCKERS' && result.items.length > 0 && <label>Thao tác cần kiểm tra<select aria-label="Thao tác cần kiểm tra" value={action} onChange={event => setAction(event.target.value)}>
        <option value="">Tất cả thao tác</option>{result.items.map(item => <option value={item.code} key={item.code}>{item.title}</option>)}
      </select></label>}
      {result.items.filter(item => mode !== 'BLOCKERS' || !action || item.code === action).map((item, index) => {
        const destination = item.target === 'agreement' && !env.workingAgreementEnabled ? undefined : workflowTarget(routeBase, projectId, item)
        return <article key={`${item.code}:${index}`} className="assistant-workflow-item">
          <span className={`assistant-workflow-status ${item.status === 'BLOCKED' || item.status === 'MISSING' ? 'needs-action' : ''}`}>{labels[item.status] ?? 'Thông tin cần kiểm tra'}</span>
          <h3>{item.title}</h3><p>{item.detail}</p><p><strong>Người xử lý:</strong> {item.owner}</p><small>Nguồn: {item.source}</small>
          {destination && <button type="button" onClick={() => onNavigate(destination)}>Mở trang liên quan</button>}
        </article>
      })}
      {result.draft && <AssistantDraftCard draft={result.draft} onUse={onUseDraft} />}
      <details className="assistant-workflow-limits" open><summary>Phạm vi kiểm tra</summary><ul>{result.limitations.map((note, index) => <li key={index}>{note}</li>)}</ul></details>
    </>}
  </section>
}
