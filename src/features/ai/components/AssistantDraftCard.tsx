import { useState } from 'react'
import type { AssistantDraft } from '../academic-ai-api'

export function AssistantDraftCard({ draft, onUse }: { draft: AssistantDraft; onUse?: (draft: AssistantDraft) => void }) {
  const [title, setTitle] = useState(draft.title)
  const [description, setDescription] = useState(draft.description)
  return <fieldset className="assistant-draft">
    <legend>Bản nháp {draft.kind === 'TASK' ? 'công việc' : 'lịch họp'}</legend>
    <label>Tiêu đề<input value={title} maxLength={255} onChange={event => setTitle(event.target.value)} /></label>
    <label>Nội dung<textarea value={description} maxLength={4000} rows={4} onChange={event => setDescription(event.target.value)} /></label>
    <p>Chưa tạo dữ liệu. Bạn sẽ chọn mốc, người tham gia và thời gian tại biểu mẫu trước khi lưu.</p>
    {onUse && <button type="button" disabled={!title.trim()} onClick={() => onUse({ ...draft, title: title.trim(), description })}>Dùng bản nháp · mở biểu mẫu</button>}
    {!onUse && <p>Mở trợ lý từ trang đồ án của sinh viên hoặc GVHD để chuyển bản nháp sang biểu mẫu.</p>}
  </fieldset>
}
