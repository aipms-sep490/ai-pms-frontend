import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FilterToolbar } from '../../../components/ui/FilterToolbar'
import { Modal } from '../../../components/ui/Modal'
import { useExecutionAccess } from '../../execution/context/ExecutionAccessContext'
import { ExecutionPage, ExConfirm, ExIcon, ExProgress, ExState } from '../../execution/execution-ui'
import { executionError, milestoneLabels } from '../../execution/execution-utils'
import { useExecutionMutation } from '../../execution/useExecutionMutation'
import { services } from '../../../services/service-gateway'
import type { MilestoneDto, MilestoneProgressDto } from '../../../types/backend'
import { dateLabel } from '../../projects/utils/collaboration-workspace'
import { useMilestoneExecutionCapabilities } from '../../execution/hooks/useMilestoneExecutionCapabilities'
import { canUseProjectExecutionAction, canUseTaskExecutionAction } from '../../execution/execution-authority'

type MilestoneSort = 'order' | 'due_asc' | 'progress_desc' | 'progress_asc'

function isTasksFullyDoneButUnclosed(item: MilestoneDto, itemProgress?: MilestoneProgressDto) {
  return Boolean(
    itemProgress &&
    itemProgress.totalTasks > 0 &&
    itemProgress.doneTasks >= itemProgress.totalTasks &&
    item.status !== 'COMPLETED' &&
    item.status !== 'CANCELLED',
  )
}

function milestoneStatusDisplay(item: MilestoneDto, itemProgress?: MilestoneProgressDto) {
  if (isTasksFullyDoneButUnclosed(item, itemProgress)) {
    return { label: 'Đã xong việc · Chưa chốt mốc', badgeClass: 'ex-badge-READY_TO_COMPLETE' }
  }
  return {
    label: milestoneLabels[item.status] ?? 'Chưa xác định',
    badgeClass: `ex-badge-${item.status}`,
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
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [sortBy, setSortBy] = useState<MilestoneSort>('order')
  const milestoneCapabilities = useMilestoneExecutionCapabilities(Number(milestoneId), revision)
  const reload = () => setRevision(value => value + 1)
  const mutation = useExecutionMutation({ onForbidden: reload })
  const clearMutation = mutation.clear

  useEffect(() => {
    setCreating(false)
    setEditing(false)
    setDeleting(false)
    setOrder(null)
    clearMutation()
  }, [milestoneId, project.id, clearMutation])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    setProgressError('')
    setProgressLoading(true)
    setProgress([])
    services.milestone.getProjectMilestones(project.id, controller.signal).then(items => {
      if (!controller.signal.aborted) setMilestones([...items].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id))
    }).catch(reason => {
      if (!controller.signal.aborted) setError(executionError(reason, 'tải mốc đồ án'))
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    services.milestone.getProjectMilestoneProgress(project.id, controller.signal).then(items => {
      if (!controller.signal.aborted) setProgress(items)
    }).catch(reason => {
      if (!controller.signal.aborted) {
        setProgress([])
        setProgressError(executionError(reason, 'tải tiến độ mốc'))
      }
    }).finally(() => {
      if (!controller.signal.aborted) setProgressLoading(false)
    })
    return () => controller.abort()
  }, [project.id, revision])

  const progressMap = useMemo(() => new Map(progress.map(entry => [entry.milestoneId, entry])), [progress])
  const selected = milestoneId ? milestones.find(item => item.id === Number(milestoneId)) : null
  const stats = selected ? progressMap.get(selected.id) : undefined
  const actionCapability = (code: string) => milestoneCapabilities.get(code)
  const canUpdate = Boolean(selected) && canUseTaskExecutionAction(access, 'update_task', actionCapability('update_milestone'))
  const canDelete = Boolean(selected) && canUseTaskExecutionAction(access, 'delete_task', actionCapability('delete_milestone'))
  const canQuickCompleteList = canCreate

  const save = (payload: import('../../../services/api/milestones.api').UpdateMilestonePayload) => selected
    ? mutation.run(() => services.milestone.updateMilestone(selected.id, { ...payload, concurrencyToken: selected.concurrencyToken }), () => { setEditing(false); reload() }, 'Đã lưu mốc đồ án.')
    : Promise.resolve(false)

  function quickComplete(item: MilestoneDto) {
    void mutation.run(
      () => services.milestone.updateMilestone(item.id, {
        title: item.title,
        description: item.description ?? null,
        startDate: item.startDate ?? null,
        dueDate: item.dueDate ?? null,
        status: 'COMPLETED',
        sortOrder: item.sortOrder,
        concurrencyToken: item.concurrencyToken,
      }),
      () => { reload() },
      `Đã chốt hoàn thành mốc “${item.title}”.`,
    )
  }

  function move(index: number, direction: number) {
    if (!order || index + direction < 0 || index + direction >= order.length) return
    const next = [...order]
    ;[next[index], next[index + direction]] = [next[index + direction], next[index]]
    setOrder(next)
  }

  const readyToCloseCount = useMemo(
    () => milestones.filter(item => isTasksFullyDoneButUnclosed(item, progressMap.get(item.id))).length,
    [milestones, progressMap],
  )
  const completedCount = useMemo(
    () => milestones.filter(item => item.status === 'COMPLETED').length,
    [milestones],
  )

  const filteredMilestones = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const list = milestones.filter((item) => {
      const itemProgress = progressMap.get(item.id)
      if (statusFilter === 'READY_TO_CLOSE') {
        if (!isTasksFullyDoneButUnclosed(item, itemProgress)) return false
      } else if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false
      }
      if (!needle) return true
      return item.title.toLowerCase().includes(needle) || (item.description ?? '').toLowerCase().includes(needle)
    })

    return [...list].sort((a, b) => {
      if (sortBy === 'due_asc') return (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31') || a.sortOrder - b.sortOrder
      if (sortBy === 'progress_desc') return (progressMap.get(b.id)?.progressPercentage ?? -1) - (progressMap.get(a.id)?.progressPercentage ?? -1) || a.sortOrder - b.sortOrder
      if (sortBy === 'progress_asc') return (progressMap.get(a.id)?.progressPercentage ?? 101) - (progressMap.get(b.id)?.progressPercentage ?? 101) || a.sortOrder - b.sortOrder
      return a.sortOrder - b.sortOrder || a.id - b.id
    })
  }, [milestones, progressMap, search, statusFilter, sortBy])

  const statusTabs = useMemo(() => {
    const base = [
      { value: 'ALL', label: 'Tất cả', count: milestones.length },
      { value: 'IN_PROGRESS', label: 'Đang thực hiện', count: milestones.filter(m => m.status === 'IN_PROGRESS').length },
      { value: 'PLANNED', label: 'Chưa bắt đầu', count: milestones.filter(m => m.status === 'PLANNED').length },
      { value: 'COMPLETED', label: 'Hoàn thành', count: completedCount },
    ]
    if (readyToCloseCount > 0) {
      base.splice(1, 0, { value: 'READY_TO_CLOSE', label: 'Đã xong 100% việc', count: readyToCloseCount })
    }
    const cancelledCount = milestones.filter(m => m.status === 'CANCELLED').length
    if (cancelledCount > 0) {
      base.push({ value: 'CANCELLED', label: 'Đã hủy', count: cancelledCount })
    }
    return base
  }, [milestones, completedCount, readyToCloseCount])

  const title = selected?.title ?? 'Mốc đồ án'
  const selectedStatusInfo = selected ? milestoneStatusDisplay(selected, stats) : null

  return (
    <ExecutionPage
      title={title}
      eyebrow={project.code}
      backTo={milestoneId ? `${routeBase}/milestones` : undefined}
      description={milestoneId ? 'Theo dõi thời gian, tiến độ và công việc thuộc mốc này.' : 'Chia đồ án thành các mốc rõ ràng để cả nhóm cùng theo dõi tiến độ.'}
      action={
        <>
          <button className="ex-button" onClick={reload} disabled={loading || mutation.busy}>
            <ExIcon name="refresh" />Cập nhật
          </button>
          {canCreate && !milestoneId && (
            <button
              className="ex-button ex-button-primary"
              disabled={mutation.busy}
              onClick={() => { mutation.clear(); setCreating(true) }}
            >
              <ExIcon name="add" />Tạo mốc
            </button>
          )}
          {canUpdate && selected && isTasksFullyDoneButUnclosed(selected, stats) && (
            <button
              className="ex-button ex-button-primary"
              disabled={mutation.busy}
              onClick={() => quickComplete(selected)}
            >
              <ExIcon name="check_circle" />Chốt hoàn thành
            </button>
          )}
          {canUpdate && selected && (
            <button
              className="ex-button"
              disabled={mutation.busy}
              onClick={() => { mutation.clear(); setEditing(true) }}
            >
              <ExIcon name="edit" />Chỉnh sửa
            </button>
          )}
        </>
      }
    >
      {!creating && !editing && mutation.error && <p className="ex-notice ex-notice-error" role="alert">{mutation.error}</p>}
      {mutation.notice && <p className="ex-notice" role="status">{mutation.notice}</p>}
      {progressError && <ExState message={progressError} retry={reload} />}

      {creating && (
        <Modal open title="Tạo mốc đồ án" description="Đặt mục tiêu và khung thời gian dự kiến cho giai đoạn mới." busy={mutation.busy} onClose={() => setCreating(false)}>
          {mutation.error && <p className="ex-notice ex-notice-error" role="alert">{mutation.error}</p>}
          <MilestoneForm
            key="create"
            busy={mutation.busy}
            onCancel={() => setCreating(false)}
            onSubmit={payload => mutation.run(
              () => services.milestone.createMilestone({
                projectId: project.id,
                title: payload.title,
                description: payload.description,
                startDate: payload.startDate,
                dueDate: payload.dueDate,
                sortOrder: milestones.length ? Math.max(...milestones.map(item => item.sortOrder)) + 1 : 0,
              }),
              () => { setCreating(false); reload() },
              'Đã tạo mốc đồ án.',
            )}
          />
        </Modal>
      )}

      {editing && selected && (
        <Modal open title="Chỉnh sửa mốc đồ án" description={selected.title} busy={mutation.busy} onClose={() => setEditing(false)}>
          {mutation.error && <p className="ex-notice ex-notice-error" role="alert">{mutation.error}</p>}
          <MilestoneForm
            key={`${selected.id}:${selected.updatedAt}`}
            milestone={selected}
            busy={mutation.busy}
            onCancel={() => setEditing(false)}
            onSubmit={payload => save({ ...payload, sortOrder: selected.sortOrder })}
          />
        </Modal>
      )}

      {loading ? (
        <section className="ex-panel"><ExState loading /></section>
      ) : error ? (
        <ExState message={error} retry={reload} />
      ) : milestoneId ? (
        selected ? (
          <>
            <section className="ex-panel">
              <div className="ex-panel-heading">
                <h2>Thông tin mốc</h2>
                {selectedStatusInfo && (
                  <span className={`ex-badge ${selectedStatusInfo.badgeClass}`}>{selectedStatusInfo.label}</span>
                )}
              </div>
              <div className="ex-padding ex-stack">
                <p className="ex-prose">{selected.description?.trim() || 'Chưa có mô tả cho mốc này.'}</p>
                <dl className="ex-facts">
                  <div>
                    <dt>Bắt đầu dự kiến</dt>
                    <dd>{dateLabel(selected.startDate)}</dd>
                  </div>
                  <div>
                    <dt>Hạn hoàn thành</dt>
                    <dd>{dateLabel(selected.dueDate)}</dd>
                  </div>
                  <div>
                    <dt>Tiến độ công việc</dt>
                    <dd>
                      {stats ? (
                        <>
                          <span>{stats.doneTasks}/{stats.totalTasks} việc hoàn thành · {Math.round(stats.progressPercentage)}%</span>
                          <div className="mt-3"><ExProgress value={stats.progressPercentage} label={`Tiến độ mốc ${selected.title}`} /></div>
                        </>
                      ) : progressLoading ? 'Đang tải tiến độ…' : 'Chưa có số liệu tiến độ'}
                    </dd>
                  </div>
                </dl>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="ex-actions">
                    <Link className="ex-button ex-button-primary" to={`${routeBase}/tasks?milestone=${selected.id}`}>
                      <ExIcon name="checklist" />Xem công việc của mốc
                    </Link>
                    <Link className="ex-button" to={`${routeBase}/gantt`}>Xem lịch thực hiện</Link>
                  </div>
                  {canDelete && stats?.totalTasks === 0 && (
                    <button type="button" className="ex-button ex-button-danger" onClick={() => setDeleting(true)}>
                      <ExIcon name="delete" />Xóa mốc
                    </button>
                  )}
                </div>
                {canUpdate && stats && stats.totalTasks > 0 && (
                  <p className="ex-muted">Mốc đã có công việc. Nếu dừng thực hiện, bạn có thể chọn trạng thái Đã hủy trong phần chỉnh sửa.</p>
                )}
                {deleting && (
                  <ExConfirm
                    title="Xóa mốc đồ án này?"
                    description="Mốc chưa có công việc sẽ được xóa khỏi kế hoạch. Bạn cần tạo lại nếu muốn sử dụng sau này."
                    busy={mutation.busy}
                    onCancel={() => setDeleting(false)}
                    onConfirm={() => void mutation.run(
                      () => services.milestone.deleteMilestone(selected.id, selected.concurrencyToken),
                      () => { navigate(`${routeBase}/milestones`, { replace: true }); reload() },
                      'Đã xóa mốc đồ án.',
                    )}
                  />
                )}
              </div>
            </section>
          </>
        ) : (
          <section className="ex-panel">
            <ExState
              title="Không tìm thấy mốc đồ án"
              message="Mốc có thể đã được xóa hoặc đường dẫn không còn phù hợp."
              action={<Link className="ex-button" to={`${routeBase}/milestones`}>Về danh sách mốc</Link>}
            />
          </section>
        )
      ) : (
        <section className="ex-panel" aria-label="Kế hoạch các mốc">
          <div className="ex-panel-heading">
            <div>
              <h2>{milestones.length} mốc đồ án</h2>
              <p>
                {completedCount} mốc hoàn thành
                {readyToCloseCount > 0 ? ` · ${readyToCloseCount} mốc đã xong 100% công việc (sẵn sàng chốt)` : ''}
              </p>
            </div>
            {canReorder && milestones.length > 1 && !order && (
              <button className="ex-text-button" onClick={() => { setOrder([...milestones]); mutation.clear() }}>
                <ExIcon name="swap_vert" />Đổi thứ tự
              </button>
            )}
          </div>

          {!order && milestones.length > 0 && (
            <FilterToolbar
              embedded
              tabs={statusTabs}
              activeTab={statusFilter}
              onTabChange={setStatusFilter}
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Tìm theo tên hoặc mô tả mốc…"
              sort={{
                value: sortBy,
                onChange: (value) => setSortBy(value as MilestoneSort),
                options: [
                  { value: 'order', label: 'Thứ tự kế hoạch' },
                  { value: 'due_asc', label: 'Hạn gần nhất' },
                  { value: 'progress_desc', label: 'Tiến độ cao nhất' },
                  { value: 'progress_asc', label: 'Tiến độ thấp nhất' },
                ],
              }}
              hasActiveFilters={statusFilter !== 'ALL' || Boolean(search.trim()) || sortBy !== 'order'}
              onClearAll={() => { setStatusFilter('ALL'); setSearch(''); setSortBy('order') }}
              resultSummary={`Hiển thị ${filteredMilestones.length} / ${milestones.length} mốc`}
            />
          )}

          {!milestones.length ? (
            <ExState
              title="Nhóm chưa có mốc đồ án"
              message="Thêm mốc để xác định mục tiêu, thời gian và công việc cần hoàn thành."
              action={canCreate ? (
                <button type="button" className="ex-button ex-button-primary" onClick={() => setCreating(true)}>
                  <ExIcon name="add" />Tạo mốc đầu tiên
                </button>
              ) : undefined}
            />
          ) : order ? (
            <>
              <ol>
                {order.map((item, index) => (
                  <li className="ex-order-row" key={item.id}>
                    <span className="ex-milestone-number">{String(index + 1).padStart(2, '0')}</span>
                    <strong>{item.title}</strong>
                    <button className="ex-button" aria-label={`Đưa ${item.title} lên`} disabled={mutation.busy || index === 0} onClick={() => move(index, -1)}>
                      <ExIcon name="arrow_upward" />
                    </button>
                    <button className="ex-button" aria-label={`Đưa ${item.title} xuống`} disabled={mutation.busy || index === order.length - 1} onClick={() => move(index, 1)}>
                      <ExIcon name="arrow_downward" />
                    </button>
                  </li>
                ))}
              </ol>
              <div className="ex-form ex-form-footer">
                <button className="ex-button" disabled={mutation.busy} onClick={() => setOrder(null)}>Hủy</button>
                <button
                  className="ex-button ex-button-primary"
                  disabled={mutation.busy}
                  onClick={() => void mutation.run(
                    () => services.milestone.reorderMilestones(project.id, order.map((item, sortOrder) => ({ milestoneId: item.id, sortOrder, concurrencyToken: item.concurrencyToken }))),
                    () => { setOrder(null); reload() },
                    'Đã lưu thứ tự các mốc.',
                  )}
                >
                  Lưu thứ tự
                </button>
              </div>
            </>
          ) : filteredMilestones.length === 0 ? (
            <ExState
              title="Không có mốc phù hợp"
              message="Thử xóa bộ lọc hoặc tìm bằng từ khóa khác."
              action={<button type="button" className="ex-button" onClick={() => { setStatusFilter('ALL'); setSearch(''); setSortBy('order') }}>Xóa bộ lọc</button>}
            />
          ) : (
            <ol>
              {filteredMilestones.map((item) => {
                const itemProgress = progressMap.get(item.id)
                const statusInfo = milestoneStatusDisplay(item, itemProgress)
                const readyToClose = isTasksFullyDoneButUnclosed(item, itemProgress)
                const planIndex = milestones.findIndex(m => m.id === item.id)
                return (
                  <li key={item.id} className="ex-milestone-item">
                    <Link className="ex-milestone-row" to={`${routeBase}/milestones/${item.id}`}>
                      <span className="ex-milestone-number">{String(planIndex + 1).padStart(2, '0')}</span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                        <p>{itemProgress ? `${itemProgress.totalTasks} công việc` : progressLoading ? 'Đang tải công việc…' : 'Chưa có số liệu công việc'}</p>
                      </div>
                      <span className={`ex-badge ${statusInfo.badgeClass}`}>{statusInfo.label}</span>
                      <span className="ex-milestone-progress">
                        {itemProgress ? (
                          <>
                            {itemProgress.doneTasks}/{itemProgress.totalTasks} việc · {Math.round(itemProgress.progressPercentage)}%
                            <ExProgress value={itemProgress.progressPercentage} label={`Tiến độ mốc ${item.title}`} />
                          </>
                        ) : progressLoading ? 'Đang tải tiến độ…' : 'Chưa có số liệu tiến độ'}
                      </span>
                      <span className="ex-milestone-date">Hạn: {dateLabel(item.dueDate)}</span>
                    </Link>
                    {readyToClose && canQuickCompleteList && (
                      <div className="ex-milestone-quick-bar">
                        <span className="text-xs text-status-success-text font-medium">
                          Tất cả công việc trong mốc đã hoàn tất — bạn có thể chốt hoàn thành mốc ngay.
                        </span>
                        <button
                          type="button"
                          disabled={mutation.busy}
                          className="ex-button ex-button-primary !min-h-8 !py-1 !px-3 !text-xs"
                          onClick={() => quickComplete(item)}
                        >
                          <ExIcon name="check_circle" />Chốt hoàn thành
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>
          )}
        </section>
      )}
    </ExecutionPage>
  )
}

function MilestoneForm({ milestone, busy, onCancel, onSubmit }: {
  milestone?: MilestoneDto
  busy: boolean
  onCancel: () => void
  onSubmit: (payload: Omit<import('../../../services/api/milestones.api').UpdateMilestonePayload, 'sortOrder' | 'concurrencyToken'>) => Promise<boolean>
}) {
  const [validation, setValidation] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const title = String(form.get('title') ?? '').trim()
    const startDate = String(form.get('startDate') ?? '')
    const dueDate = String(form.get('dueDate') ?? '')
    if (!title || (startDate && dueDate && dueDate < startDate)) {
      setValidation('Nhập tên mốc và chọn hạn bằng hoặc sau ngày bắt đầu.')
      return
    }
    setValidation('')
    void onSubmit({
      title,
      description: String(form.get('description') ?? '').trim() || null,
      startDate: startDate || null,
      dueDate: dueDate || null,
      status: String(form.get('status') ?? 'PLANNED'),
    })
  }
  return (
    <form className="ex-form !p-0" onSubmit={submit}>
      <fieldset disabled={busy}>
        <div className="ex-fields">
          <label className="ex-full">
            Tên mốc
            <input autoFocus name="title" required maxLength={255} defaultValue={milestone?.title ?? ''} placeholder="Ví dụ: Hoàn thiện chức năng cốt lõi" />
          </label>
          <label className="ex-full">
            Mô tả
            <textarea name="description" rows={3} maxLength={10000} defaultValue={milestone?.description ?? ''} placeholder="Mục tiêu và kết quả cần đạt của mốc" />
          </label>
          <label>
            Bắt đầu dự kiến
            <input name="startDate" type="date" defaultValue={milestone?.startDate ?? ''} />
          </label>
          <label>
            Hạn hoàn thành
            <input name="dueDate" type="date" defaultValue={milestone?.dueDate ?? ''} />
          </label>
          {milestone && (
            <label className="ex-full">
              Trạng thái
              <select name="status" defaultValue={milestone.status}>
                {Object.entries(milestoneLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          )}
        </div>
        {validation && <p className="ex-notice ex-notice-error mt-3" role="alert">{validation}</p>}
        <div className="ex-form-footer">
          <button type="button" className="ex-button" onClick={onCancel}>Hủy</button>
          <button className="ex-button ex-button-primary">{busy ? 'Đang lưu…' : milestone ? 'Lưu mốc' : 'Tạo mốc'}</button>
        </div>
      </fieldset>
    </form>
  )
}
