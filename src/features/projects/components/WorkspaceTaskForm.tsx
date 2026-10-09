import { useRef, useState, type FormEvent } from 'react'
import { services } from '../../../services/service-gateway'
import { HttpError } from '../../../services/http/http-client'
import type { TeamMemberDto, MilestoneDto, ProjectDto } from '../../../types/backend'
import { useProjectDisciplineScope } from '../hooks/useProjectDisciplineScope'
import '../pages/collaboration-workspace.css'
import './workspace-task-form.css'

export function WorkspaceTaskForm({ project, milestones, members, onCancel, onCreated }: {
  project: ProjectDto; milestones: Pick<MilestoneDto, 'id' | 'title'>[]; members: TeamMemberDto[]; onCancel: () => void; onCreated: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)
  const scope = useProjectDisciplineScope(project)
  const [primary, setPrimary] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current || !scope.ready) return
    const data = new FormData(event.currentTarget)
    const title = String(data.get('title') ?? '').trim()
    const milestoneId = Number(data.get('milestoneId'))
    const dueAt = String(data.get('dueAt') ?? '')
    if (!title || !milestones.some(item => item.id === milestoneId)) {
      setError('Nhập tên công việc và chọn mốc đồ án.'); return
    }
    const primaryId = Number(primary)
    const supporting = data.getAll('supportingMajor').map(Number).filter(id => id !== primaryId)
    if ((scope.interdisciplinary && !scope.majors.some(item => item.majorId === primaryId))
      || (primary && !scope.majors.some(item => item.majorId === primaryId))
      || supporting.some(id => !scope.majors.some(item => item.majorId === id))) {
      setError('Chọn ngành chính và ngành hỗ trợ trong phạm vi đồ án.'); return
    }
    pending.current = true; setBusy(true); setError('')
    try {
      await services.task.createTask({
        milestoneId, title, description: String(data.get('description') ?? '').trim() || null,
        priority: String(data.get('priority') ?? 'MEDIUM'),
        dueAt: dueAt ? new Date(`${dueAt}+07:00`).toISOString() : null,
        assigneeUserIds: data.getAll('assignee').map(Number),
        disciplines: [...(primary ? [{ majorId: primaryId, role: 'PRIMARY' as const }] : []), ...supporting.map(majorId => ({ majorId, role: 'SUPPORTING' as const }))],
      })
      onCreated()
    } catch (reason) {
      setError(reason instanceof HttpError && reason.status === 403 ? 'Bạn chưa có quyền tạo công việc cho nhóm.'
        : reason instanceof HttpError && reason.status === 409 ? 'Thông tin đồ án đã thay đổi. Cập nhật trang rồi thử lại.'
        : 'Chưa tạo được công việc. Kiểm tra thông tin rồi thử lại.')
    } finally { pending.current = false; setBusy(false) }
  }
  return <section className="cw-panel cw-create" aria-labelledby="create-task-heading">
    <div className="cw-section-heading"><div><p className="cw-eyebrow">Phân công trong nhóm</p><h2 id="create-task-heading">Tạo công việc</h2></div>
      <button className="cw-icon-button" type="button" onClick={onCancel} disabled={busy} aria-label="Đóng biểu mẫu tạo công việc"><span className="material-symbols-outlined" aria-hidden="true">close</span></button>
    </div>
    <form onSubmit={event => void submit(event)}>
      {scope.loading && <p role="status">Đang tải phạm vi ngành…</p>}
      {scope.error && <p role="alert" className="cw-form-error">{scope.error} <button type="button" className="cw-button" onClick={scope.retry}>Tải lại phạm vi ngành</button></p>}
      <fieldset disabled={busy || !scope.ready} className="cw-form-fields">
        <label className="cw-full-width">Tên công việc<input autoFocus name="title" required maxLength={255} placeholder="Ví dụ: Hoàn thiện màn hình đăng nhập" /></label>
        <label>Mốc đồ án<select name="milestoneId" required defaultValue=""><option value="" disabled>Chọn mốc</option>{milestones.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <label><span>Hạn hoàn thành <span className="cw-optional">(không bắt buộc)</span></span><input name="dueAt" type="datetime-local" /><span className="cw-field-hint">Giờ Việt Nam (UTC+7)</span></label>
        <label>Mức ưu tiên<select name="priority" defaultValue="MEDIUM"><option value="LOW">Thấp</option><option value="MEDIUM">Bình thường</option><option value="HIGH">Cao</option><option value="CRITICAL">Khẩn cấp</option></select></label>
        {scope.ready && <>
          <label>Ngành chính<select name="primaryMajor" value={primary} required={scope.interdisciplinary} onChange={event => setPrimary(event.target.value)}><option value="">{scope.interdisciplinary ? 'Chọn ngành chính' : 'Chưa phân loại'}</option>{scope.majors.map(item => <option key={item.majorId} value={item.majorId}>{item.majorName}</option>)}</select></label>
          <fieldset className="cw-full-width cw-assignees"><legend>Ngành hỗ trợ</legend><p className="cw-field-hint">Công việc liên ngành cần đúng một ngành chính. Chỉ chọn ngành thuộc phạm vi đồ án.</p><div>{scope.majors.filter(item => String(item.majorId) !== primary).map(item => <label key={item.majorId}><input type="checkbox" name="supportingMajor" value={item.majorId} />{item.majorName}</label>)}</div></fieldset>
        </>}
        <label className="cw-full-width"><span>Mô tả <span className="cw-optional">(không bắt buộc)</span></span><textarea name="description" rows={2} maxLength={10000} placeholder="Kết quả cần đạt và thông tin để bắt đầu công việc" /></label>
        <fieldset className="cw-full-width cw-assignees"><legend>Người phụ trách</legend><p className="cw-field-hint">Có thể chọn nhiều người hoặc phân công sau.</p>
          <div>{members.map(member => <label key={member.userId}><input type="checkbox" name="assignee" value={member.userId} />{member.fullName}</label>)}</div>
        </fieldset>
      </fieldset>
      {error && <p className="cw-form-error" role="alert">{error}</p>}
      <div className="cw-form-actions"><button type="button" className="cw-button" onClick={onCancel} disabled={busy}>Hủy</button><button type="submit" className="cw-button cw-button-primary" disabled={busy || !scope.ready}>{busy ? 'Đang tạo…' : 'Tạo công việc'}</button></div>
    </form>
  </section>
}
