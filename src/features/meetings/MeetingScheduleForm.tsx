import { useState, type FormEvent } from 'react'
import { env } from '../../app/config/env'
import type { CreateMeeting, MeetingCandidate, MeetingDetail } from './meeting-types'
import type { MeetingDeliveryMode, MeetingVideoChannel } from './video/meeting-video.types'
import { safeMeetingUrl, toMeetingInput, toMeetingUtc } from './meeting-utils'

export function MeetingScheduleForm({ meeting, busy, locked = false, candidates = [], currentUserId, onSave, onDirty, onCancel }: {
  meeting?: MeetingDetail; busy: boolean; locked?: boolean; candidates?: MeetingCandidate[]; currentUserId?: number
  onSave: (body: CreateMeeting) => Promise<void>; onDirty: () => void; onCancel?: () => void
}) {
  // Do not infer a legacy meeting's delivery state from location or onlineUrl. It remains a
  // legacy edit until Backend returns the frozen fields, even when the rollout is enabled.
  const legacyMeeting = Boolean(meeting && (!meeting.meetingDeliveryMode || !meeting.videoChannel))
  const showVideoControls = env.videoMeetingEnabled && !legacyMeeting
  const [values, setValues] = useState(() => ({
    title: meeting?.title ?? '', agenda: meeting?.agenda ?? '', startAt: toMeetingInput(meeting?.startAt ?? null), endAt: toMeetingInput(meeting?.endAt ?? null), location: meeting?.location ?? '', onlineUrl: meeting?.onlineUrl ?? '',
    meetingDeliveryMode: meeting?.meetingDeliveryMode ?? 'ONSITE' as MeetingDeliveryMode,
    videoChannel: meeting?.videoChannel ?? 'NONE' as MeetingVideoChannel,
  }))
  const [participants, setParticipants] = useState<number[]>([])
  const [error, setError] = useState('')
  function update(key: keyof typeof values, value: string) { setValues((current) => ({ ...current, [key]: value })); setError(''); onDirty() }
  function updateDeliveryMode(meetingDeliveryMode: MeetingDeliveryMode) {
    setValues((current) => ({ ...current, meetingDeliveryMode, videoChannel: meetingDeliveryMode === 'ONSITE' ? 'NONE' : current.videoChannel === 'NONE' ? 'EXTERNAL_LINK' : current.videoChannel }))
    setError(''); onDirty()
  }
  function updateVideoChannel(videoChannel: MeetingVideoChannel) { setValues((current) => ({ ...current, videoChannel })); setError(''); onDirty() }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (busy || locked) return
    if (!values.title.trim() || values.title.trim().length > 255) { setError('Nhập tiêu đề từ 1 đến 255 ký tự.'); return }
    if (!values.startAt || Number.isNaN(Date.parse(`${values.startAt}+07:00`))) { setError('Chọn thời gian bắt đầu hợp lệ.'); return }
    if (values.endAt && (Number.isNaN(Date.parse(`${values.endAt}+07:00`)) || values.endAt < values.startAt)) { setError('Giờ kết thúc phải bằng hoặc sau giờ bắt đầu.'); return }
    let location = values.location.trim() || null
    let onlineUrl = values.onlineUrl.trim() || null
    if (showVideoControls) {
      const needsLocation = values.meetingDeliveryMode === 'ONSITE' || values.meetingDeliveryMode === 'HYBRID'
      const usesExternalLink = values.videoChannel === 'EXTERNAL_LINK'
      if (needsLocation && !location) { setError('Nhập địa điểm cho hình thức tham gia đã chọn.'); return }
      if (usesExternalLink && !onlineUrl) { setError('Nhập liên kết họp trực tuyến cho kênh đã chọn.'); return }
      // The selected delivery fields are the contract. Hidden legacy values must not leak into
      // an in-app room or an onsite schedule, and no room/token is created during scheduling.
      if (!needsLocation) location = null
      if (!usesExternalLink) onlineUrl = null
    }
    if (onlineUrl && !safeMeetingUrl(onlineUrl)) { setError('Liên kết họp phải là địa chỉ http:// hoặc https:// hợp lệ, không chứa tài khoản hoặc mật khẩu.'); return }
    const delivery = showVideoControls ? { meetingDeliveryMode: values.meetingDeliveryMode, videoChannel: values.videoChannel } : {}
    await onSave({ title: values.title.trim(), agenda: values.agenda.trim() || null, startAt: toMeetingUtc(values.startAt), endAt: values.endAt ? toMeetingUtc(values.endAt) : null,
      location, onlineUrl, participantUserIds: participants.filter((id) => id !== currentUserId), ...delivery })
  }
  return <form className="mtg-form" onSubmit={(event) => void save(event)}><fieldset disabled={busy || locked}>
    <label>Tiêu đề cuộc họp<input required maxLength={255} value={values.title} onChange={(event) => update('title', event.target.value)} placeholder="Ví dụ: Rà soát tiến độ và kế hoạch tuần" /></label>
    <div className="mtg-field-grid"><label>Bắt đầu (giờ Việt Nam)<input type="datetime-local" required value={values.startAt} onChange={(event) => update('startAt', event.target.value)} /></label><label>Kết thúc (không bắt buộc)<input type="datetime-local" min={values.startAt || undefined} value={values.endAt} onChange={(event) => update('endAt', event.target.value)} /></label></div>
    {showVideoControls ? <>
      <fieldset className="mtg-choice-group"><legend>Hình thức tham gia</legend><div className="mtg-choice-list">
        {([['ONSITE', 'Tại chỗ'], ['REMOTE', 'Từ xa'], ['HYBRID', 'Kết hợp']] as const).map(([mode, label]) => <label className="mtg-choice" key={mode}><input type="radio" name="meetingDeliveryMode" checked={values.meetingDeliveryMode === mode} onChange={() => updateDeliveryMode(mode)} /><span>{label}</span></label>)}
      </div></fieldset>
      <fieldset className="mtg-choice-group"><legend>Kênh trực tuyến</legend><div className="mtg-choice-list">
        {values.meetingDeliveryMode === 'ONSITE'
          ? <label className="mtg-choice"><input type="radio" name="videoChannel" checked readOnly /><span>Không có kênh trực tuyến</span></label>
          : ([['EXTERNAL_LINK', 'Liên kết ngoài'], ['IN_APP_VIDEO', 'Video trong AI-PMS']] as const).map(([channel, label]) => <label className="mtg-choice" key={channel}><input type="radio" name="videoChannel" checked={values.videoChannel === channel} onChange={() => updateVideoChannel(channel)} /><span>{label}</span></label>)}
      </div>{values.videoChannel === 'IN_APP_VIDEO' && <p className="mtg-help">AI-PMS sẽ cung cấp phòng họp khi Backend Video Meeting đã được triển khai. Chưa có phòng hoặc mã truy cập nào được tạo khi lưu lịch.</p>}</fieldset>
      <div className="mtg-field-grid">
        {(values.meetingDeliveryMode === 'ONSITE' || values.meetingDeliveryMode === 'HYBRID') && <label>Địa điểm<input required value={values.location} onChange={(event) => update('location', event.target.value)} placeholder="Phòng họp hoặc địa điểm gặp mặt" /></label>}
        {values.videoChannel === 'EXTERNAL_LINK' && <label>Liên kết họp trực tuyến<input required type="url" value={values.onlineUrl} onChange={(event) => update('onlineUrl', event.target.value)} placeholder="https://…" /></label>}
      </div>
    </> : <>
      {legacyMeeting && env.videoMeetingEnabled && <p className="mtg-notice">Đây là lịch họp cũ chưa có trường Video Meeting. Bạn vẫn có thể chỉnh sửa địa điểm và liên kết hiện có mà không suy diễn hay thay đổi hình thức tham gia.</p>}
      <div className="mtg-field-grid"><label>Địa điểm<input value={values.location} onChange={(event) => update('location', event.target.value)} placeholder="Phòng họp hoặc địa điểm gặp mặt" /></label><label>Liên kết họp trực tuyến<input type="url" value={values.onlineUrl} onChange={(event) => update('onlineUrl', event.target.value)} placeholder="https://…" /></label></div>
    </>}
    <label>Nội dung dự kiến<textarea rows={5} value={values.agenda} onChange={(event) => update('agenda', event.target.value)} placeholder="Các đầu việc cần trao đổi, quyết định hoặc xin ý kiến…" /></label>
    {!meeting && <fieldset className="mtg-candidate-list"><legend>Mời người tham gia</legend><p className="mtg-help">Người tạo được tự động thêm vào cuộc họp. Bạn có thể mời thêm sau khi lưu lịch.</p>{candidates.map((candidate) => <label className="mtg-checkbox" key={candidate.userId}><input type="checkbox" checked={candidate.userId === currentUserId || participants.includes(candidate.userId)} disabled={candidate.userId === currentUserId} onChange={(event) => { setParticipants(event.target.checked ? [...participants, candidate.userId] : participants.filter((id) => id !== candidate.userId)); onDirty() }} /><span>{candidate.fullName}<small>{candidate.role}{candidate.userId === currentUserId ? ' · Bạn' : ''}</small></span></label>)}</fieldset>}
    {error && <p role="alert" className="mtg-validation">{error}</p>}
    <div className="mtg-form-actions">{onCancel && <button type="button" className="mtg-button mtg-button--secondary" onClick={onCancel}>Đóng chỉnh sửa</button>}<button className="mtg-button" type="submit">{locked ? 'Cần kiểm tra lại trạng thái' : busy ? 'Đang lưu…' : meeting ? 'Lưu lịch họp' : 'Tạo cuộc họp'}</button></div>
  </fieldset></form>
}
