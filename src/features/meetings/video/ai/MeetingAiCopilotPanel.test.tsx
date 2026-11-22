import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { MeetingDetail } from '../../meeting-types'

const api = vi.hoisted(() => ({
  getMeetingAiWorkspace: vi.fn(),
  getMeetingAiInsights: vi.fn(),
  appendMeetingTranscript: vi.fn(),
  toggleTranscriptHighlight: vi.fn(),
  deleteTranscriptSegment: vi.fn(),
  generateMeetingAiSummary: vi.fn(),
  askMeetingAi: vi.fn(),
  coachMeetingAi: vi.fn(),
}))

vi.mock('./meeting-video-ai-api', () => api)
import { MeetingAiCopilotPanel } from './MeetingAiCopilotPanel'

const meeting: MeetingDetail = {
  id: 50,
  projectId: 20,
  title: 'Họp tiến độ Sprint 4',
  agenda: '- Kiểm tra tiến độ API\n- Rà soát VNPay',
  meetingNotes: null,
  startAt: '2026-11-22T09:00:00Z',
  endAt: null,
  location: null,
  onlineUrl: null,
  status: 'SCHEDULED',
  createdBy: 1,
  createdByName: 'Nguyễn Minh Khang',
  createdAt: '2026-11-21T09:00:00Z',
  updatedAt: '2026-11-21T09:00:00Z',
  participants: [],
  feedbacks: [],
  videoChannel: 'IN_APP_VIDEO',
  concurrencyToken: 'tok-1',
}

const sampleSegment = {
  id: 101,
  meetingId: 50,
  meetingVideoSessionId: 7,
  speakerUserId: 2,
  speakerName: 'Trần Thu Hà',
  language: 'vi-VN',
  source: 'WEB_SPEECH',
  content: 'Em sẽ hoàn thành tài liệu OpenAPI vào thứ Sáu.',
  isHighlighted: false,
  clientSegmentId: 'seg-1',
  spokenAt: '2026-11-22T09:05:00Z',
  createdBy: 2,
}

const sampleInsight = {
  id: 301,
  meetingId: 50,
  insightType: 'FULL_MINUTES',
  status: 'COMPLETED',
  modelVersion: 'OPENAI_TEST',
  transcriptSegmentCount: 1,
  lastSegmentId: 101,
  executiveSummary: 'Nhóm đã thống nhất tiến độ Sprint 4 và giao tài liệu OpenAPI cho Trần Thu Hà.',
  currentTopic: 'Tài liệu OpenAPI',
  formattedMinutes: '# Biên bản Sprint 4\n- Giao OpenAPI cho Trần Thu Hà.',
  keyTopics: [{ title: 'Tài liệu API', summary: 'Chốt hoàn thiện OpenAPI', speakers: ['Trần Thu Hà'] }],
  decisions: ['Thống nhất giữ nguyên cấu trúc REST API'],
  actionItems: [
    {
      title: 'Hoàn thành tài liệu OpenAPI',
      description: 'Bổ sung đầy đủ schema',
      ownerName: 'Trần Thu Hà',
      assigneeUserId: 2,
      dueAt: '2026-11-28T10:00:00Z',
      priority: 'HIGH',
      evidenceQuote: 'Em sẽ hoàn thành tài liệu OpenAPI vào thứ Sáu.',
      sourceSegmentId: 101,
    },
  ],
  blockersAndRisks: ['Chưa có tài khoản sandbox VNPay'],
  openQuestions: ['Khi nào nhận được tài khoản test?'],
  agendaCoverage: [{ item: 'Kiểm tra tiến độ API', status: 'COVERED', note: 'Đã thảo luận' }],
  speakerInsights: [{ speakerName: 'Trần Thu Hà', userId: 2, summary: 'Chủ động nhận việc', keyContributions: ['Nhận viết OpenAPI'] }],
  suggestedNextQuestions: ['Ai hỗ trợ phần VNPay?'],
  nextMeetingSuggestion: { title: 'Review trước demo', purpose: 'Chạy thử end-to-end', suggestedTimeNote: 'Thứ Sáu 15:00' },
  createdBy: 1,
  createdByName: 'Nguyễn Minh Khang',
  createdAt: '2026-11-22T09:10:00Z',
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('MeetingAiCopilotPanel', () => {
  it('loads transcript, adds manual note, generates full summary, and triggers 1-click bridges', async () => {
    api.getMeetingAiWorkspace.mockResolvedValue({
      meetingId: 50,
      totalSegments: 1,
      lastSegmentId: 101,
      segments: [sampleSegment],
      speakerStats: [{ speakerUserId: 2, speakerName: 'Trần Thu Hà', segmentCount: 1, wordCount: 10, highlightCount: 0, sharePercent: 100 }],
      latestInsight: null,
      aiAvailable: true,
      audioSttConfigured: false,
    })
    api.getMeetingAiInsights.mockResolvedValue([])
    api.appendMeetingTranscript.mockResolvedValue({
      ...sampleSegment,
      id: 102,
      speakerUserId: 1,
      speakerName: 'Nguyễn Minh Khang',
      source: 'MANUAL_NOTE',
      content: 'Chốt demo vào chiều thứ Sáu.',
      isHighlighted: true,
    })
    api.generateMeetingAiSummary.mockResolvedValue(sampleInsight)

    const onApplyMinutes = vi.fn()
    const onCreateAction = vi.fn().mockResolvedValue(undefined)

    render(
      <MeetingAiCopilotPanel
        meeting={meeting}
        variant="room"
        canManage={true}
        currentUserId={1}
        milestones={[{ id: 40, title: 'Mốc 2: Hoàn thiện API' }]}
        onApplyMinutesToNotes={onApplyMinutes}
        onCreateActionItem={onCreateAction}
      />,
    )

    expect(await screen.findByText('Em sẽ hoàn thành tài liệu OpenAPI vào thứ Sáu.')).toBeTruthy()

    // Add manual note
    fireEvent.change(screen.getByLabelText('Ghi nhanh nội dung lời nói'), {
      target: { value: 'Chốt demo vào chiều thứ Sáu.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Ghi' }))
    expect(await screen.findByText('Chốt demo vào chiều thứ Sáu.')).toBeTruthy()

    // Switch to Summary tab & generate full minutes
    fireEvent.click(screen.getByRole('tab', { name: 'Tóm tắt & Biên bản' }))
    fireEvent.click(screen.getByRole('button', { name: /Tạo Biên bản AI/ }))

    expect(await screen.findByText(sampleInsight.executiveSummary)).toBeTruthy()
    expect(screen.getByText('Chưa có tài khoản sandbox VNPay')).toBeTruthy()

    // 1-click apply minutes to notes
    fireEvent.click(screen.getByRole('button', { name: 'Điền vào Biên bản cuộc họp' }))
    expect(onApplyMinutes).toHaveBeenCalledWith(sampleInsight.formattedMinutes)

    // 1-click create action item + linked task
    fireEvent.click(screen.getByRole('button', { name: '+ Lưu việc & tạo Task' }))
    await waitFor(() => expect(onCreateAction).toHaveBeenCalledWith(sampleInsight.actionItems[0], 40))
  })

  it('asks AI with clickable citations and runs Task Audit + Supervisor Feedback Draft coach', async () => {
    api.getMeetingAiWorkspace.mockResolvedValue({
      meetingId: 50,
      totalSegments: 1,
      lastSegmentId: 101,
      segments: [sampleSegment],
      speakerStats: [],
      latestInsight: null,
      aiAvailable: true,
      audioSttConfigured: false,
    })
    api.getMeetingAiInsights.mockResolvedValue([])
    api.askMeetingAi.mockResolvedValue({
      meetingId: 50,
      question: 'Ai làm OpenAPI?',
      answer: 'Trần Thu Hà đã nhận hoàn thành tài liệu OpenAPI.',
      citations: [{ segmentId: 101, speakerName: 'Trần Thu Hà', spokenAt: '2026-11-22T09:05:00Z', excerpt: 'Em sẽ hoàn thành tài liệu OpenAPI' }],
      followUpQuestions: ['Khi nào xong?'],
      status: 'COMPLETED',
      generatedAt: '2026-11-22T09:11:00Z',
    })
    api.coachMeetingAi.mockResolvedValue({
      meetingId: 50,
      mode: 'SUPERVISOR_FEEDBACK_DRAFT',
      headline: 'Bản nháp nhận xét GVHD',
      summary: 'Nhóm trao đổi rõ ràng.',
      findings: [{ category: 'FEEDBACK', severity: 'HIGH', title: 'Cần chốt VNPay', detail: 'Chưa thấy phương án VNPay.', relatedEntity: 'Task VNPay' }],
      suggestedPrompts: ['Nhóm xử lý sandbox thế nào?'],
      draftText: 'Nhóm làm việc tốt, cần sớm xử lý phần VNPay.',
      status: 'COMPLETED',
      generatedAt: '2026-11-22T09:12:00Z',
    })

    const onApplyFeedback = vi.fn()
    render(
      <MeetingAiCopilotPanel
        meeting={meeting}
        variant="detail"
        canManage={true}
        isSupervisor={true}
        currentUserId={3}
        onApplySupervisorFeedback={onApplyFeedback}
      />,
    )

    await screen.findByText('Em sẽ hoàn thành tài liệu OpenAPI vào thứ Sáu.')

    // Ask AI tab
    fireEvent.click(screen.getByRole('tab', { name: 'Hỏi AI' }))
    fireEvent.change(screen.getByLabelText('Câu hỏi cho Trợ lý AI cuộc họp'), { target: { value: 'Ai làm OpenAPI?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Hỏi AI' }))
    expect(await screen.findByText('Trần Thu Hà đã nhận hoàn thành tài liệu OpenAPI.')).toBeTruthy()

    // Click citation jumps back to transcript tab
    fireEvent.click(screen.getByRole('button', { name: /Em sẽ hoàn thành tài liệu OpenAPI/ }))
    expect(screen.getByRole('tab', { name: /Lời nói/ }).getAttribute('aria-selected')).toBe('true')

    // Coach AI tab
    fireEvent.click(screen.getByRole('tab', { name: 'Điều phối AI' }))
    fireEvent.click(screen.getByRole('button', { name: /Nháp nhận xét GVHD/ }))
    expect(await screen.findByText('Nhóm làm việc tốt, cần sớm xử lý phần VNPay.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Điền vào khung Nhận xét GVHD' }))
    expect(onApplyFeedback).toHaveBeenCalledWith('Nhóm làm việc tốt, cần sớm xử lý phần VNPay.')
  })
})
