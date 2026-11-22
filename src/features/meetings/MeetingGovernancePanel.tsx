import { useContext, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { displayLabel } from '../../components/ui/display-label'
import * as api from '../../services/api/meetings.api'
import * as tasksApi from '../../services/api/tasks.api'
import * as milestonesApi from '../../services/api/milestones.api'
import { ExecutionAccessContext } from '../execution/context/ExecutionAccessContext'
import type { MilestoneDto, TaskDto } from '../../types/backend'
import type { MeetingActionItem, MeetingCandidate, MeetingDecision, MeetingDetail } from './meeting-types'
import {
  displayDescription,
  extractTaskId,
  formatMeetingTime,
  isPastVietnamDateTime,
  meetingError,
  toMeetingInput,
  toMeetingUtc,
} from './meeting-utils'
import { taskStatusTone } from '../tasks/pages/TaskDetailPage'
import { taskStatusLabel } from '../projects/utils/collaboration-workspace'

const actionLabels: Record<string, string> = {
  OPEN: 'Mở',
  IN_PROGRESS: 'Đang thực hiện',
  DONE: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
}

export function MeetingGovernancePanel({ meeting, concurrencyToken, candidates, canManage, disabled, onChanged }: {
  meeting: MeetingDetail; concurrencyToken: string; candidates: MeetingCandidate[]; canManage: boolean; disabled: boolean; onChanged: () => void
}) {
  const access = useContext(ExecutionAccessContext)
  const routeBase = access?.routeBase ?? `/projects/${meeting.projectId}`
  const canCreateTask = access
    ? !access.readOnly && (access.actor === 'supervisor' || access.canManageStructure)
    : canManage
  const teamMembers = access?.team?.members ?? []

  const [decisions, setDecisions] = useState<MeetingDecision[]>([])
  const [actions, setActions] = useState<MeetingActionItem[]>([])
  const [milestones, setMilestones] = useState<MilestoneDto[]>([])
  const [tasksMap, setTasksMap] = useState<Record<number, TaskDto>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [awaitingRefresh, setAwaitingRefresh] = useState(false)
  const [decision, setDecision] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeUserId, setAssigneeUserId] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [dueAtError, setDueAtError] = useState('')
  const [createTaskOnSubmit, setCreateTaskOnSubmit] = useState(true)
  const [selectedMilestoneId, setSelectedMilestoneId] = useState('')
  const [selectedPriority, setSelectedPriority] = useState('MEDIUM')
  const [linkingActionId, setLinkingActionId] = useState<number | null>(null)
  const [linkMilestoneId, setLinkMilestoneId] = useState('')
  const [linkPriority, setLinkPriority] = useState('MEDIUM')
  const [decisionOpen, setDecisionOpen] = useState(false)
  const [actionOpen, setActionOpen] = useState(false)

  const [currentMinDueAt] = useState(() => toMeetingInput(new Date().toISOString()))

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(''); setNotice(''); setAwaitingRefresh(false)
    Promise.all([
      api.getMeetingDecisions(meeting.id, controller.signal),
      api.getMeetingActionItems(meeting.id, controller.signal),
      milestonesApi.getProjectMilestones(meeting.projectId, controller.signal).catch(() => []),
    ])
      .then(([decisionPage, actionPage, milestoneList]) => {
        if (!controller.signal.aborted) {
          setDecisions(decisionPage.items)
          setActions(actionPage.items)
          setMilestones(milestoneList)
          if (milestoneList.length > 0) {
            setSelectedMilestoneId(String(milestoneList[0].id))
            setLinkMilestoneId(String(milestoneList[0].id))
          } else {
            setCreateTaskOnSubmit(false)
          }

          // Fetch linked tasks
          const taskIds = Array.from(new Set(
            actionPage.items
              .map(a => extractTaskId(a.description))
              .filter((id): id is number => id !== null)
          ))
          if (taskIds.length > 0) {
            Promise.all(taskIds.map(id => tasksApi.getTask(id).catch(() => null)))
              .then(taskList => {
                if (!controller.signal.aborted) {
                  const map: Record<number, TaskDto> = {}
                  taskList.forEach(t => { if (t) map[t.id] = t })
                  setTasksMap(current => ({ ...current, ...map }))
                }
              })
          }
        }
      })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(meetingError(reason)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [meeting.id, meeting.projectId, meeting.concurrencyToken])

  function isAssigneeTeamMember(userId: number | null): boolean {
    if (!userId) return false
    if (teamMembers.length > 0) {
      return teamMembers.some(m => m.userId === userId)
    }
    const candidate = candidates.find(c => c.userId === userId)
    if (!candidate) return true
    const roleLower = candidate.role.toLowerCase()
    return !roleLower.includes('giảng viên') && !roleLower.includes('supervisor') && !roleLower.includes('gvhd')
  }

  async function run(operation: () => Promise<void>, success: string) {
    if (busy || disabled || awaitingRefresh) return
    setBusy(true); setError(''); setNotice('')
    try { await operation(); setNotice(success); setAwaitingRefresh(true); onChanged() }
    catch (reason) { setError(meetingError(reason)) }
    finally { setBusy(false) }
  }

  function saveDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = decision.trim()
    if (!content) return
    void run(async () => {
      const created = await api.createMeetingDecision(meeting.id, content, concurrencyToken)
      setDecisions(current => [created, ...current])
      setDecision('')
    }, 'Đã ghi nhận kết luận. Dữ liệu cuộc họp đang được tải lại.')
  }

  function handleDueAtChange(val: string) {
    setDueAt(val)
    if (val && isPastVietnamDateTime(val)) {
      setDueAtError('Hạn hoàn thành phải lớn hơn thời điểm hiện tại. Vui lòng chọn ngày và giờ trong tương lai.')
    } else {
      setDueAtError('')
    }
  }

  function saveAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle) return

    if (dueAt && isPastVietnamDateTime(dueAt)) {
      setDueAtError('Hạn hoàn thành phải lớn hơn thời điểm hiện tại. Vui lòng chọn ngày và giờ trong tương lai.')
      return
    }

    const cleanDesc = description.trim()
    const dueAtUtc = dueAt ? toMeetingUtc(dueAt) : null

    void run(async () => {
      let finalDescription = cleanDesc
      let createdTask: TaskDto | null = null

      if (canCreateTask && createTaskOnSubmit && selectedMilestoneId) {
        const meetingRef = `Nguồn: Cuộc họp #${meeting.id}: ${meeting.title}`
        const taskDesc = cleanDesc ? `${cleanDesc}\n\n${meetingRef}` : meetingRef

        const assigneeIdNum = assigneeUserId ? Number(assigneeUserId) : null
        const taskAssignees = (assigneeIdNum && isAssigneeTeamMember(assigneeIdNum)) ? [assigneeIdNum] : []

        createdTask = await tasksApi.createTask({
          milestoneId: Number(selectedMilestoneId),
          title: cleanTitle,
          description: taskDesc,
          priority: selectedPriority || 'MEDIUM',
          dueAt: dueAtUtc,
          assigneeUserIds: taskAssignees,
        })

        finalDescription = `[Task #${createdTask.id}] ${cleanDesc}`.trim()
      }

      const createdAction = await api.createMeetingActionItem(meeting.id, {
        title: cleanTitle,
        description: finalDescription || null,
        assigneeUserId: assigneeUserId ? Number(assigneeUserId) : null,
        dueAt: dueAtUtc,
        status: 'OPEN',
        concurrencyToken,
      })

      if (createdTask) {
        setTasksMap(current => ({ ...current, [createdTask.id]: createdTask }))
      }

      setActions(current => [createdAction, ...current])
      setTitle('')
      setDescription('')
      setAssigneeUserId('')
      setDueAt('')
      setDueAtError('')
    }, 'Đã tạo công việc sau họp. Dữ liệu cuộc họp đang được tải lại.')
  }

  function handleCreateTaskForAction(item: MeetingActionItem) {
    if (!linkMilestoneId) return
    const cleanDesc = displayDescription(item.description)
    const meetingRef = `Nguồn: Cuộc họp #${meeting.id}: ${meeting.title}`
    const taskDesc = cleanDesc ? `${cleanDesc}\n\n${meetingRef}` : meetingRef

    const assigneeIdNum = item.assigneeUserId
    const taskAssignees = (assigneeIdNum && isAssigneeTeamMember(assigneeIdNum)) ? [assigneeIdNum] : []

    void run(async () => {
      const createdTask = await tasksApi.createTask({
        milestoneId: Number(linkMilestoneId),
        title: item.title,
        description: taskDesc,
        priority: linkPriority || 'MEDIUM',
        dueAt: item.dueAt,
        assigneeUserIds: taskAssignees,
      })

      const updatedDesc = `[Task #${createdTask.id}] ${cleanDesc}`.trim()
      const updated = await api.updateMeetingActionItem(meeting.id, item.id, {
        title: item.title,
        description: updatedDesc,
        assigneeUserId: item.assigneeUserId,
        dueAt: item.dueAt,
        status: item.status as import('./meeting-types').MeetingActionStatus,
        concurrencyToken: item.concurrencyToken,
      })

      setTasksMap(current => ({ ...current, [createdTask.id]: createdTask }))
      setActions(current => current.map(action => action.id === updated.id ? updated : action))
      setLinkingActionId(null)
    }, 'Đã tạo Task liên kết thành công.')
  }

  function updateStatus(item: MeetingActionItem, status: string) {
    if (status === item.status) return
    void run(async () => {
      const updated = await api.updateMeetingActionItem(meeting.id, item.id, {
        title: item.title,
        description: item.description,
        assigneeUserId: item.assigneeUserId,
        dueAt: item.dueAt,
        status: status as import('./meeting-types').MeetingActionStatus,
        concurrencyToken: item.concurrencyToken,
      })
      setActions(current => current.map(action => action.id === updated.id ? updated : action))
    }, 'Đã cập nhật trạng thái công việc. Dữ liệu cuộc họp đang được tải lại.')
  }

  const mayRecordDecision = canManage && meeting.status === 'COMPLETED'
  const mayManageActions = canManage && meeting.status !== 'CANCELLED'
  const controlsDisabled = disabled || busy || awaitingRefresh
  const isSubmitDisabled = controlsDisabled || !title.trim() || Boolean(dueAtError) || (canCreateTask && createTaskOnSubmit && !selectedMilestoneId && milestones.length > 0)

  return (
    <section className="mtg-panel mtg-padded" aria-labelledby="meeting-governance-title">
      <div className="mtg-section-heading">
        <div>
          <h2 id="meeting-governance-title">Kết luận và công việc sau họp</h2>
          <p className="mtg-help">Ghi kết luận sau khi cuộc họp hoàn tất để cả nhóm theo dõi bước tiếp theo.</p>
        </div>
      </div>
      {loading && <p role="status" className="mtg-help">Đang tải kết luận và công việc…</p>}
      {error && (
        <div className="mtg-notice mtg-notice--error" role="alert">
          <p>{error}</p>
          <button className="mtg-text-button" onClick={onChanged}>Tải lại dữ liệu cuộc họp</button>
        </div>
      )}
      {notice && <p className="mtg-notice mtg-notice--success" role="status">{notice}</p>}

      {!loading && (
        <div className="mtg-stack mtg-governance-sections">
          {/* Decisions Section */}
          <div>
            <div className="mtg-section-heading">
              <h3 className="mtg-subheading">
                Kết luận <span className="mtg-count">{decisions.length}</span>
              </h3>
              {mayRecordDecision && (
                <button
                  type="button"
                  className="mtg-text-button"
                  disabled={controlsDisabled}
                  aria-expanded={decisionOpen}
                  onClick={() => setDecisionOpen(value => !value)}
                >
                  {decisionOpen ? 'Đóng nhập kết luận' : 'Ghi kết luận'}
                </button>
              )}
            </div>
            {decisions.length ? (
              <ol className="mtg-feedback-list">
                {decisions.map(item => (
                  <li key={item.id}>
                    <time dateTime={item.decidedAt}>{formatMeetingTime(item.decidedAt)}{item.decidedByName ? ` · ${item.decidedByName}` : ''}</time>
                    <p className="mtg-prose">{item.content}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mtg-help">Chưa có kết luận được ghi nhận.</p>
            )}
            {mayRecordDecision && decisionOpen && (
              <form className="mtg-form" onSubmit={saveDecision}>
                <label>
                  Kết luận mới
                  <textarea
                    rows={3}
                    maxLength={4000}
                    required
                    value={decision}
                    disabled={controlsDisabled}
                    onChange={event => setDecision(event.target.value)}
                  />
                </label>
                <button
                  className="mtg-button mtg-button--secondary"
                  disabled={controlsDisabled || !decision.trim()}
                  type="submit"
                >
                  {busy ? 'Đang lưu…' : 'Lưu kết luận'}
                </button>
              </form>
            )}
          </div>

          {/* Action Items Section */}
          <div>
            <div className="mtg-section-heading">
              <h3 className="mtg-subheading">
                Công việc sau họp <span className="mtg-count">{actions.length}</span>
              </h3>
              {mayManageActions && (
                <button
                  type="button"
                  className="mtg-text-button"
                  disabled={controlsDisabled}
                  aria-expanded={actionOpen}
                  onClick={() => setActionOpen(value => !value)}
                >
                  {actionOpen ? 'Đóng tạo công việc' : 'Thêm công việc'}
                </button>
              )}
            </div>

            {actions.length ? (
              <ul className="mtg-feedback-list">
                {actions.map(item => {
                  const linkedTaskId = extractTaskId(item.description)
                  const linkedTask = linkedTaskId ? tasksMap[linkedTaskId] : null
                  const linkedMilestoneTitle = linkedTask
                    ? milestones.find(m => m.id === linkedTask.milestoneId)?.title ?? null
                    : null
                  const cleanDesc = displayDescription(item.description)
                  const assigneeName = item.assigneeName
                    ?? candidates.find(c => c.userId === item.assigneeUserId)?.fullName
                    ?? meeting.participants.find(p => p.userId === item.assigneeUserId)?.fullName
                    ?? 'Thành viên nhóm'

                  return (
                    <li key={item.id}>
                      <div className="mtg-section-heading">
                        <strong>{item.title}</strong>
                        <label className="mtg-inline-field">
                          Trạng thái
                          <select
                            value={item.status}
                            disabled={controlsDisabled || !mayManageActions || ['DONE', 'CANCELLED'].includes(item.status)}
                            onChange={event => updateStatus(item, event.target.value)}
                          >
                            {Object.entries(actionLabels).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      {cleanDesc && <p className="mtg-prose">{cleanDesc}</p>}
                      <p className="mtg-help">
                        {item.dueAt ? `Hạn: ${formatMeetingTime(item.dueAt)}` : 'Chưa đặt hạn'}
                        {item.assigneeUserId ? ` · Phụ trách: ${assigneeName}` : ' · Chưa giao người phụ trách'}
                      </p>

                      {/* Linked Task Display or Link Task Action */}
                      {linkedTaskId ? (
                        <div className="mtg-linked-task" data-testid={`linked-task-${item.id}`}>
                          <span className="mtg-linked-task-badge inline-flex items-center gap-1">
                            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">task_alt</span>
                            Công việc liên kết{linkedTask?.title && linkedTask.title !== item.title ? `: ${linkedTask.title}` : ''}
                          </span>
                          {linkedTask ? (
                            <>
                              <span className={`mtg-task-status mtg-task-status--${taskStatusTone(linkedTask.status)}`}>
                                {taskStatusLabel(linkedTask.status)}
                              </span>
                              {linkedMilestoneTitle && (
                                <span className="mtg-task-milestone inline-flex items-center gap-1" title="Mốc đồ án">
                                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">flag</span>
                                  {linkedMilestoneTitle}
                                </span>
                              )}
                              {linkedTask.assignees.length > 0 && (
                                <span className="mtg-task-assignee inline-flex items-center gap-1" title="Người phụ trách">
                                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">person</span>
                                  {linkedTask.assignees.map(a => a.userFullName).join(', ')}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="mtg-help">Đang tải thông tin công việc…</span>
                          )}
                          <Link
                            to={`${routeBase}/tasks/${linkedTaskId}`}
                            className="mtg-text-button mtg-task-link"
                          >
                            Mở công việc
                          </Link>
                        </div>
                      ) : (
                        canCreateTask && mayManageActions && !['DONE', 'CANCELLED'].includes(item.status) && (
                          <div className="mtg-action-link-task">
                            {linkingActionId === item.id ? (
                              <div className="mtg-inline-create-task" role="group" aria-label="Tạo Task liên kết">
                                <label>
                                  Mốc đồ án
                                  <select
                                    value={linkMilestoneId}
                                    disabled={controlsDisabled}
                                    onChange={event => setLinkMilestoneId(event.target.value)}
                                  >
                                    {milestones.map(m => (
                                      <option key={m.id} value={m.id}>{m.title}</option>
                                    ))}
                                  </select>
                                </label>
                                <label>
                                  Độ ưu tiên
                                  <select
                                    value={linkPriority}
                                    disabled={controlsDisabled}
                                    onChange={event => setLinkPriority(event.target.value)}
                                  >
                                    <option value="LOW">Thấp</option>
                                    <option value="MEDIUM">Trung bình</option>
                                    <option value="HIGH">Cao</option>
                                    <option value="CRITICAL">Khẩn cấp</option>
                                  </select>
                                </label>
                                <div className="mtg-actions">
                                  <button
                                    type="button"
                                    className="mtg-button mtg-button--secondary mtg-button--small"
                                    disabled={controlsDisabled}
                                    onClick={() => setLinkingActionId(null)}
                                  >
                                    Hủy
                                  </button>
                                  <button
                                    type="button"
                                    className="mtg-button mtg-button--small"
                                    disabled={controlsDisabled || !linkMilestoneId}
                                    onClick={() => void handleCreateTaskForAction(item)}
                                  >
                                    {busy ? 'Đang tạo…' : 'Xác nhận tạo Task'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="mtg-text-button"
                                disabled={controlsDisabled || milestones.length === 0}
                                onClick={() => {
                                  setLinkingActionId(item.id)
                                  if (!linkMilestoneId && milestones.length > 0) {
                                    setLinkMilestoneId(String(milestones[0].id))
                                  }
                                }}
                              >
                                + Tạo Task trên bảng Công việc
                              </button>
                            )}
                          </div>
                        )
                      )}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="mtg-help">Chưa có công việc sau họp.</p>
            )}

            {/* Create Action Item Form */}
            {mayManageActions && actionOpen && (
              <form className="mtg-form" onSubmit={saveAction}>
                <div className="mtg-form-grid">
                  <label>
                    Công việc
                    <input
                      required
                      maxLength={500}
                      value={title}
                      disabled={controlsDisabled}
                      onChange={event => setTitle(event.target.value)}
                      placeholder="Tên công việc sau họp…"
                    />
                  </label>
                  <label>
                    Hạn hoàn thành (giờ Việt Nam)
                    <input
                      type="datetime-local"
                      min={currentMinDueAt}
                      value={dueAt}
                      disabled={controlsDisabled}
                      onChange={event => handleDueAtChange(event.target.value)}
                    />
                    {dueAtError && (
                      <span className="mtg-validation" role="alert">
                        {dueAtError}
                      </span>
                    )}
                  </label>
                  <label className="mtg-full">
                    Người phụ trách
                    <select
                      value={assigneeUserId}
                      disabled={controlsDisabled}
                      onChange={event => setAssigneeUserId(event.target.value)}
                    >
                      <option value="">Chưa phân công</option>
                      {candidates.map(candidate => (
                        <option key={candidate.userId} value={candidate.userId}>
                          {candidate.fullName} · {displayLabel(candidate.role)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="mtg-full">
                    Mô tả
                    <textarea
                      rows={2}
                      maxLength={4000}
                      value={description}
                      disabled={controlsDisabled}
                      onChange={event => setDescription(event.target.value)}
                      placeholder="Mô tả chi tiết công việc…"
                    />
                  </label>

                  {/* Task creation toggle and milestone options */}
                  {canCreateTask && (
                    <div className="mtg-full mtg-task-creation-opts">
                      <label className="mtg-checkbox">
                        <input
                          type="checkbox"
                          checked={createTaskOnSubmit}
                          disabled={controlsDisabled || milestones.length === 0}
                          onChange={event => setCreateTaskOnSubmit(event.target.checked)}
                        />
                        <span>Đồng thời tạo Task trên bảng Công việc</span>
                      </label>

                      {createTaskOnSubmit && (
                        <div className="mtg-field-grid mtg-task-params">
                          <label>
                            Mốc đồ án
                            <select
                              required={createTaskOnSubmit}
                              value={selectedMilestoneId}
                              disabled={controlsDisabled || milestones.length === 0}
                              onChange={event => setSelectedMilestoneId(event.target.value)}
                            >
                              {milestones.length === 0 ? (
                                <option value="">Chưa có mốc đồ án</option>
                              ) : (
                                milestones.map(m => (
                                  <option key={m.id} value={m.id}>
                                    {m.title}
                                  </option>
                                ))
                              )}
                            </select>
                          </label>
                          <label>
                            Độ ưu tiên
                            <select
                              value={selectedPriority}
                              disabled={controlsDisabled}
                              onChange={event => setSelectedPriority(event.target.value)}
                            >
                              <option value="LOW">Thấp</option>
                              <option value="MEDIUM">Trung bình</option>
                              <option value="HIGH">Cao</option>
                              <option value="CRITICAL">Khẩn cấp</option>
                            </select>
                          </label>
                        </div>
                      )}
                      {milestones.length === 0 && (
                        <p className="mtg-help mtg-validation">
                          Đồ án chưa có mốc. Vui lòng tạo mốc trước khi tạo task liên kết.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <button
                  className="mtg-button mtg-button--secondary"
                  disabled={isSubmitDisabled}
                  type="submit"
                >
                  {busy ? 'Đang lưu…' : 'Tạo công việc'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
