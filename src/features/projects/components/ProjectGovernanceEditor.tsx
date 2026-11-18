import { useEffect, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import * as api from '../api/project-governance-api'

type Props = {
  projectId: number
  cycles: api.ReportingCycle[]
  actions: api.ProjectActionItem[]
  sources: Array<{ value: string; title: string }>
  busy: boolean
  run: (operation: () => Promise<unknown>, success: string) => Promise<void>
  selectedCycleId?: number | null
  onCycleSelected?: (cycleId: number | null) => void
}
const local = (value: string | null) => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''
export function ProjectGovernanceEditor({ projectId, cycles, actions, sources, busy, run, selectedCycleId, onCycleSelected }: Props) {
  const [cycle, setCycle] = useState<api.ReportingCycle | null>(null), [action, setAction] = useState<api.ProjectActionItem | null>(null)

  useEffect(() => {
    if (selectedCycleId != null) {
      const existing = cycles.find(c => c.id === selectedCycleId)
      if (existing) {
        setCycle(existing)
      } else {
        void api.getReportingCycle(projectId, selectedCycleId).then(setCycle).catch(() => {})
      }
    }
  }, [selectedCycleId, cycles, projectId])

  const selectCycle = (c: api.ReportingCycle | null) => {
    setCycle(c)
    onCycleSelected?.(c?.id ?? null)
  }

  return <div className="space-y-5"><section className="workspace-surface p-5 sm:p-6 space-y-4"><h2 className="font-semibold">Lịch nộp báo cáo</h2><div className="flex flex-wrap gap-2">{cycles.map(item => <Button key={item.id} variant="secondary" disabled={busy} onClick={() => void run(async () => selectCycle(await api.getReportingCycle(projectId, item.id)), 'Đã tải lịch để chỉnh sửa.')}>Sửa lịch #{item.id}</Button>)}</div><form id="governance-cycle-form" key={cycle?.id ?? 'new-cycle'} className="api-form grid gap-3 sm:grid-cols-2" onSubmit={event => {
    event.preventDefault(); const f = new FormData(event.currentTarget)
    const startStr = String(f.get('start')), endStr = String(f.get('end')), deadlineStr = String(f.get('deadline'))
    const body = {
      periodStart: new Date(startStr).toISOString(),
      periodEnd: new Date(endStr).toISOString(),
      deadline: new Date(deadlineStr).toISOString(),
      latePolicy: String(f.get('late')) as 'BLOCK' | 'FLAG',
      reportType: String(f.get('type')) as 'WEEKLY' | 'MONTHLY',
    }
    const endInput = event.currentTarget.querySelector<HTMLInputElement>('[name=end]')
    const deadlineInput = event.currentTarget.querySelector<HTMLInputElement>('[name=deadline]')
    endInput?.setCustomValidity('')
    deadlineInput?.setCustomValidity('')

    if (body.periodStart >= body.periodEnd) {
      endInput?.setCustomValidity('Ngày kết thúc phải sau ngày bắt đầu.')
      event.currentTarget.reportValidity()
      return
    }
    if (body.deadline < body.periodEnd) {
      deadlineInput?.setCustomValidity('Hạn nộp phải bằng hoặc sau ngày kết thúc kỳ báo cáo.')
      event.currentTarget.reportValidity()
      return
    }

    void run(async () => {
      if (cycle) {
        await api.updateReportingCycle(projectId, cycle.id, {
          periodStart: body.periodStart,
          periodEnd: body.periodEnd,
          deadline: body.deadline,
          latePolicy: body.latePolicy,
          reportType: body.reportType,
          concurrencyToken: cycle.concurrencyToken,
        })
      } else {
        await api.createReportingCycle(projectId, body)
      }
      selectCycle(null)
    }, 'Đã lưu lịch nộp báo cáo.')
  }}><label>Loại báo cáo<select name="type" defaultValue={cycle?.reportType ?? 'WEEKLY'}><option value="WEEKLY">Hàng tuần</option><option value="MONTHLY">Hàng tháng</option></select></label><label>Khi quá hạn<select name="late" defaultValue={cycle?.latePolicy ?? 'FLAG'}><option value="FLAG">Cho nộp và đánh dấu trễ</option><option value="BLOCK">Không cho nộp</option></select></label><label>Từ ngày<input name="start" type="datetime-local" required defaultValue={local(cycle?.periodStart ?? null)} onChange={e => e.target.setCustomValidity('')} /></label><label>Đến ngày<input name="end" type="datetime-local" required defaultValue={local(cycle?.periodEnd ?? null)} onChange={e => e.target.setCustomValidity('')} /></label><label>Hạn nộp<input name="deadline" type="datetime-local" required defaultValue={local(cycle?.deadline ?? null)} onChange={e => e.target.setCustomValidity('')} /></label><div className="flex flex-wrap items-end gap-2"><Button disabled={busy} type="submit">{cycle ? 'Lưu thay đổi' : 'Tạo lịch nộp'}</Button>{cycle && <Button variant="secondary" onClick={() => selectCycle(null)}>Hủy chỉnh sửa</Button>}</div></form></section>
  <section className="workspace-surface p-5 sm:p-6 space-y-4"><h2 className="font-semibold">Việc cần làm sau trao đổi</h2><div className="flex flex-wrap gap-2">{actions.map(item => <Button key={item.id} variant="secondary" disabled={busy} onClick={() => void run(async () => setAction(await api.getProjectActionItem(projectId, item.id)), 'Đã tải công việc để chỉnh sửa.')}>Sửa: {item.title}</Button>)}</div><form key={action?.id ?? 'new-action'} className="api-form grid gap-3 sm:grid-cols-2" onSubmit={event => {
    event.preventDefault(); const f = new FormData(event.currentTarget); const title = String(f.get('title')).trim(), description = String(f.get('description')).trim() || null, due = String(f.get('due')), dueAt = due ? new Date(due).toISOString() : null
    if (!title) return
    void run(async () => { if (action) await api.updateProjectActionItem(projectId, action.id, { title, description, dueAt, ownerId: action.ownerId, taskId: action.taskId, milestoneId: action.milestoneId, concurrencyToken: action.concurrencyToken }); else { const [sourceType, id] = String(f.get('source')).split(':'); await api.createProjectActionItem(projectId, { title, description, dueAt, sourceType: sourceType as 'MEETING' | 'PROGRESS_REPORT', ...(sourceType === 'MEETING' ? { meetingId: Number(id) } : { progressReportId: Number(id) }) }) } setAction(null) }, 'Đã lưu công việc.')
  }}>{!action && <label>Nguồn trao đổi<select name="source" required><option value="">Chọn cuộc họp hoặc báo cáo</option>{sources.map(item => <option key={item.value} value={item.value}>{item.title}</option>)}</select></label>}<label>Công việc<input name="title" required maxLength={300} defaultValue={action?.title ?? ''} /></label><label>Mô tả<textarea name="description" defaultValue={action?.description ?? ''} /></label><label>Hạn hoàn thành<input name="due" type="datetime-local" defaultValue={local(action?.dueAt ?? null)} /></label><div className="flex flex-wrap items-end gap-2"><Button type="submit" disabled={busy || (!action && !sources.length)}>{action ? 'Lưu thay đổi' : 'Thêm công việc'}</Button>{action && <Button variant="secondary" onClick={() => setAction(null)}>Hủy chỉnh sửa</Button>}</div></form><ul className="divide-y divide-hairline">{actions.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><strong className="text-sm">{item.title}</strong><label className="text-sm">Trạng thái<select aria-label={`Trạng thái ${item.title}`} value={item.status} disabled={busy} onChange={event => { const status = event.target.value; void run(async () => { const fresh = await api.getProjectActionItem(projectId, item.id); await api.updateProjectActionItemStatus(projectId, item.id, status, fresh.concurrencyToken) }, 'Đã cập nhật trạng thái.') }}><option value="TODO">Chưa bắt đầu</option><option value="IN_PROGRESS">Đang thực hiện</option><option value="BLOCKED">Đang vướng mắc</option><option value="DONE">Hoàn thành</option><option value="CANCELLED">Đã hủy</option></select></label></li>)}</ul></section></div>
}
