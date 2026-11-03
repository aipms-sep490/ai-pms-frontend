import { useState } from 'react'
import type { AssistantDraft } from '../academic-ai-api'
import { formatMeetingTime } from '../../meetings/meeting-utils'

export function AssistantDraftCard({ draft, onUse }: { draft: AssistantDraft; onUse?: (draft: AssistantDraft) => void }) {
  const [title, setTitle] = useState(draft.title)
  const [description, setDescription] = useState(draft.description)
  return <fieldset className="assistant-draft">
    <legend>Bản nháp {draft.kind === 'TASK' ? 'công việc' : 'lịch họp'}</legend>
    <label>Tiêu đề<input value={title} maxLength={255} onChange={event => setTitle(event.target.value)} /></label>
    <label>Nội dung<textarea value={description} maxLength={4000} rows={4} onChange={event => setDescription(event.target.value)} /></label>
    {draft.kind === 'MEETING' && draft.meeting && <div className="assistant-tool-help">
      {draft.meeting.startAt && <p>Bắt đầu: {formatMeetingTime(draft.meeting.startAt)} (giờ Việt Nam)</p>}
      {draft.meeting.endAt && <p>Kết thúc: {formatMeetingTime(draft.meeting.endAt)}</p>}
      {draft.meeting.meetingDeliveryMode && <p>Hình thức: {({ ONSITE: 'Tại chỗ', REMOTE: 'Từ xa', HYBRID: 'Kết hợp' })[draft.meeting.meetingDeliveryMode]}</p>}
      {draft.meeting.videoChannel === 'IN_APP_VIDEO' && <p>Kênh đề xuất: Video trong AI-PMS (có thể đổi tại biểu mẫu).</p>}
      {draft.meeting.inviteAll && <p>Chọn sẵn tất cả thành viên và giảng viên trong danh sách được phép mời của đồ án.</p>}
    </div>}
    <p>{draft.kind === 'MEETING' ? 'Chưa tạo lịch hoặc gửi lời mời. Thông tin đã xác định sẽ được điền sẵn; kiểm tra và bổ sung mục còn thiếu trước khi lưu.' : 'Chưa tạo dữ liệu. Bạn sẽ chọn mốc, người tham gia và thời gian tại biểu mẫu trước khi lưu.'}</p>
    {onUse && <button type="button" disabled={!title.trim()} onClick={() => onUse({ ...draft, title: title.trim(), description })}>Dùng bản nháp · mở biểu mẫu</button>}
    {!onUse && <p>Mở trợ lý từ trang đồ án của sinh viên hoặc GVHD để chuyển bản nháp sang biểu mẫu.</p>}
  </fieldset>
}
