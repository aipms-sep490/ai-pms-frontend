import { useState, type FormEvent } from 'react'
import { services } from '../../../services/service-gateway'
import { HttpError } from '../../../services/http/http-client'
import type { TeamMemberDto, MilestoneDto } from '../../../types/backend'

export function WorkspaceTaskForm({ milestones, members, onCancel, onCreated }: {
  milestones: Pick<MilestoneDto, 'id' | 'title'>[]; members: TeamMemberDto[]; onCancel: () => void; onCreated: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const data = new FormData(event.currentTarget)
    const title = String(data.get('title') ?? '').trim()
    const milestoneId = Number(data.get('milestoneId'))
    const dueAt = String(data.get('dueAt') ?? '')
    if (!title || !milestones.some(item => item.id === milestoneId)) {
      setError('Nhập tên công việc và chọn mốc đồ án.'); return
    }
    setBusy(true); setError('')
    try {
      await services.task.createTask({
        milestoneId, title, description: String(data.get('description') ?? '').trim() || null,
        priority: String(data.get('priority') ?? 'MEDIUM'),
        dueAt: dueAt ? new Date(`${dueAt}+07:00`).toISOString() : null,
        assigneeUserIds: data.getAll('assignee').map(Number),
      })
      onCreated()
    } catch (reason) {
      setError(reason instanceof HttpError && reason.status === 403 ? 'Bạn chưa có quyền tạo công việc cho nhóm.'
        : reason instanceof HttpError && reason.status === 409 ? 'Thông tin đồ án đã thay đổi. Cập nhật trang rồi thử lại.'
        : 'Chưa tạo được công việc. Kiểm tra thông tin rồi thử lại.')
    } finally { setBusy(false) }
  }
  return <section className="cw-panel cw-create" aria-labelledby="create-task-heading">
    <div className="cw-section-heading"><div><p className="cw-eyebrow">Phân công trong nhóm</p><h2 id="create-task-heading">Tạo công việc</h2></div>
      <button className="cw-icon-button" type="button" onClick={onCancel} disabled={busy} aria-label="Đóng biểu mẫu tạo công việc"><span className="material-symbols-outlined" aria-hidden="true">close</span></button>
    </div>
    <form onSubmit={event => void submit(event)}>
      <fieldset disabled={busy} className="cw-form-fields">
        <label className="cw-full-width">Tên công việc<input autoFocus name="title" required maxLength={255} placeholder="Ví dụ: Hoàn thiện màn hình đăng nhập" /></label>
        <label>Mốc đồ án<select name="milestoneId" required defaultValue=""><option value="" disabled>Chọn mốc</option>{milestones.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <label><span>Hạn hoàn thành <span className="cw-optional">(không bắt buộc)</span></span><input name="dueAt" type="datetime-local" /><span className="cw-field-hint">Giờ Việt Nam (UTC+7)</span></label>
        <label>Mức ưu tiên<select name="priority" defaultValue="MEDIUM"><option value="LOW">Thấp</option><option value="MEDIUM">Bình thường</option><option value="HIGH">Cao</option><option value="CRITICAL">Khẩn cấp</option></select></label>
        <label className="cw-full-width"><span>Mô tả <span className="cw-optional">(không bắt buộc)</span></span><textarea name="description" rows={2} maxLength={10000} placeholder="Kết quả cần đạt và thông tin để bắt đầu công việc" /></label>
        <fieldset className="cw-full-width cw-assignees"><legend>Người phụ trách</legend><p className="cw-field-hint">Có thể chọn nhiều người hoặc phân công sau.</p>
          <div>{members.map(member => <label key={member.userId}><input type="checkbox" name="assignee" value={member.userId} />{member.fullName}</label>)}</div>
        </fieldset>
      </fieldset>
      {error && <p className="cw-form-error" role="alert">{error}</p>}
      <div className="cw-form-actions"><button type="button" className="cw-button" onClick={onCancel} disabled={busy}>Hủy</button><button type="submit" className="cw-button cw-button-primary" disabled={busy}>{busy ? 'Đang tạo…' : 'Tạo công việc'}</button></div>
    </form>
  </section>
}
