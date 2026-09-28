import { useEffect, useState, type FormEvent } from 'react'
import * as api from '../../services/api/meetings.api'
import type { MeetingActionItem, MeetingCandidate, MeetingDetail } from './meeting-types'
import { formatMeetingTime, meetingError } from './meeting-utils'

const actionLabels: Record<string, string> = { OPEN: 'Mở', IN_PROGRESS: 'Đang thực hiện', DONE: 'Hoàn thành', CANCELLED: 'Đã hủy' }

export function MeetingGovernancePanel({ meeting, concurrencyToken, candidates, canManage, disabled, onChanged }: {
  meeting: MeetingDetail; concurrencyToken: string; candidates: MeetingCandidate[]; canManage: boolean; disabled: boolean; onChanged: () => void
}) {
  const [decisions, setDecisions] = useState<import('./meeting-types').MeetingDecision[]>([])
  const [actions, setActions] = useState<MeetingActionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [awaitingRefresh, setAwaitingRefresh] = useState(false)
  const [decision, setDecision] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeUserId, setAssigneeUserId] = useState('')
  const [dueAt, setDueAt] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(''); setNotice(''); setAwaitingRefresh(false)
    Promise.all([api.getMeetingDecisions(meeting.id, controller.signal), api.getMeetingActionItems(meeting.id, controller.signal)])
      .then(([decisionPage, actionPage]) => { if (!controller.signal.aborted) { setDecisions(decisionPage.items); setActions(actionPage.items) } })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(meetingError(reason)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [meeting.id, meeting.concurrencyToken])

  async function run(operation: () => Promise<void>, success: string) {
    if (busy || disabled || awaitingRefresh) return
    setBusy(true); setError(''); setNotice('')
    try { await operation(); setNotice(success); setAwaitingRefresh(true); onChanged() }
    catch (reason) { setError(meetingError(reason)) }
    finally { setBusy(false) }
  }

  function saveDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = decision.trim()
    if (!content) return
    void run(async () => { const created = await api.createMeetingDecision(meeting.id, content, concurrencyToken); setDecisions(current => [created, ...current]); setDecision('') }, 'Đã ghi nhận kết luận. Dữ liệu cuộc họp đang được tải lại.')
  }
  function saveAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle) return
    void run(async () => {
      const created = await api.createMeetingActionItem(meeting.id, { title: cleanTitle, description: description.trim() || null, assigneeUserId: assigneeUserId ? Number(assigneeUserId) : null, dueAt: dueAt ? new Date(`${dueAt}T00:00:00+07:00`).toISOString() : null, status: 'OPEN', concurrencyToken })
      setActions(current => [created, ...current]); setTitle(''); setDescription(''); setAssigneeUserId(''); setDueAt('')
    }, 'Đã tạo công việc sau họp. Dữ liệu cuộc họp đang được tải lại.')
  }
  function updateStatus(item: MeetingActionItem, status: string) {
    if (status === item.status) return
    void run(async () => {
      const updated = await api.updateMeetingActionItem(meeting.id, item.id, { title: item.title, description: item.description, assigneeUserId: item.assigneeUserId, dueAt: item.dueAt, status: status as import('./meeting-types').MeetingActionStatus, concurrencyToken: item.concurrencyToken })
      setActions(current => current.map(action => action.id === updated.id ? updated : action))
    }, 'Đã cập nhật trạng thái công việc. Dữ liệu cuộc họp đang được tải lại.')
  }

  const mayRecordDecision = canManage && meeting.status === 'COMPLETED'
  const mayManageActions = canManage && meeting.status !== 'CANCELLED'
  const controlsDisabled = disabled || busy || awaitingRefresh
  return <section className="mtg-panel mtg-padded" aria-labelledby="meeting-governance-title">
    <div className="mtg-section-heading"><div><h2 id="meeting-governance-title">Kết luận và công việc sau họp</h2><p className="mtg-help">Kết luận chỉ được ghi sau khi cuộc họp hoàn tất. Máy chủ kiểm tra lại quyền, trạng thái và token.</p></div></div>
    {loading && <p role="status" className="mtg-help">Đang tải kết luận và công việc…</p>}
    {error && <div className="mtg-notice mtg-notice--error" role="alert"><p>{error}</p><button className="mtg-text-button" onClick={onChanged}>Tải lại dữ liệu cuộc họp</button></div>}
    {notice && <p className="mtg-notice mtg-notice--success" role="status">{notice}</p>}
    {!loading && <div className="mtg-stack"><div><h3 className="mtg-subheading">Kết luận <span className="mtg-count">{decisions.length}</span></h3>{decisions.length ? <ol className="mtg-feedback-list">{decisions.map(item => <li key={item.id}><time dateTime={item.decidedAt}>{formatMeetingTime(item.decidedAt)}</time><p className="mtg-prose">{item.content}</p></li>)}</ol> : <p className="mtg-help">Chưa có kết luận được ghi nhận.</p>}
        {mayRecordDecision && <form className="mtg-form" onSubmit={saveDecision}><label>Kết luận mới<textarea rows={3} maxLength={4000} required value={decision} disabled={controlsDisabled} onChange={event => setDecision(event.target.value)} /></label><button className="mtg-button mtg-button--secondary" disabled={controlsDisabled || !decision.trim()} type="submit">{busy ? 'Đang lưu…' : 'Ghi kết luận'}</button></form>}</div>
      <div><h3 className="mtg-subheading">Công việc sau họp <span className="mtg-count">{actions.length}</span></h3>{actions.length ? <ul className="mtg-feedback-list">{actions.map(item => <li key={item.id}><div className="mtg-section-heading"><strong>{item.title}</strong><label className="mtg-inline-field">Trạng thái<select value={item.status} disabled={controlsDisabled || !mayManageActions || ['DONE', 'CANCELLED'].includes(item.status)} onChange={event => updateStatus(item, event.target.value)}>{Object.entries(actionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>{item.description && <p className="mtg-prose">{item.description}</p>}<p className="mtg-help">{item.dueAt ? `Hạn: ${formatMeetingTime(item.dueAt)}` : 'Chưa đặt hạn'}{item.assigneeUserId ? ` · Phụ trách: #${item.assigneeUserId}` : ' · Chưa giao người phụ trách'}</p></li>)}</ul> : <p className="mtg-help">Chưa có công việc sau họp.</p>}
        {mayManageActions && <form className="mtg-form" onSubmit={saveAction}><div className="mtg-form-grid"><label>Công việc<input required maxLength={500} value={title} disabled={controlsDisabled} onChange={event => setTitle(event.target.value)} /></label><label>Hạn hoàn thành<input type="date" value={dueAt} disabled={controlsDisabled} onChange={event => setDueAt(event.target.value)} /></label><label className="mtg-full">Người phụ trách<select value={assigneeUserId} disabled={controlsDisabled} onChange={event => setAssigneeUserId(event.target.value)}><option value="">Chưa phân công</option>{candidates.map(candidate => <option key={candidate.userId} value={candidate.userId}>{candidate.fullName} · {candidate.role}</option>)}</select></label><label className="mtg-full">Mô tả<textarea rows={2} maxLength={4000} value={description} disabled={controlsDisabled} onChange={event => setDescription(event.target.value)} /></label></div><button className="mtg-button mtg-button--secondary" disabled={controlsDisabled || !title.trim()} type="submit">{busy ? 'Đang lưu…' : 'Tạo công việc'}</button></form>}</div></div>}
  </section>
}
