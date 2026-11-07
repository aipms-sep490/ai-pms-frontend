import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from '../../../components/ui/Modal'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { useExecutionAccess } from '../../execution/context/ExecutionAccessContext'
import { ExConfirm, ExIcon, ExState } from '../../execution/execution-ui'
import { dateTimeLabel, dependencyLabels, executionError, priorityLabels } from '../../execution/execution-utils'
import { useExecutionMutation } from '../../execution/useExecutionMutation'
import { services } from '../../../services/service-gateway'
import type { ProjectTimelineDataDto, TaskDto, TaskStatusHistoryDto } from '../../../types/backend'
import { taskStatusLabel, utcTimestamp } from '../../projects/utils/collaboration-workspace'
import { TaskEvidenceAndComments } from './TaskEvidenceAndComments'
import { TaskDisciplinePanel } from './TaskDisciplinePanel'
import { useTaskExecutionCapabilities } from '../../execution/hooks/useTaskExecutionCapabilities'
import { canUseTaskExecutionAction } from '../../execution/execution-authority'
import * as disciplineApi from '../../projects/api/discipline-governance-api'
import {
  TaskContentEditor,
  AssigneeEditor,
  DependencyEditor,
  StatusEditor,
  taskStatusTone,
  taskPriorityTone,
} from '../pages/TaskDetailPage'

export function TaskDetailModal({
  taskId,
  onClose,
  onTaskUpdated,
}: {
  taskId: number
  onClose: () => void
  onTaskUpdated?: () => void
}) {
  const access = useExecutionAccess()
  const { project, routeBase, team, teamLoadError, retryTeam } = access

  const [revision, setRevision] = useState(0)
  const [task, setTask] = useState<TaskDto | null>(null)
  const [history, setHistory] = useState<TaskStatusHistoryDto[]>([])
  const [timeline, setTimeline] = useState<ProjectTimelineDataDto | null>(null)
  const taskCapabilities = useTaskExecutionCapabilities(taskId, revision)
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [error, setError] = useState('')
  const [historyError, setHistoryError] = useState('')
  const [contextError, setContextError] = useState('')
  const [mentorDisciplineScope, setMentorDisciplineScope] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const [mentorDisciplineItems, setMentorDisciplineItems] = useState<disciplineApi.TaskDiscipline[]>([])
  const [editing, setEditing] = useState<'content' | 'assignees' | 'dependency' | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState<'evidence' | 'history' | 'discipline'>('evidence')

  const reload = () => {
    setRevision(value => value + 1)
    onTaskUpdated?.()
  }

  const mutation = useExecutionMutation({ onForbidden: reload })

  useEffect(() => {
    if (!Number.isSafeInteger(taskId) || taskId < 1) {
      setError('Đường dẫn công việc không hợp lệ.')
      setLoading(false)
      return
    }
    const controller = new AbortController()
    const signal = controller.signal
    setLoading(true)
    setError('')
    setHistoryError('')
    setContextError('')
    setHistoryLoading(true)

    services.task.getTask(taskId, signal)
      .then(next => { if (!signal.aborted) setTask(next) })
      .catch(reason => { if (!signal.aborted) setError(executionError(reason, 'tải công việc')) })
      .finally(() => { if (!signal.aborted) setLoading(false) })

    services.task.getTaskHistory(taskId, signal)
      .then(items => { if (!signal.aborted) setHistory(items) })
      .catch(reason => { if (!signal.aborted) setHistoryError(executionError(reason, 'tải lịch sử')) })
      .finally(() => { if (!signal.aborted) setHistoryLoading(false) })

    services.task.getProjectTimeline(project.id, signal)
      .then(next => { if (!signal.aborted) setTimeline(next) })
      .catch(reason => { if (!signal.aborted) setContextError(executionError(reason, 'tải các công việc liên quan')) })

    return () => controller.abort()
  }, [taskId, project.id, revision])

  useEffect(() => {
    if (access.actor !== 'mentor') {
      setMentorDisciplineScope('ready')
      setMentorDisciplineItems([])
      return
    }
    let active = true
    setMentorDisciplineScope('loading')
    setMentorDisciplineItems([])
    void disciplineApi.getTaskDisciplines(taskId).then(result => {
      if (!active) return
      setMentorDisciplineItems(result.items)
      setMentorDisciplineScope('ready')
    }).catch(() => { if (active) setMentorDisciplineScope('unavailable') })
    return () => { active = false }
  }, [access.actor, taskId, revision])

  const allTasks = timeline?.milestones.flatMap(item => item.tasks) ?? []
  const milestone = timeline?.milestones.find(item => item.id === task?.milestoneId)
  const contextValid = Boolean(milestone)
  const allowed = (code: string) => taskCapabilities.get(code)
  const mentorScopeProven = access.actor !== 'mentor' || (
    mentorDisciplineScope === 'ready' &&
    Boolean(access.supervisor?.majorId) &&
    mentorDisciplineItems.some(item => item.majorId === access.supervisor?.majorId)
  )

  const canUpdate = contextValid && canUseTaskExecutionAction(access, 'update_task', allowed('update_task'), mentorScopeProven)
  const canUpdateStatus = contextValid && canUseTaskExecutionAction(access, 'change_task_status', allowed('change_task_status'), mentorScopeProven)
  const canAssign = contextValid && canUseTaskExecutionAction(access, 'assign_task', allowed('assign_task'), mentorScopeProven)
  const canManageDependencies = contextValid && canUseTaskExecutionAction(access, 'manage_task_dependencies', allowed('manage_task_dependencies'), mentorScopeProven)
  const canManageDisciplines = contextValid && access.actor !== 'mentor' && canUseTaskExecutionAction(access, 'manage_task_disciplines', allowed('manage_task_disciplines'), mentorScopeProven)
  const canAddEvidence = contextValid && canUseTaskExecutionAction(access, 'add_task_evidence', allowed('add_task_evidence'), mentorScopeProven)
  const candidates = team?.members.map(member => ({ userId: member.userId, fullName: member.fullName })) ??
    [...new Map(allTasks.flatMap(item => item.assignees).map(person => [person.userId, person])).values()]
  const mayDelete = contextValid && canUseTaskExecutionAction(access, 'delete_task', allowed('delete_task'), mentorScopeProven)

  const saved = () => {
    setEditing(null)
    reload()
  }

  const titleText = task ? `#${task.id} · ${task.title}` : `Công việc #${taskId}`

  return (
    <Modal
      open
      title={titleText}
      description={milestone ? `Mốc: ${milestone.title}` : undefined}
      busy={mutation.busy}
      onClose={onClose}
      className="app-modal--xl"
    >
      <div className="space-y-4">
        {/* Badges and actions bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-3">
          <div className="flex flex-wrap items-center gap-2">
            {task && (
              <>
                <StatusBadge
                  status={task.status}
                  label={taskStatusLabel(task.status)}
                  tone={taskStatusTone(task.status)}
                />
                <StatusBadge
                  tone={taskPriorityTone(task.priority)}
                  label={`Ưu tiên ${priorityLabels[task.priority ?? '']?.toLowerCase() ?? 'chưa chọn'}`}
                />
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="ex-button text-xs"
              disabled={loading || mutation.busy}
              onClick={reload}
            >
              <ExIcon name="refresh" />
              Làm mới
            </button>
            {canUpdate && (
              <button
                type="button"
                className="ex-button text-xs"
                disabled={mutation.busy}
                onClick={() => {
                  mutation.clear()
                  setEditing('content')
                }}
              >
                <ExIcon name="edit" />
                Sửa nội dung
              </button>
            )}
          </div>
        </div>

        {error && <ExState message={error} retry={reload} />}
        {contextError && <ExState message={contextError} retry={reload} />}
        {mutation.error && <p className="ex-notice ex-notice-error" role="alert">{mutation.error}</p>}
        {mutation.notice && <p className="ex-notice" role="status">{mutation.notice}</p>}

        {loading && !task ? (
          <ExState loading message="Đang tải thông tin công việc…" />
        ) : task ? (
          <>
            {editing === 'content' && (
              <TaskContentEditor
                task={task}
                timeline={timeline}
                busy={mutation.busy}
                onCancel={() => setEditing(null)}
                onSubmit={payload => mutation.run(() => services.task.updateTask(task.id, { ...payload, concurrencyToken: task.concurrencyToken }), saved)}
              />
            )}

            {/* 2-column layout */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left Column: Details & Governance */}
              <div className="space-y-4 lg:col-span-7">
                {/* Description */}
                <section className="rounded-lg border border-hairline bg-card p-4">
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-muted">Mô tả công việc</h3>
                  <p className="whitespace-pre-wrap text-sm text-ink">
                    {task.description?.trim() || 'Chưa có mô tả cho công việc này.'}
                  </p>
                  <dl className="mt-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                    <div>
                      <dt className="text-ink-muted">Bắt đầu dự kiến:</dt>
                      <dd className="font-semibold text-ink">{dateTimeLabel(task.startAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-muted">Hạn hoàn thành:</dt>
                      <dd className="font-semibold text-ink">{dateTimeLabel(task.dueAt)}</dd>
                    </div>
                    {task.parentTaskId && (
                      <div className="sm:col-span-2">
                        <dt className="text-ink-muted">Thuộc công việc cha:</dt>
                        <dd>
                          <Link className="font-semibold text-primary underline" to={`${routeBase}/tasks/${task.parentTaskId}`}>
                            {allTasks.find(item => item.id === task.parentTaskId)?.title ?? 'Xem công việc cha'}
                          </Link>
                        </dd>
                      </div>
                    )}
                  </dl>
                </section>

                {/* Assignees */}
                <section className="rounded-lg border border-hairline bg-card p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-ink-muted">Người phụ trách</h3>
                    {canAssign && (
                      <button
                        type="button"
                        className="ex-text-button text-xs font-semibold text-primary"
                        disabled={mutation.busy}
                        onClick={() => {
                          mutation.clear()
                          setEditing('assignees')
                        }}
                      >
                        Phân công
                      </button>
                    )}
                  </div>
                  {editing === 'assignees' ? (
                    <AssigneeEditor
                      key={task.updatedAt}
                      task={task}
                      candidates={candidates}
                      busy={mutation.busy}
                      onCancel={() => setEditing(null)}
                      onSubmit={ids => mutation.run(() => services.task.setTaskAssignees(task.id, ids, task.concurrencyToken), saved)}
                    />
                  ) : (
                    <p className="text-sm text-ink">
                      {task.assignees.map(person => person.userFullName).join(', ') || 'Chưa phân công người phụ trách.'}
                    </p>
                  )}
                  {!team && editing === 'assignees' && (
                    <ExState message={teamLoadError ?? 'Chưa tải được danh sách thành viên nhóm.'} retry={retryTeam} />
                  )}
                </section>

                {/* Dependencies */}
                <section className="rounded-lg border border-hairline bg-card p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wide text-ink-muted">Công việc liên quan</h3>
                    </div>
                    {canManageDependencies && (
                      <button
                        type="button"
                        className="ex-text-button text-xs font-semibold text-primary"
                        disabled={mutation.busy}
                        onClick={() => {
                          mutation.clear()
                          setEditing('dependency')
                        }}
                      >
                        Thêm liên kết
                      </button>
                    )}
                  </div>
                  {task.dependencies.length ? (
                    <ul className="space-y-2 text-sm">
                      {task.dependencies.map(dependency => (
                        <li key={dependency.id} className="flex items-center justify-between rounded border border-hairline bg-slate-50 p-2">
                          <div>
                            <Link className="font-semibold text-primary underline" to={`${routeBase}/tasks/${dependency.dependsOnTaskId}`}>
                              {allTasks.find(item => item.id === dependency.dependsOnTaskId)?.title ?? 'Xem việc liên quan'}
                            </Link>
                            <span className="ml-2 text-xs text-ink-muted">
                              ({dependencyLabels[dependency.dependencyType] ?? 'Liên kết'})
                            </span>
                          </div>
                          {canManageDependencies && (
                            <button
                              type="button"
                              className="ex-text-button text-xs text-danger"
                              disabled={mutation.busy}
                              onClick={() => void mutation.run(() => services.task.removeTaskDependency(task.id, dependency.dependsOnTaskId, task.concurrencyToken), reload)}
                            >
                              Bỏ
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-ink-muted">Chưa có liên kết với công việc khác.</p>
                  )}
                  {editing === 'dependency' && (
                    <DependencyEditor
                      tasks={allTasks.filter(item => item.id !== task.id && !task.dependencies.some(d => d.dependsOnTaskId === item.id))}
                      busy={mutation.busy}
                      onCancel={() => setEditing(null)}
                      onSubmit={(dependsOnTaskId, dependencyType) => mutation.run(() => services.task.addTaskDependency({ taskId: task.id, dependsOnTaskId, dependencyType, concurrencyToken: task.concurrencyToken }), saved)}
                    />
                  )}
                </section>

                {/* Status Update / Action Verdict */}
                <section className="rounded-lg border border-hairline bg-card p-4">
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-muted">Cập nhật tiến độ</h3>
                  {canUpdateStatus ? (
                    <StatusEditor
                      key={task.status}
                      task={task}
                      busy={mutation.busy}
                      onSubmit={(newStatus, reason) => mutation.run(
                        () => services.task.updateTaskStatus(task.id, { newStatus, reason: reason.trim() || null, concurrencyToken: task.concurrencyToken }),
                        reload,
                        'Đã cập nhật trạng thái.'
                      )}
                    />
                  ) : (
                    <p className="text-xs text-ink-muted">
                      Người phụ trách, trưởng nhóm và GVHD có thể cập nhật trạng thái công việc.
                    </p>
                  )}
                </section>

                {/* Deletion if eligible */}
                {mayDelete && (
                  <div className="pt-2">
                    <button
                      type="button"
                      className="ex-text-button text-xs text-danger"
                      onClick={() => setDeleting(true)}
                    >
                      Xóa công việc
                    </button>
                    {deleting && (
                      <ExConfirm
                        title="Xóa công việc này?"
                        description="Chỉ công việc chưa có phân công, liên kết hoặc lịch sử mới được xóa."
                        busy={mutation.busy}
                        onCancel={() => setDeleting(false)}
                        onConfirm={() => void mutation.run(
                          () => services.task.deleteTask(task.id, task.concurrencyToken),
                          () => {
                            onClose()
                            onTaskUpdated?.()
                          },
                          'Đã xóa công việc.'
                        )}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Evidence, Comments, History, Discipline */}
              <div className="space-y-4 lg:col-span-5">
                {/* Secondary Tab Bar */}
                <div className="flex border-b border-hairline" role="tablist" aria-label="Nội dung chi tiết phụ">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'evidence'}
                    onClick={() => setActiveTab('evidence')}
                    className={`border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
                      activeTab === 'evidence'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-ink-muted hover:text-ink'
                    }`}
                  >
                    Minh chứng &amp; Bình luận
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'history'}
                    onClick={() => setActiveTab('history')}
                    className={`border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
                      activeTab === 'history'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-ink-muted hover:text-ink'
                    }`}
                  >
                    Lịch sử ({history.length})
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'discipline'}
                    onClick={() => setActiveTab('discipline')}
                    className={`border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
                      activeTab === 'discipline'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-ink-muted hover:text-ink'
                    }`}
                  >
                    Chuyên ngành
                  </button>
                </div>

                {/* Tab 1: Evidence & Comments */}
                {activeTab === 'evidence' && (
                  <TaskEvidenceAndComments
                    taskId={task.id}
                    projectId={project.id}
                    majors={project.majors ?? []}
                    mentorMajorId={access.actor === 'mentor' ? access.supervisor?.majorId ?? null : null}
                    canAddEvidence={canAddEvidence}
                  />
                )}

                {/* Tab 2: History */}
                {activeTab === 'history' && (
                  <section className="rounded-lg border border-hairline bg-card p-4">
                    <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-muted">Lịch sử thay đổi</h3>
                    {historyLoading ? (
                      <ExState loading />
                    ) : historyError ? (
                      <ExState message={historyError} retry={reload} />
                    ) : history.length ? (
                      <ol className="ex-history max-h-80 overflow-y-auto space-y-2 text-xs">
                        {[...history]
                          .sort((a, b) => utcTimestamp(b.changedAt) - utcTimestamp(a.changedAt) || b.id - a.id)
                          .map(item => (
                            <li key={item.id} className="border-b border-hairline pb-2">
                              <strong>{item.oldStatus ? taskStatusLabel(item.oldStatus) : 'Tạo'} → {taskStatusLabel(item.newStatus)}</strong>
                              <time className="block text-ink-muted">{dateTimeLabel(item.changedAt)} · {item.changedByFullName}</time>
                              {item.reason && <p className="mt-1 text-ink-soft">{item.reason}</p>}
                            </li>
                          ))}
                      </ol>
                    ) : (
                      <p className="text-xs text-ink-muted">Chưa có thay đổi trạng thái.</p>
                    )}
                  </section>
                )}

                {/* Tab 3: Discipline */}
                {activeTab === 'discipline' && (
                  <TaskDisciplinePanel
                    taskId={task.id}
                    majors={project.majors}
                    canManage={canManageDisciplines}
                  />
                )}
              </div>
            </div>
          </>
        ) : null}

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between border-t border-hairline pt-4">
          <Link
            to={`${routeBase}/tasks/${taskId}`}
            className="inline-flex min-h-10 items-center text-sm font-semibold text-primary underline"
          >
            Mở trang chi tiết đầy đủ →
          </Link>
          <button
            type="button"
            className="app-modal__button app-modal__button--primary"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  )
}
