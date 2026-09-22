import { useState, type FormEvent } from 'react'
import type { CreateMeeting, MeetingCandidate, MeetingDetail } from './meeting-types'
import { safeMeetingUrl, toMeetingInput, toMeetingUtc } from './meeting-utils'

export function MeetingScheduleForm({ meeting, busy, locked = false, candidates = [], currentUserId, onSave, onDirty, onCancel }: {
  meeting?: MeetingDetail; busy: boolean; locked?: boolean; candidates?: MeetingCandidate[]; currentUserId?: number
  onSave: (body: CreateMeeting) => Promise<void>; onDirty: () => void; onCancel?: () => void
}) {
  const [values, setValues] = useState(() => ({ title: meeting?.title ?? '', agenda: meeting?.agenda ?? '', startAt: toMeetingInput(meeting?.startAt ?? null), endAt: toMeetingInput(meeting?.endAt ?? null), location: meeting?.location ?? '', onlineUrl: meeting?.onlineUrl ?? '' }))
  const [participants, setParticipants] = useState<number[]>([])
  const [error, setError] = useState('')
  function update(key: keyof typeof values, value: string) { setValues({ ...values, [key]: value }); setError(''); onDirty() }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (busy || locked) return
    if (!values.title.trim() || values.title.trim().length > 255) { setError('Nhập tiêu đề từ 1 đến 255 ký tự.'); return }
    if (!values.startAt || Number.isNaN(Date.parse(`${values.startAt}+07:00`))) { setError('Chọn thời gian bắt đầu hợp lệ.'); return }
    if (values.endAt && (Number.isNaN(Date.parse(`${values.endAt}+07:00`)) || values.endAt < values.startAt)) { setError('Giờ kết thúc phải bằng hoặc sau giờ bắt đầu.'); return }
    if (values.onlineUrl.trim() && !safeMeetingUrl(values.onlineUrl)) { setError('Liên kết họp phải là địa chỉ http:// hoặc https:// hợp lệ, không chứa tài khoản hoặc mật khẩu.'); return }
    await onSave({ title: values.title.trim(), agenda: values.agenda.trim() || null, startAt: toMeetingUtc(values.startAt), endAt: values.endAt ? toMeetingUtc(values.endAt) : null,
      location: values.location.trim() || null, onlineUrl: values.onlineUrl.trim() || null, participantUserIds: participants.filter((id) => id !== currentUserId) })
  }
  return <form className="mtg-form" onSubmit={(event) => void save(event)}><fieldset disabled={busy || locked}>
    <label>Tiêu đề cuộc họp<input required maxLength={255} value={values.title} onChange={(event) => update('title', event.target.value)} placeholder="Ví dụ: Rà soát tiến độ và kế hoạch tuần" /></label>
    <div className="mtg-field-grid"><label>Bắt đầu (giờ Việt Nam)<input type="datetime-local" required value={values.startAt} onChange={(event) => update('startAt', event.target.value)} /></label><label>Kết thúc (không bắt buộc)<input type="datetime-local" min={values.startAt || undefined} value={values.endAt} onChange={(event) => update('endAt', event.target.value)} /></label></div>
    <div className="mtg-field-grid"><label>Địa điểm<input value={values.location} onChange={(event) => update('location', event.target.value)} placeholder="Phòng họp hoặc địa điểm gặp mặt" /></label><label>Liên kết họp trực tuyến<input type="url" value={values.onlineUrl} onChange={(event) => update('onlineUrl', event.target.value)} placeholder="https://…" /></label></div>
    <label>Nội dung dự kiến<textarea rows={5} value={values.agenda} onChange={(event) => update('agenda', event.target.value)} placeholder="Các đầu việc cần trao đổi, quyết định hoặc xin ý kiến…" /></label>
    {!meeting && <fieldset className="mtg-candidate-list"><legend>Mời người tham gia</legend><p className="mtg-help">Người tạo được tự động thêm vào cuộc họp. Bạn có thể mời thêm sau khi lưu lịch.</p>{candidates.map((candidate) => <label className="mtg-checkbox" key={candidate.userId}><input type="checkbox" checked={candidate.userId === currentUserId || participants.includes(candidate.userId)} disabled={candidate.userId === currentUserId} onChange={(event) => { setParticipants(event.target.checked ? [...participants, candidate.userId] : participants.filter((id) => id !== candidate.userId)); onDirty() }} /><span>{candidate.fullName}<small>{candidate.role}{candidate.userId === currentUserId ? ' · Bạn' : ''}</small></span></label>)}</fieldset>}
    {error && <p role="alert" className="mtg-validation">{error}</p>}
    <div className="mtg-form-actions">{onCancel && <button type="button" className="mtg-button mtg-button--secondary" onClick={onCancel}>Đóng chỉnh sửa</button>}<button className="mtg-button" type="submit">{locked ? 'Cần kiểm tra lại trạng thái' : busy ? 'Đang lưu…' : meeting ? 'Lưu lịch họp' : 'Tạo cuộc họp'}</button></div>
  </fieldset></form>
}
