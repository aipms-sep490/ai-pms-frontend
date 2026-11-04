import { useState } from 'react'
import type { AssistantDraft } from '../academic-ai-api'
import { formatMeetingTime } from '../../meetings/meeting-utils'

export function AssistantDraftCard({ draft, onUse }: { draft: AssistantDraft; onUse?: (draft: AssistantDraft) => void }) {
  const [title, setTitle] = useState(draft.title)
  const [description, setDescription] = useState(draft.description)
  if (draft.kind === 'WORK_PLAN') return <section className="assistant-draft" aria-label="Kế hoạch công việc đề xuất">
    <h3>Kế hoạch công việc đề xuất</h3><p>Kiểm tra và lưu từng công việc tại biểu mẫu. Chưa có công việc nào được tạo.</p>
    {draft.tasks?.filter(task => task.kind === 'TASK').slice(0, 8).map((task, index) => <AssistantDraftCard key={index} draft={task} onUse={onUse} />)}
    {!draft.tasks?.length && <p>Chưa có đầu việc cụ thể để điền vào biểu mẫu. Hãy yêu cầu AI tách kế hoạch thành các công việc.</p>}
  </section>
  const labels = { TASK: 'công việc', MEETING: 'lịch họp', WEEKLY_REPORT: 'báo cáo tuần', MEETING_MINUTES: 'biên bản họp' }
  return <fieldset className="assistant-draft">
    <legend>Bản nháp {labels[draft.kind]}</legend>
    <label>Tiêu đề<input value={title} maxLength={255} onChange={event => setTitle(event.target.value)} /></label>
    <label>Nội dung<textarea value={description} maxLength={4000} rows={4} onChange={event => setDescription(event.target.value)} /></label>
    {draft.kind === 'TASK' && draft.task && <div className="assistant-tool-help">
      {draft.task.dueAt && <p>Hạn: {formatMeetingTime(draft.task.dueAt)} (giờ Việt Nam)</p>}
      {draft.task.milestoneTitle && <p>Mốc: {draft.task.milestoneTitle}</p>}
      {!!draft.task.assigneeNames?.length && <p>Phụ trách: {draft.task.assigneeNames.join(', ')}</p>}
      {draft.task.primaryMajorName && <p>Ngành: {draft.task.primaryMajorName}</p>}
    </div>}
    {draft.kind === 'WEEKLY_REPORT' && draft.report && <div className="assistant-tool-help">{Object.entries({ completedWork: 'Đã hoàn thành', inProgressWork: 'Đang thực hiện', blockers: 'Vướng mắc', risks: 'Rủi ro', nextActions: 'Bước tiếp theo', plannedWork: 'Kế hoạch' }).map(([key, label]) => draft.report?.[key as keyof typeof draft.report] ? <p key={key}><strong>{label}:</strong> {draft.report[key as keyof typeof draft.report]}</p> : null)}</div>}
    {draft.kind === 'MEETING' && draft.meeting && <div className="assistant-tool-help">
      {draft.meeting.startAt && <p>Bắt đầu: {formatMeetingTime(draft.meeting.startAt)} (giờ Việt Nam)</p>}
      {draft.meeting.endAt && <p>Kết thúc: {formatMeetingTime(draft.meeting.endAt)}</p>}
      {draft.meeting.meetingDeliveryMode && <p>Hình thức: {({ ONSITE: 'Tại chỗ', REMOTE: 'Từ xa', HYBRID: 'Kết hợp' })[draft.meeting.meetingDeliveryMode]}</p>}
      {draft.meeting.videoChannel === 'IN_APP_VIDEO' && <p>Kênh đề xuất: Video trong AI-PMS (có thể đổi tại biểu mẫu).</p>}
      {draft.meeting.inviteAll && <p>Chọn sẵn tất cả thành viên và giảng viên trong danh sách được phép mời của đồ án.</p>}
    </div>}
    <p>Chưa lưu hoặc gửi dữ liệu. Thông tin đã xác định sẽ được điền sẵn; kiểm tra và bổ sung mục còn thiếu trước khi lưu.</p>
    {onUse && <button type="button" disabled={!title.trim()} onClick={() => onUse({ ...draft, title: title.trim(), description })}>Dùng bản nháp · mở biểu mẫu</button>}
    {!onUse && <p>Mở trợ lý từ trang đồ án của sinh viên hoặc GVHD để chuyển bản nháp sang biểu mẫu.</p>}
  </fieldset>
}
