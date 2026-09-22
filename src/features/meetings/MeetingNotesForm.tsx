import { useState, type FormEvent } from 'react'
import { attendanceStatuses, type AttendanceStatus, type MeetingDetail, type MeetingNotes } from './meeting-types'

export function MeetingNotesForm({ meeting, busy, locked = false, onSave, onDirty, onCancel }: {
  meeting: MeetingDetail; busy: boolean; locked?: boolean; onSave: (body: MeetingNotes) => Promise<void>; onDirty: () => void; onCancel: () => void
}) {
  const [notes, setNotes] = useState(meeting.meetingNotes ?? '')
  const [attendances, setAttendances] = useState<Record<number, AttendanceStatus>>({})
  function submit(event: FormEvent) {
    event.preventDefault()
    if (busy || locked) return
    void onSave({ meetingNotes: notes.trim() || null, attendances: Object.entries(attendances).map(([userId, attendanceStatus]) => ({ userId: Number(userId), attendanceStatus })) })
  }
  return <form className="mtg-form" onSubmit={submit}><fieldset disabled={busy || locked}>
    <label>Biên bản & kết luận<textarea rows={7} value={notes} onChange={(event) => { setNotes(event.target.value); onDirty() }} placeholder="Nội dung đã trao đổi, quyết định thống nhất, người phụ trách và mốc tiếp theo…" /></label>
    <fieldset className="mtg-attendance"><legend>Điểm danh người tham gia</legend>{meeting.participants.length === 0 && <p className="mtg-help">Chưa có người tham gia để điểm danh.</p>}{meeting.participants.map((participant) => <label key={participant.userId}>{participant.fullName}<select value={attendances[participant.userId] ?? participant.attendanceStatus ?? ''} onChange={(event) => { setAttendances({ ...attendances, [participant.userId]: event.target.value as AttendanceStatus }); onDirty() }}><option value="" disabled>Chưa cập nhật</option>{Object.entries(attendanceStatuses).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>)}</fieldset>
    <div className="mtg-form-actions"><button type="button" className="mtg-button mtg-button--secondary" onClick={onCancel}>Đóng chỉnh sửa</button><button type="submit" className="mtg-button">{locked ? 'Cần tải lại trạng thái' : busy ? 'Đang lưu…' : 'Lưu biên bản & điểm danh'}</button></div>
  </fieldset></form>
}
