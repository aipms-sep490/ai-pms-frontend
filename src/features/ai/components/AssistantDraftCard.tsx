import { useState } from 'react'
import type { AssistantDraft } from '../academic-ai-api'
import { formatMeetingTime } from '../../meetings/meeting-utils'
import { AssistantProjectSetupCard, AssistantRubricSetupCard } from './AssistantSetupPlanCard'
import { AssistantReviewGateSetupCard } from './AssistantReviewGateSetupCard'
import { createTask } from '../../../services/api/tasks.api'
import { getProjectMilestones } from '../../../services/api/milestones.api'
import type { MilestoneDto } from '../../../types/backend'

export function AssistantDraftCard({
  draft,
  projectId,
  runId,
  canApplyProjectSetup = false,
  canApplyRubricSetup = false,
  academicSemesterId,
  onUse,
  onNavigateTarget,
  onOpenRubrics,
}: {
  draft: AssistantDraft
  projectId?: number
  runId?: number | null
  canApplyProjectSetup?: boolean
  canApplyRubricSetup?: boolean
  academicSemesterId?: number
  onUse?: (draft: AssistantDraft) => void
  onNavigateTarget?: (target: string, resourceId?: number | null) => void
  onOpenRubrics?: () => void
}) {
  const [title, setTitle] = useState(draft.title)
  const [description, setDescription] = useState(draft.description)
  const [quickOpen, setQuickOpen] = useState(false)
  const [milestones, setMilestones] = useState<MilestoneDto[]>([])
  const [milestoneId, setMilestoneId] = useState<number | ''>('')
  const [loadingMs, setLoadingMs] = useState(false)
  const [creatingTask, setCreatingTask] = useState(false)
  const [quickError, setQuickError] = useState('')
  const [createdTaskId, setCreatedTaskId] = useState<number | null>(null)

  if (draft.kind === 'PROJECT_SETUP' && draft.setupPlan) {
    return (
      <AssistantProjectSetupCard
        projectId={projectId}
        runId={runId}
        plan={draft.setupPlan}
        canApply={canApplyProjectSetup}
        onNavigateTarget={onNavigateTarget}
      />
    )
  }

  if (draft.kind === 'RUBRIC_SETUP' && draft.rubricSetup) {
    return (
      <AssistantRubricSetupCard
        runId={runId}
        plan={draft.rubricSetup}
        canApply={canApplyRubricSetup}
        academicSemesterId={academicSemesterId}
        onOpenRubrics={onOpenRubrics}
      />
    )
  }

  if (draft.kind === 'REVIEW_GATE_SETUP' && draft.reviewGateSetup) {
    return (
      <AssistantReviewGateSetupCard
        runId={runId}
        plan={draft.reviewGateSetup}
        canApply={canApplyRubricSetup}
      />
    )
  }

  if (draft.kind === 'WORK_PLAN') {
    return (
      <section className="assistant-draft" aria-label="Kế hoạch công việc đề xuất">
        <h3>Kế hoạch công việc đề xuất</h3>
        <p>Kiểm tra và lưu từng công việc tại biểu mẫu hoặc tạo nhanh theo mốc. Chưa có công việc nào được tự động tạo.</p>
        {draft.tasks?.filter(task => task.kind === 'TASK').slice(0, 8).map((task, index) => (
          <AssistantDraftCard
            key={index}
            draft={task}
            projectId={projectId}
            onUse={onUse}
            onNavigateTarget={onNavigateTarget}
          />
        ))}
        {!draft.tasks?.length && (
          <p>Chưa có đầu việc cụ thể để điền vào biểu mẫu. Hãy yêu cầu AI tách kế hoạch thành các công việc.</p>
        )}
      </section>
    )
  }

  const openQuickCreate = async () => {
    if (!projectId) return
    setQuickOpen(true)
    setQuickError('')
    if (milestones.length > 0) return
    setLoadingMs(true)
    try {
      const list = await getProjectMilestones(projectId)
      setMilestones(list)
      const hint = draft.task?.milestoneTitle?.trim().toLowerCase()
      const matched = hint ? list.find(m => m.title.toLowerCase().includes(hint)) : undefined
      const fallback = list.find(m => m.status !== 'COMPLETED') ?? list[0]
      setMilestoneId((matched ?? fallback)?.id ?? '')
    } catch {
      setQuickError('Chưa tải được danh sách mốc tiến độ. Bạn vẫn có thể mở biểu mẫu đầy đủ.')
    } finally {
      setLoadingMs(false)
    }
  }

  const submitQuickTask = async () => {
    if (!title.trim() || !milestoneId || creatingTask) return
    setCreatingTask(true)
    setQuickError('')
    try {
      const created = await createTask({
        milestoneId: Number(milestoneId),
        title: title.trim(),
        description: description.trim() || null,
        priority: draft.task?.priority || 'MEDIUM',
        dueAt: draft.task?.dueAt ?? null,
        assigneeUserIds: [],
      })
      setCreatedTaskId(created.id)
      setQuickOpen(false)
    } catch {
      setQuickError('Chưa tạo được công việc trực tiếp (có thể cần bổ sung thông tin chuyên ngành hoặc phân công). Hãy dùng nút Mở biểu mẫu.')
    } finally {
      setCreatingTask(false)
    }
  }

  const labels: Record<string, string> = { TASK: 'công việc', MEETING: 'lịch họp', WEEKLY_REPORT: 'báo cáo tuần', MEETING_MINUTES: 'biên bản họp' }
  const canQuickCreateTask = draft.kind === 'TASK' && Boolean(projectId && onUse)

  return (
    <fieldset className="assistant-draft">
      <legend>Bản nháp {labels[draft.kind] ?? 'nội dung'}</legend>
      <label>Tiêu đề<input value={title} maxLength={255} onChange={event => setTitle(event.target.value)} /></label>
      <label>Nội dung<textarea value={description} maxLength={4000} rows={4} onChange={event => setDescription(event.target.value)} /></label>
      {draft.kind === 'TASK' && draft.task && (
        <div className="assistant-tool-help">
          {draft.task.dueAt && <p>Hạn: {formatMeetingTime(draft.task.dueAt)} (giờ Việt Nam)</p>}
          {draft.task.milestoneTitle && <p>Mốc: {draft.task.milestoneTitle}</p>}
          {!!draft.task.assigneeNames?.length && <p>Phụ trách: {draft.task.assigneeNames.join(', ')}</p>}
          {draft.task.primaryMajorName && <p>Ngành: {draft.task.primaryMajorName}</p>}
        </div>
      )}
      {draft.kind === 'WEEKLY_REPORT' && draft.report && (
        <div className="assistant-tool-help">
          {Object.entries({ completedWork: 'Đã hoàn thành', inProgressWork: 'Đang thực hiện', blockers: 'Vướng mắc', risks: 'Rủi ro', nextActions: 'Bước tiếp theo', plannedWork: 'Kế hoạch' }).map(([key, label]) =>
            draft.report?.[key as keyof typeof draft.report]
              ? <p key={key}><strong>{label}:</strong> {draft.report[key as keyof typeof draft.report]}</p>
              : null,
          )}
        </div>
      )}
      {draft.kind === 'MEETING' && draft.meeting && (
        <div className="assistant-tool-help">
          {draft.meeting.startAt && <p>Bắt đầu: {formatMeetingTime(draft.meeting.startAt)} (giờ Việt Nam)</p>}
          {draft.meeting.endAt && <p>Kết thúc: {formatMeetingTime(draft.meeting.endAt)}</p>}
          {draft.meeting.meetingDeliveryMode && <p>Hình thức: {({ ONSITE: 'Tại chỗ', REMOTE: 'Từ xa', HYBRID: 'Kết hợp' })[draft.meeting.meetingDeliveryMode]}</p>}
          {draft.meeting.videoChannel === 'IN_APP_VIDEO' && <p>Kênh đề xuất: Video trong PMS (có thể đổi tại biểu mẫu).</p>}
          {draft.meeting.inviteAll && <p>Chọn sẵn tất cả thành viên và giảng viên trong danh sách được phép mời của đồ án.</p>}
        </div>
      )}

      {createdTaskId ? (
        <div className="assistant-draft-created" role="status">
          <span className="material-symbols-outlined" aria-hidden="true">task_alt</span>
          <span>Đã tạo công việc mới vào đồ án!</span>
          {onNavigateTarget && (
            <button type="button" className="assistant-draft-jump" onClick={() => onNavigateTarget('tasks', createdTaskId)}>
              Mở công việc
            </button>
          )}
        </div>
      ) : (
        <>
          <p>Chưa lưu hoặc gửi dữ liệu. Thông tin đã xác định sẽ được điền sẵn; kiểm tra và bổ sung mục còn thiếu trước khi lưu.</p>
          {quickOpen && canQuickCreateTask && (
            <div className="assistant-quick-task-box">
              <label>
                Chọn mốc tiến độ
                <select
                  aria-label="Mốc tiến độ tạo công việc"
                  value={milestoneId}
                  disabled={loadingMs || creatingTask}
                  onChange={e => setMilestoneId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">{loadingMs ? 'Đang tải mốc…' : '— Chọn mốc tiến độ —'}</option>
                  {milestones.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                </select>
              </label>
              {quickError && <p role="alert" className="assistant-draft-error">{quickError}</p>}
              <div className="assistant-draft-actions">
                <button type="button" disabled={!title.trim() || !milestoneId || creatingTask} onClick={() => void submitQuickTask()}>
                  {creatingTask ? 'Đang tạo…' : 'Xác nhận tạo công việc'}
                </button>
                <button type="button" className="is-secondary" disabled={creatingTask} onClick={() => setQuickOpen(false)}>Hủy</button>
              </div>
            </div>
          )}
          <div className="assistant-draft-actions">
            {onUse && (
              <button type="button" disabled={!title.trim()} onClick={() => onUse({ ...draft, title: title.trim(), description })}>
                Dùng bản nháp · mở biểu mẫu
              </button>
            )}
            {canQuickCreateTask && !quickOpen && (
              <button type="button" className="is-secondary" disabled={!title.trim()} onClick={() => void openQuickCreate()}>
                Tạo nhanh tại đây
              </button>
            )}
          </div>
          {!onUse && <p>Mở trợ lý từ trang đồ án của sinh viên hoặc GVHD để chuyển bản nháp sang biểu mẫu.</p>}
        </>
      )}
    </fieldset>
  )
}
