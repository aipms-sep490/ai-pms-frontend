import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { InlineAlert } from '../../../components/ui/InlineAlert'
import { Modal } from '../../../components/ui/Modal'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { services } from '../../../services/service-gateway'
import type { MilestoneDto, TimelineMilestoneDto } from '../../../types/backend'
import { executionError, milestoneLabels } from '../../execution/execution-utils'
import { ExProgress } from '../../execution/execution-ui'
import { dateLabel, isOverdue, taskStatusLabel } from '../../projects/utils/collaboration-workspace'
import { shiftIsoDate } from '../utils/schedule'

const milestoneStatuses = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const

function milestoneStatusTone(status: string) {
  if (status === 'COMPLETED') return 'success' as const
  if (status === 'CANCELLED') return 'danger' as const
  if (status === 'IN_PROGRESS') return 'warning' as const
  return 'neutral' as const
}

export function MilestoneScheduleDrawer({
  milestone,
  routeBase,
  canEdit,
  canCreateTask,
  observedAt,
  onClose,
  onUpdated,
  onOpenTask,
  onCreateTaskInMilestone,
}: {
  milestone: TimelineMilestoneDto
  routeBase: string
  canEdit: boolean
  canCreateTask: boolean
  observedAt: number
  onClose: () => void
  onUpdated: () => void
  onOpenTask: (taskId: number) => void
  onCreateTaskInMilestone: (milestoneTitle: string) => void
}) {
  const [detail, setDetail] = useState<MilestoneDto | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(canEdit)
  const [startDate, setStartDate] = useState(milestone.startDate?.slice(0, 10) ?? '')
  const [dueDate, setDueDate] = useState(milestone.dueDate?.slice(0, 10) ?? '')
  const [status, setStatus] = useState(milestone.status)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    setStartDate(milestone.startDate?.slice(0, 10) ?? '')
    setDueDate(milestone.dueDate?.slice(0, 10) ?? '')
    setStatus(milestone.status)
    setError('')
    setNotice('')
    if (!canEdit) {
      setDetail(null)
      setLoadingDetail(false)
      return
    }
    const controller = new AbortController()
    setLoadingDetail(true)
    services.milestone
      .getMilestone(milestone.id, controller.signal)
      .then((res) => {
        if (!controller.signal.aborted) {
          setDetail(res)
          setStartDate(res.startDate?.slice(0, 10) ?? '')
          setDueDate(res.dueDate?.slice(0, 10) ?? '')
          setStatus(res.status)
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(executionError(reason, 'tải chi tiết mốc'))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingDetail(false)
      })
    return () => controller.abort()
  }, [milestone.id, milestone.startDate, milestone.dueDate, milestone.status, canEdit])

  const doneCount = milestone.tasks.filter((t) => t.status === 'DONE').length
  const overdueCount = milestone.tasks.filter((t) => isOverdue(t, observedAt)).length
  const blockedCount = milestone.tasks.filter((t) => t.status === 'BLOCKED').length

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    if (!canEdit || !detail) return
    if (startDate && dueDate && dueDate < startDate) {
      setError('Hạn hoàn thành phải bằng hoặc sau ngày bắt đầu.')
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const updated = await services.milestone.updateMilestone(milestone.id, {
        title: detail.title,
        description: detail.description ?? null,
        startDate: startDate || null,
        dueDate: dueDate || null,
        sortOrder: detail.sortOrder,
        status,
        concurrencyToken: detail.concurrencyToken,
      })
      setDetail(updated)
      setNotice('Đã cập nhật lịch trình mốc đồ án.')
      onUpdated()
    } catch (reason) {
      setError(executionError(reason, 'cập nhật lịch trình mốc'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      drawer
      busy={saving}
      title={milestone.title}
      description="Kiểm tra tiến độ, điều chỉnh khung thời gian và mở nhanh công việc thuộc mốc."
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={milestoneStatusTone(status)} label={milestoneLabels[status] ?? status} />
            {overdueCount > 0 && (
              <StatusBadge tone="danger" label={`${overdueCount} việc quá hạn`} />
            )}
          </div>
          <Link
            to={`${routeBase}/milestones/${milestone.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline underline-offset-4"
          >
            <span>Mở trang chi tiết mốc</span>
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">open_in_new</span>
          </Link>
        </div>

        <div className="gantt-drawer-stats">
          <div className="gantt-drawer-stat">
            <span>Tiến độ</span>
            <strong>{Math.round(milestone.progressPercentage)}%</strong>
          </div>
          <div className="gantt-drawer-stat">
            <span>Hoàn thành</span>
            <strong>{doneCount}/{milestone.tasks.length}</strong>
          </div>
          <div className="gantt-drawer-stat">
            <span>Cần lưu ý</span>
            <strong className={overdueCount > 0 || blockedCount > 0 ? 'text-status-error-text' : ''}>
              {overdueCount + blockedCount}
            </strong>
          </div>
        </div>

        <ExProgress value={milestone.progressPercentage} label={`Tiến độ mốc ${milestone.title}`} />

        {error && <InlineAlert tone="error">{error}</InlineAlert>}
        {notice && <InlineAlert tone="success">{notice}</InlineAlert>}

        {canEdit && (
          <form onSubmit={(e) => void handleSave(e)} className="space-y-3 rounded-xl border border-hairline bg-canvas/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-ink">Điều chỉnh lịch mốc nhanh</h3>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  disabled={saving || loadingDetail}
                  className="rounded-md border border-hairline bg-card px-2 py-1 text-xs font-semibold text-ink-soft hover:border-primary hover:text-primary disabled:opacity-50"
                  onClick={() => setDueDate(shiftIsoDate(dueDate || startDate, 3))}
                >
                  +3 ngày hạn
                </button>
                <button
                  type="button"
                  disabled={saving || loadingDetail}
                  className="rounded-md border border-hairline bg-card px-2 py-1 text-xs font-semibold text-ink-soft hover:border-primary hover:text-primary disabled:opacity-50"
                  onClick={() => setDueDate(shiftIsoDate(dueDate || startDate, 7))}
                >
                  +1 tuần hạn
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-semibold text-ink-soft">
                Ngày bắt đầu
                <input
                  type="date"
                  value={startDate}
                  disabled={saving || loadingDetail}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="min-h-10 rounded-lg border border-hairline bg-card px-3 text-sm font-normal text-ink focus:border-primary focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-ink-soft">
                Hạn hoàn thành
                <input
                  type="date"
                  value={dueDate}
                  min={startDate || undefined}
                  disabled={saving || loadingDetail}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="min-h-10 rounded-lg border border-hairline bg-card px-3 text-sm font-normal text-ink focus:border-primary focus:outline-none"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1 text-xs font-semibold text-ink-soft">
              Trạng thái mốc
              <select
                value={status}
                disabled={saving || loadingDetail}
                onChange={(e) => setStatus(e.target.value)}
                className="min-h-10 rounded-lg border border-hairline bg-card px-3 text-sm font-normal text-ink focus:border-primary focus:outline-none"
              >
                {milestoneStatuses.map((code) => (
                  <option key={code} value={code}>{milestoneLabels[code]}</option>
                ))}
              </select>
            </label>

            <div className="flex justify-end pt-1">
              <Button type="submit" size="sm" disabled={saving || loadingDetail || !detail}>
                {saving ? 'Đang lưu…' : 'Lưu lịch mốc'}
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-ink">Công việc trong mốc ({milestone.tasks.length})</h3>
            {canCreateTask && milestone.status !== 'COMPLETED' && milestone.status !== 'CANCELLED' && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                icon="add"
                onClick={() => onCreateTaskInMilestone(milestone.title)}
              >
                Thêm việc
              </Button>
            )}
          </div>

          {milestone.tasks.length === 0 ? (
            <p className="rounded-lg border border-dashed border-hairline bg-canvas p-4 text-center text-xs text-ink-muted">
              Chưa có công việc nào trong mốc này.
            </p>
          ) : (
            <ul className="gantt-drawer-tasks">
              {milestone.tasks.map((task) => {
                const late = isOverdue(task, observedAt)
                return (
                  <li key={task.id}>
                    <button
                      type="button"
                      className="gantt-drawer-task-btn"
                      onClick={() => onOpenTask(task.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-xs font-semibold text-ink">{task.title}</strong>
                        <span className={`text-xs ${late ? 'font-semibold text-status-error-text' : 'text-ink-muted'}`}>
                          {taskStatusLabel(task.status)}
                          {task.dueAt ? ` · Hạn ${dateLabel(task.dueAt)}` : ' · Chưa đặt hạn'}
                          {late ? ' · Quá hạn' : ''}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {task.assignees[0] && (
                          <Avatar name={task.assignees[0].fullName} title={task.assignees[0].fullName} size="xs" shape="circle" />
                        )}
                        <span className="material-symbols-outlined text-[16px] text-ink-muted" aria-hidden="true">chevron_right</span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}
