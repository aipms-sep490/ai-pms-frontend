import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useExecutionAccess } from '../../execution/context/ExecutionAccessContext'
import { ExecutionPage, ExConfirm, ExIcon, ExProgress, ExState } from '../../execution/execution-ui'
import { executionError, milestoneLabels } from '../../execution/execution-utils'
import { useExecutionMutation } from '../../execution/useExecutionMutation'
import { services } from '../../../services/service-gateway'
import type { MilestoneDto, MilestoneProgressDto } from '../../../types/backend'
import { dateLabel } from '../../projects/utils/collaboration-workspace'
import { useMilestoneExecutionCapabilities } from '../../execution/hooks/useMilestoneExecutionCapabilities'
import { canUseProjectExecutionAction, canUseTaskExecutionAction } from '../../execution/execution-authority'
import { Pagination, StatTileRow, StatusBadge, useClientPagination } from '../../../components/ui'
import type { BadgeTone } from '../../../components/ui/status-badge-tone'

function milestoneTone(status: string): BadgeTone {
  switch (status.toUpperCase()) {
    case 'COMPLETED': return 'success'
    case 'IN_PROGRESS': return 'info'
    case 'CANCELLED': return 'danger'
    default: return 'neutral'
  }
}

export function MilestoneDetailPage() {
  const { milestoneId } = useParams()
  const navigate = useNavigate()
  const access = useExecutionAccess()
  const { project, routeBase } = access
  const canCreate = canUseProjectExecutionAction(access, 'create_milestone')
  const canReorder = canUseProjectExecutionAction(access, 'reorder_milestones')
  const [milestones, setMilestones] = useState<MilestoneDto[]>([])
  const [progress, setProgress] = useState<MilestoneProgressDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [progressError, setProgressError] = useState('')
  const [progressLoading, setProgressLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [order, setOrder] = useState<MilestoneDto[] | null>(null)
  const milestoneCapabilities = useMilestoneExecutionCapabilities(Number(milestoneId), revision)
  const reload = () => setRevision(value => value + 1)
  const mutation = useExecutionMutation({ onForbidden: reload })
  const clearMutation = mutation.clear
  useEffect(() => { setCreating(false); setEditing(false); setDeleting(false); setOrder(null); clearMutation() }, [milestoneId, project.id, clearMutation])
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setProgressError(''); setProgressLoading(true); setProgress([])
    services.milestone.getProjectMilestones(project.id, controller.signal).then(items => {
      if (!controller.signal.aborted) setMilestones([...items].sort((a,b) => a.sortOrder - b.sortOrder || a.id - b.id))
    }).catch(reason => { if (!controller.signal.aborted) setError(executionError(reason, 'tải mốc đồ án')) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    services.milestone.getProjectMilestoneProgress(project.id, controller.signal).then(items => { if (!controller.signal.aborted) setProgress(items) })
      .catch(reason => { if (!controller.signal.aborted) { setProgress([]); setProgressError(executionError(reason, 'tải tiến độ mốc')) } })
      .finally(() => { if (!controller.signal.aborted) setProgressLoading(false) })
    return () => controller.abort()
  }, [project.id, revision])
  const selected = milestoneId ? milestones.find(item => item.id === Number(milestoneId)) : null
  const stats = progress.find(item => item.milestoneId === selected?.id)
  const actionCapability = (code: string) => milestoneCapabilities.get(code)
  const canUpdate = Boolean(selected) && canUseTaskExecutionAction(access, 'update_task', actionCapability('update_milestone'))
  const canDelete = Boolean(selected) && canUseTaskExecutionAction(access, 'delete_task', actionCapability('delete_milestone'))
  const save = (payload: import('../../../services/api/milestones.api').UpdateMilestonePayload) => selected
    ? mutation.run(() => services.milestone.updateMilestone(selected.id, { ...payload, concurrencyToken: selected.concurrencyToken }), () => { setEditing(false); reload() }) : Promise.resolve(false)
  function move(index: number, direction: number) {
    if (!order || index + direction < 0 || index + direction >= order.length) return
    const next = [...order]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; setOrder(next)
  }
  const title = selected?.title ?? 'Mốc đồ án'
  const milestonesPagination = useClientPagination(milestones, 8)
  const completedCount = milestones.filter(item => item.status === 'COMPLETED').length
  const inProgressCount = milestones.filter(item => item.status === 'IN_PROGRESS').length
  const nowTimestamp = Date.now()
  const overdueCount = milestones.filter(item => {
    if (!item.dueDate || ['COMPLETED', 'CANCELLED'].includes(item.status)) return false
    const ts = Date.parse(item.dueDate)
    return !Number.isNaN(ts) && ts < nowTimestamp
  }).length

  return <ExecutionPage title={title} eyebrow={project.code} backTo={milestoneId ? `${routeBase}/milestones` : undefined}
    description={milestoneId ? 'Theo dõi thời gian, tiến độ và công việc thuộc mốc này.' : 'Chia đồ án thành các mốc rõ ràng để cả nhóm cùng theo dõi.'}
    action={<><button className="ex-button" onClick={reload} disabled={loading || mutation.busy}><ExIcon name="refresh" />Cập nhật</button>{canCreate && !milestoneId && <button className="ex-button ex-button-primary" disabled={creating || mutation.busy} onClick={() => setCreating(true)}><ExIcon name="add" />Tạo mốc</button>}{canUpdate && selected && <button className="ex-button" disabled={mutation.busy} onClick={() => { mutation.clear(); setEditing(true) }}><ExIcon name="edit" />Chỉnh sửa</button>}</>}>
    {!milestoneId && (
      <div className="mb-5">
        <StatTileRow
          tiles={[
            { icon: 'flag', label: 'Tổng số mốc', value: loading ? null : milestones.length, caption: 'Kế hoạch thực hiện của đồ án', hero: true },
            { icon: 'pending_actions', label: 'Đang thực hiện', value: loading ? null : inProgressCount, caption: 'Mốc đang mở triển khai', tone: 'info' },
            { icon: 'task_alt', label: 'Hoàn tất', value: loading ? null : completedCount, caption: 'Mốc đã hoàn thành mục tiêu', tone: 'success' },
            { icon: 'schedule', label: 'Quá hạn', value: loading ? null : overdueCount, caption: 'Mốc chưa xong đã quá ngày hạn', tone: overdueCount > 0 ? 'danger' : 'neutral' },
          ]}
        />
      </div>
    )}
    {mutation.error && <p className="ex-notice ex-notice-error" role="alert">{mutation.error}</p>}{mutation.notice && <p className="ex-notice" role="status">{mutation.notice}</p>}
    {progressError && <ExState message={progressError} retry={reload} />}
    {loading ? <section className="ex-panel"><ExState loading /></section> : error ? <ExState message={error} retry={reload} /> : milestoneId ? selected ? (
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <div className="xl:col-span-8 space-y-5 min-w-0">
          {editing && <MilestoneForm key={`${selected.id}:${selected.updatedAt}`} milestone={selected} busy={mutation.busy} onCancel={() => setEditing(false)} onSubmit={payload => save({ ...payload, sortOrder: selected.sortOrder })} />}
          <section className="ex-panel !mb-0">
            <div className="ex-panel-heading bg-canvas/70 border-b border-hairline px-5 py-3.5">
              <h2>Thông tin mốc</h2>
              <StatusBadge status={selected.status} tone={milestoneTone(selected.status)} label={milestoneLabels[selected.status] ?? 'Chưa xác định'} />
            </div>
            <div className="ex-padding ex-stack">
              <p className="ex-prose">{selected.description?.trim() || 'Chưa có mô tả cho mốc này.'}</p>
              <dl className="ex-facts">
                <div><dt>Bắt đầu dự kiến</dt><dd>{dateLabel(selected.startDate)}</dd></div>
                <div><dt>Hạn hoàn thành</dt><dd>{dateLabel(selected.dueDate)}</dd></div>
                <div><dt>Tiến độ công việc</dt><dd>{stats ? <><span>{stats.doneTasks}/{stats.totalTasks} việc hoàn thành · {Math.round(stats.progressPercentage)}%</span><div className="mt-3"><ExProgress value={stats.progressPercentage} label={`Tiến độ mốc ${selected.title}`} /></div></> : progressLoading ? 'Đang tải tiến độ…' : 'Chưa có số liệu tiến độ'}</dd></div>
              </dl>
              <div className="ex-actions">
                <Link className="ex-button ex-button-primary" to={`${routeBase}/tasks?milestone=${selected.id}`}><ExIcon name="checklist" />Xem công việc của mốc</Link>
                <Link className="ex-button" to={`${routeBase}/gantt`}>Xem lịch thực hiện</Link>
              </div>
            </div>
          </section>
          {canDelete && stats?.totalTasks === 0 && (
            <div className="rounded-xl border border-hairline bg-card p-4">
              <button className="ex-text-button ex-danger-text" onClick={() => setDeleting(true)}>Xóa mốc</button>
              {deleting && <ExConfirm title="Xóa mốc đồ án này?" description="Mốc chưa có công việc sẽ được xóa khỏi kế hoạch. Bạn cần tạo lại nếu muốn sử dụng sau này." busy={mutation.busy} onCancel={() => setDeleting(false)} onConfirm={() => void mutation.run(() => services.milestone.deleteMilestone(selected.id, selected.concurrencyToken), () => { navigate(`${routeBase}/milestones`, { replace: true }); reload() }, 'Đã xóa mốc đồ án.')} />}
            </div>
          )}
          {canUpdate && stats && stats.totalTasks > 0 && <p className="ex-muted">Mốc đã có công việc. Nếu dừng thực hiện, bạn có thể chọn trạng thái Đã hủy trong phần chỉnh sửa.</p>}
        </div>
        <aside className="xl:col-span-4 xl:sticky xl:top-20 space-y-5 min-w-0">
          <section className="ex-panel !mb-0" aria-label="Danh sách mốc trong đồ án">
            <div className="ex-panel-heading bg-canvas/70 border-b border-hairline px-5 py-3.5">
              <div className="flex items-center gap-2">
                <h2>Tất cả mốc đồ án</h2>
                <span className="rounded-full border border-hairline bg-card px-2 py-0.5 text-xs font-semibold text-ink-soft tabular-nums">{milestones.length}</span>
              </div>
            </div>
            <ol className="divide-y divide-hairline">
              {milestonesPagination.paginatedItems.map((item, idx) => {
                const number = (milestonesPagination.page - 1) * milestonesPagination.pageSize + idx + 1
                const active = item.id === selected.id
                return (
                  <li key={item.id}>
                    <Link
                      to={`${routeBase}/milestones/${item.id}`}
                      className={`flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors ${active ? 'bg-primary-subtle/50 font-semibold text-primary border-l-2 border-l-primary' : 'text-ink hover:bg-canvas/70'}`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span className="ex-milestone-number">{String(number).padStart(2, '0')}</span>
                        <span className="truncate">{item.title}</span>
                      </span>
                      <StatusBadge status={item.status} tone={milestoneTone(item.status)} label={milestoneLabels[item.status] ?? 'Chưa xác định'} />
                    </Link>
                  </li>
                )
              })}
            </ol>
            {milestonesPagination.showPagination && (
              <div className="border-t border-hairline px-4 py-3">
                <Pagination
                  page={milestonesPagination.page}
                  pages={milestonesPagination.totalPages}
                  total={milestonesPagination.total}
                  pageSize={milestonesPagination.pageSize}
                  onPage={milestonesPagination.setPage}
                />
              </div>
            )}
          </section>
        </aside>
      </div>
    ) : <section className="ex-panel"><ExState title="Không tìm thấy mốc đồ án" message="Mốc có thể đã được xóa hoặc đường dẫn không còn phù hợp." action={<Link className="ex-button" to={`${routeBase}/milestones`}>Về danh sách mốc</Link>} /></section>
      : (
        <div className={creating ? 'grid grid-cols-1 xl:grid-cols-12 gap-5 items-start' : ''}>
          <section className={`ex-panel !mb-0 ${creating ? 'xl:col-span-7 min-w-0' : ''}`} aria-label="Kế hoạch các mốc">
            <div className="ex-panel-heading bg-canvas/70 border-b border-hairline px-5 py-3.5">
              <div>
                <h2>{milestones.length} mốc đồ án</h2>
                <p>{completedCount} mốc hoàn thành</p>
              </div>
              {canReorder && milestones.length > 1 && !order && <button className="ex-text-button" onClick={() => { setOrder([...milestones]); mutation.clear() }}>Đổi thứ tự</button>}
            </div>
            {!milestones.length ? <ExState title="Nhóm chưa có mốc đồ án" message="Thêm mốc để xác định mục tiêu, thời gian và công việc cần hoàn thành." /> : order ? <>
              <ol>{order.map((item,index) => <li className="ex-order-row" key={item.id}><span className="ex-milestone-number">{String(index + 1).padStart(2,'0')}</span><strong>{item.title}</strong><button className="ex-button" aria-label={`Đưa ${item.title} lên`} disabled={mutation.busy || index === 0} onClick={() => move(index,-1)}><ExIcon name="arrow_upward" /></button><button className="ex-button" aria-label={`Đưa ${item.title} xuống`} disabled={mutation.busy || index === order.length - 1} onClick={() => move(index,1)}><ExIcon name="arrow_downward" /></button></li>)}</ol>
              <div className="ex-form ex-form-footer"><button className="ex-button" disabled={mutation.busy} onClick={() => setOrder(null)}>Hủy</button><button className="ex-button ex-button-primary" disabled={mutation.busy} onClick={() => void mutation.run(() => services.milestone.reorderMilestones(project.id, order.map((item,sortOrder) => ({ milestoneId:item.id, sortOrder, concurrencyToken: item.concurrencyToken }))), () => { setOrder(null); reload() }, 'Đã lưu thứ tự các mốc.')}>Lưu thứ tự</button></div>
            </> : <>
              <ol>
                {milestonesPagination.paginatedItems.map((item, idx) => {
                  const index = (milestonesPagination.page - 1) * milestonesPagination.pageSize + idx
                  const itemProgress = progress.find(entry => entry.milestoneId === item.id)
                  return (
                    <li key={item.id}>
                      <Link className="ex-milestone-row" to={`${routeBase}/milestones/${item.id}`}>
                        <span className="ex-milestone-number">{String(index + 1).padStart(2,'0')}</span>
                        <div>
                          <h2>{item.title}</h2>
                          <p>{itemProgress ? `${itemProgress.totalTasks} công việc` : progressLoading ? 'Đang tải công việc…' : 'Chưa có số liệu công việc'}</p>
                        </div>
                        <StatusBadge status={item.status} tone={milestoneTone(item.status)} label={milestoneLabels[item.status] ?? 'Chưa xác định'} />
                        <span className="ex-milestone-progress">{itemProgress ? <>{itemProgress.doneTasks}/{itemProgress.totalTasks} việc · {Math.round(itemProgress.progressPercentage)}%<ExProgress value={itemProgress.progressPercentage} label={`Tiến độ mốc ${item.title}`} /></> : progressLoading ? 'Đang tải tiến độ…' : 'Chưa có số liệu tiến độ'}</span>
                        <span className="ex-milestone-date">Hạn: {dateLabel(item.dueDate)}</span>
                      </Link>
                    </li>
                  )
                })}
              </ol>
              {milestonesPagination.showPagination && (
                <div className="border-t border-hairline px-5 py-3">
                  <Pagination
                    page={milestonesPagination.page}
                    pages={milestonesPagination.totalPages}
                    total={milestonesPagination.total}
                    pageSize={milestonesPagination.pageSize}
                    pageSizeOptions={[8, 16, 30]}
                    onPage={milestonesPagination.setPage}
                    onPageSizeChange={milestonesPagination.setPageSize}
                  />
                </div>
              )}
            </>}
          </section>
          {creating && (
            <div className="xl:col-span-5 xl:sticky xl:top-20 min-w-0">
              <MilestoneForm key="create" busy={mutation.busy} onCancel={() => setCreating(false)} onSubmit={payload => mutation.run(() => services.milestone.createMilestone({ projectId: project.id, title: payload.title, description: payload.description, startDate: payload.startDate, dueDate: payload.dueDate,
                sortOrder: milestones.length ? Math.max(...milestones.map(item => item.sortOrder)) + 1 : 0 }), () => { setCreating(false); reload() }, 'Đã tạo mốc đồ án.')} />
            </div>
          )}
        </div>
      )}
  </ExecutionPage>
}

function MilestoneForm({ milestone, busy, onCancel, onSubmit }: { milestone?: MilestoneDto; busy: boolean; onCancel: () => void; onSubmit: (payload: Omit<import('../../../services/api/milestones.api').UpdateMilestonePayload,'sortOrder' | 'concurrencyToken'>) => Promise<boolean> }) {
  const [validation, setValidation] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    const title = String(form.get('title') ?? '').trim(); const startDate = String(form.get('startDate') ?? ''); const dueDate = String(form.get('dueDate') ?? '')
    if (!title || (startDate && dueDate && dueDate < startDate)) { setValidation('Nhập tên mốc và chọn hạn bằng hoặc sau ngày bắt đầu.'); return }
    setValidation(''); void onSubmit({ title, description: String(form.get('description') ?? '').trim() || null, startDate: startDate || null, dueDate: dueDate || null, status: String(form.get('status') ?? 'PLANNED') })
  }
  return <section className="ex-panel" aria-label={milestone ? 'Chỉnh sửa mốc' : 'Tạo mốc'}><div className="ex-panel-heading"><h2>{milestone ? 'Chỉnh sửa mốc' : 'Tạo mốc đồ án'}</h2></div><form className="ex-form" onSubmit={submit}><fieldset disabled={busy}><div className="ex-fields">
    <label className="ex-full">Tên mốc<input autoFocus name="title" required maxLength={255} defaultValue={milestone?.title ?? ''} placeholder="Ví dụ: Hoàn thiện chức năng cốt lõi" /></label><label className="ex-full">Mô tả<textarea name="description" rows={2} maxLength={10000} defaultValue={milestone?.description ?? ''} placeholder="Mục tiêu và kết quả cần đạt của mốc" /></label>
    <label>Bắt đầu dự kiến<input name="startDate" type="date" defaultValue={milestone?.startDate ?? ''} /></label><label>Hạn hoàn thành<input name="dueDate" type="date" defaultValue={milestone?.dueDate ?? ''} /></label>
    {milestone && <label>Trạng thái<select name="status" defaultValue={milestone.status}>{Object.entries(milestoneLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
  </div>{validation && <p className="ex-notice ex-notice-error mt-3" role="alert">{validation}</p>}<div className="ex-form-footer"><button type="button" className="ex-button" onClick={onCancel}>Hủy</button><button className="ex-button ex-button-primary">{busy ? 'Đang lưu…' : milestone ? 'Lưu mốc' : 'Tạo mốc'}</button></div></fieldset></form></section>
}
