import { useEffect, useState } from 'react'
import { env } from '../../../../app/config/env'
import * as meetingsApi from '../../../../services/api/meetings.api'
import * as milestonesApi from '../../../../services/api/milestones.api'
import * as tasksApi from '../../../../services/api/tasks.api'
import type { MilestoneDto } from '../../../../types/backend'
import type { MeetingDetail } from '../../meeting-types'
import type { MeetingAiActionItem } from './meeting-video-ai.types'
import { MeetingAiCopilotPanel } from './MeetingAiCopilotPanel'
import './meeting-video-ai.css'

export function MeetingAiDetailSection({
  meeting,
  canManage,
  isSupervisor,
  currentUserId,
  teamMemberUserIds,
  onApplyMinutesToNotes,
  onApplySupervisorFeedback,
  onMeetingChanged,
}: {
  meeting: MeetingDetail
  canManage: boolean
  isSupervisor: boolean
  currentUserId: number | null
  teamMemberUserIds: number[]
  onApplyMinutesToNotes?: (minutes: string) => void
  onApplySupervisorFeedback?: (draft: string) => void
  onMeetingChanged: () => void
}) {
  const isInAppVideo = env.videoMeetingEnabled && meeting.videoChannel === 'IN_APP_VIDEO'
  const showFeature = env.meetingAiEnabled

  const [expanded, setExpanded] = useState(isInAppVideo)
  const [milestones, setMilestones] = useState<MilestoneDto[]>([])

  useEffect(() => {
    if (!showFeature || !expanded || !canManage) return
    const controller = new AbortController()
    milestonesApi
      .getProjectMilestones(meeting.projectId, controller.signal)
      .then((list) => {
        if (!controller.signal.aborted) setMilestones(list)
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [showFeature, expanded, canManage, meeting.projectId])

  if (!showFeature) return null

  async function handleApplyDecision(content: string) {
    if (!meeting.concurrencyToken) throw new Error('Thiếu token phiên bản cuộc họp. Hãy tải lại trang.')
    await meetingsApi.createMeetingDecision(meeting.id, content, meeting.concurrencyToken)
    onMeetingChanged()
  }

  async function handleCreateActionItem(item: MeetingAiActionItem, milestoneId: number | null) {
    if (!meeting.concurrencyToken) throw new Error('Thiếu token phiên bản cuộc họp. Hãy tải lại trang.')
    const dueAt =
      item.dueAt && new Date(item.dueAt).getTime() > Date.now()
        ? item.dueAt
        : null

    let description = item.description?.trim() || ''
    if (milestoneId && canManage) {
      const meetingRef = `Nguồn: Trợ lý AI Cuộc họp #${meeting.id}: ${meeting.title}`
      const taskDesc = description ? `${description}\n\n${meetingRef}` : meetingRef
      const assignees =
        item.assigneeUserId && teamMemberUserIds.includes(item.assigneeUserId)
          ? [item.assigneeUserId]
          : []
      const createdTask = await tasksApi.createTask({
        milestoneId,
        title: item.title,
        description: taskDesc,
        priority: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(item.priority)
          ? item.priority
          : 'MEDIUM',
        dueAt,
        assigneeUserIds: assignees,
      })
      description = `[Task #${createdTask.id}] ${description}`.trim()
    }

    await meetingsApi.createMeetingActionItem(meeting.id, {
      title: item.title,
      description: description || null,
      assigneeUserId: item.assigneeUserId,
      dueAt,
      status: 'OPEN',
      concurrencyToken: meeting.concurrencyToken,
    })
    onMeetingChanged()
  }

  return (
    <section
      className="mtg-panel mtg-padded mtg-ai-detail-section"
      aria-labelledby="meeting-ai-detail-title"
    >
      <div className="mtg-section-heading">
        <div>
          <p className="mtg-eyebrow">TRỢ LÝ AI CUỘC HỌP</p>
          <h2 id="meeting-ai-detail-title">Bản ghi lời nói, Tóm tắt & Phân tích AI</h2>
        </div>
        <button
          type="button"
          className="mtg-button mtg-button--secondary"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Thu gọn bảng AI' : 'Mở Trợ lý AI cuộc họp'}
        </button>
      </div>

      {!expanded ? (
        <p className="mtg-help">
          Xem lại toàn bộ nội dung người nói trong phòng họp video, tạo biên bản AI, trích xuất đầu việc/kết luận, hỏi đáp trực tiếp và đối chiếu với tiến độ Task đồ án.
        </p>
      ) : (
        <MeetingAiCopilotPanel
          meeting={meeting}
          variant="detail"
          canManage={canManage}
          isSupervisor={isSupervisor}
          currentUserId={currentUserId}
          milestones={milestones.map((m) => ({ id: m.id, title: m.title }))}
          onApplyMinutesToNotes={onApplyMinutesToNotes}
          onApplyDecision={handleApplyDecision}
          onCreateActionItem={handleCreateActionItem}
          onApplySupervisorFeedback={onApplySupervisorFeedback}
        />
      )}
    </section>
  )
}
