import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import * as aiSuiteApi from './ai-suite-api'
import * as taskCriteriaApi from '../tasks/task-criteria-api'
import { DefenseMockPanel, GateScriptAiPanel } from './DefenseMockPanel'
import { ProgressReportAiDraftBar } from './ProgressReportAiDraftBar'
import { ContributionFairnessPanel } from './ContributionFairnessPanel'
import { AppealAssistPanel, RubricGradingCopilotPanel, ScoreCalibrationPanel } from './EvaluationAiPanels'
import { SprintRetroAiButton, TaskBreakdownAiPanel } from './TaskSprintAiPanels'
import { SubmissionPreflightPanel } from './SubmissionPreflightPanel'
import { TeamSkillGapPanel, WorkingAgreementAiDraftBar } from './TeamAgreementAiPanels'
import { DepartmentExecutiveBriefPanel } from './DepartmentExecutiveBriefPanel'

vi.mock('./ai-suite-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./ai-suite-api')>()
  return {
    ...actual,
    generateDefenseMock: vi.fn(),
    getLatestDefenseMock: vi.fn(),
    evaluateDefenseAnswer: vi.fn(),
    generateGateScriptDraft: vi.fn(),
    generateProgressReportDraft: vi.fn(),
    analyzeContributionFairness: vi.fn(),
    getLatestContributionFairness: vi.fn(),
    generateRubricGradingCopilot: vi.fn(),
    checkScoreCalibration: vi.fn(),
    assistAppealReview: vi.fn(),
    breakdownTask: vi.fn(),
    generateSprintRetro: vi.fn(),
    checkSubmissionPreflight: vi.fn(),
    analyzeTeamSkillGap: vi.fn(),
    draftWorkingAgreement: vi.fn(),
    generateDepartmentBrief: vi.fn(),
    getLatestDepartmentBrief: vi.fn(),
  }
})

vi.mock('../tasks/task-criteria-api', () => ({
  getTaskCriteria: vi.fn(),
  replaceTaskCriteria: vi.fn(),
  toggleTaskCriterion: vi.fn(),
}))

const meta = {
  snapshotId: 101,
  featureKey: 'TEST',
  status: 'COMPLETED',
  modelVersion: 'claude-haiku-5-5',
  generatedAt: '2026-11-22T12:00:00Z',
  createdByName: 'Nguyễn Minh Khang',
}

describe('AI Copilot Suite — All 8 Modules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('#1 DefenseMockPanel hides empty body strip while idle and expands cleanly when options open', () => {
    const { container, unmount } = render(<DefenseMockPanel projectId={20} />)
    const card = container.querySelector('.ais-card')
    expect(card?.className).toContain('ais-card--header-only')
    expect(container.querySelector('.ais-body')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /Tùy chỉnh/i }))
    expect(card?.className).not.toContain('ais-card--header-only')
    expect(container.querySelector('.ais-body')).not.toBeNull()
    unmount()
  })

  it('#1 DefenseMockPanel generates questions, supports Web Speech voice recording & AI scores answers 0-10', async () => {
    vi.mocked(aiSuiteApi.generateDefenseMock).mockResolvedValue({
      projectId: 20,
      headline: 'Phiên luyện bảo vệ cho AI-2026-10',
      readinessAssessment: 'Nhóm đã sẵn sàng tốt phần kiến trúc.',
      weakSpots: ['Cần số liệu benchmark thực tế'],
      questions: [
        {
          id: 'q1',
          committeeRole: 'CHAIR',
          difficulty: 'HARD',
          category: 'Kiến trúc',
          question: 'Vì sao nhóm chọn kiến trúc Clean Architecture và xử lý concurrency thế nào?',
          whyAsked: 'Kiểm tra độ làm chủ hệ thống',
          suggestedAnswerOutline: 'Nêu rõ Optimistic Concurrency Token và Transaction.',
          keyPointsToMention: ['ConcurrencyToken', 'Transaction'],
          targetStudentName: 'Nguyễn Minh Khang',
        },
      ],
      meta,
    })

    vi.mocked(aiSuiteApi.evaluateDefenseAnswer).mockResolvedValue({
      projectId: 20,
      score: 8.5,
      verdict: 'STRONG',
      feedback: 'Trả lời rõ ràng, có dẫn chứng kiến trúc cụ thể.',
      strengths: ['Nêu đúng cơ chế ConcurrencyToken'],
      missingPoints: ['Bổ sung thông số benchmark tải'],
      improvedAnswerSample: 'Hệ thống áp dụng RowVersion/ConcurrencyToken kết hợp Retry...',
      followUpProbe: 'Nếu hai giám khảo cùng chốt điểm lúc 23:59 thì sao?',
      meta,
    })

    const startSpy = vi.fn()
    const stopSpy = vi.fn()
    const instances: FakeSpeechRecognition[] = []
    class FakeSpeechRecognition {
      lang = ''
      continuous = false
      interimResults = false
      onresult: ((e: unknown) => void) | null = null
      onerror: ((e: unknown) => void) | null = null
      onend: (() => void) | null = null
      constructor() {
        instances.push(this)
      }
      start = startSpy
      stop = stopSpy
    }
    ;(window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = FakeSpeechRecognition

    render(<DefenseMockPanel projectId={20} />)
    fireEvent.click(screen.getByRole('button', { name: /Tạo bộ câu hỏi phản biện/i }))

    expect(await screen.findByText(/Vì sao nhóm chọn kiến trúc Clean Architecture/i)).toBeTruthy()

    // Start voice recording and simulate Vietnamese speech transcript
    fireEvent.click(screen.getByRole('button', { name: /Trả lời bằng giọng nói/i }))
    expect(startSpy).toHaveBeenCalledTimes(1)
    instances[0]?.onresult?.({
      resultIndex: 0,
      results: [Object.assign([{ transcript: 'Hệ thống dùng ConcurrencyToken và giao dịch SQL Server.' }], { isFinal: true })],
    })

    await waitFor(() => {
      expect(screen.getByDisplayValue(/ConcurrencyToken/)).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: /AI Chấm điểm câu trả lời/i }))
    expect(await screen.findByText('8.5/10')).toBeTruthy()
    expect(screen.getByText(/Nếu hai giám khảo cùng chốt điểm/i)).toBeTruthy()

    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition
  })

  it('#1b GateScriptAiPanel generates script and triggers apply callback', async () => {
    const onApply = vi.fn()
    vi.mocked(aiSuiteApi.generateGateScriptDraft).mockResolvedValue({
      gateInstanceId: 70,
      projectId: 20,
      gateCode: 'G3',
      executiveBrief: 'Đồ án hoàn thiện 85% hạng mục.',
      strengthHighlights: ['Demo ổn định'],
      riskWatchlist: ['Thiếu tài liệu kiểm thử'],
      agendaStages: [{ stage: 'Trình bày demo', durationMinutes: 15, purpose: 'Kiểm chứng sản phẩm' }],
      suggestedQuestions: [{ askerRole: 'CHAIR', question: 'Trình bày kịch bản failover?', targetMemberName: 'Khang', verificationGoal: 'Độ ổn định' }],
      remediationWatchlist: ['Bổ sung báo cáo test'],
      generalNotesDraft: 'Ghi chú mẫu phiên G3.',
      meta,
    })

    render(<GateScriptAiPanel gateInstanceId={70} onApplyToScript={onApply} />)
    fireEvent.click(screen.getByRole('button', { name: /AI Gợi ý kịch bản phiên/i }))
    expect(await screen.findByText(/Trình bày kịch bản failover/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Áp dụng vào kịch bản/i }))
    expect(onApply).toHaveBeenCalledTimes(1)
  })

  it('#2 ProgressReportAiDraftBar drafts from tasks/meetings and applies without submitting', async () => {
    const onApply = vi.fn()
    vi.mocked(aiSuiteApi.generateProgressReportDraft).mockResolvedValue({
      projectId: 20,
      reportType: 'WEEKLY',
      periodStart: '2026-11-15',
      periodEnd: '2026-11-22',
      summary: 'Hoàn tất Video Call AI.',
      completedWork: '- Xây dựng API Video AI',
      inProgressWork: '- Viết tài liệu báo cáo',
      plannedWork: '- Kiểm thử tích hợp',
      issuesAndRisks: '- Lỗi cấu hình VNPay',
      evidence: [{ sourceType: 'MEETING_AI', title: 'Biên bản AI: Họp Sprint 3', detail: 'Tóm tắt họp' }],
      meta,
    })

    render(<ProgressReportAiDraftBar projectId={20} reportType="WEEKLY" onApplyDraft={onApply} />)
    fireEvent.click(screen.getByRole('button', { name: /AI Tự soạn bản nháp/i }))
    expect(await screen.findByText(/Hoàn tất Video Call AI/i)).toBeTruthy()
    expect(screen.getByText(/Biên bản AI Video Call: Biên bản AI: Họp Sprint 3/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Áp dụng vào biểu mẫu báo cáo/i }))
    expect(onApply).toHaveBeenCalledTimes(1)
  })

  it('#3 ContributionFairnessPanel displays balance score, Video AI speech share & supervisor questions', async () => {
    vi.mocked(aiSuiteApi.analyzeContributionFairness).mockResolvedValue({
      projectId: 20,
      balanceScore: 78,
      headline: 'Phân bổ tương đối ổn, cần hỗ trợ thành viên quá tải',
      executiveSummary: 'Khang đang gánh phần lớn backend và phát biểu 70% cuộc họp.',
      includesPrivateSignals: true,
      members: [
        {
          userId: 1,
          fullName: 'Nguyễn Minh Khang',
          role: 'Trưởng nhóm',
          tasksAssigned: 5,
          tasksCompleted: 4,
          tasksOverdue: 1,
          criteriaCompleted: 12,
          commentCount: 9,
          meetingsAttended: 4,
          speechSegments: 21,
          speechSharePercent: 70,
          averageWeeklyScore: 9,
          averagePeerRating: 4.8,
          signal: 'OVERLOADED_BURNOUT',
          assessment: 'Gánh tải cao',
          evidenceBullets: ['Hoàn thành 4/5 task'],
        },
      ],
      rebalanceRecommendations: ['San sẻ 2 task kiểm thử cho Hà'],
      supervisorVerificationQuestions: ['Hỏi Hà về phần đóng góp kiểm thử tuần qua'],
      meta,
    })

    // TK-W0-09: Hidden by default unless explicitly enabled
    const { container: hiddenFairness } = render(<ContributionFairnessPanel projectId={20} />)
    expect(hiddenFairness.innerHTML).toBe('')

    render(<ContributionFairnessPanel projectId={20} enabled />)
    fireEvent.click(screen.getByRole('button', { name: /AI Phân tích công bằng/i }))
    expect(await screen.findByText(/Chỉ số cân bằng: 78\/100/i)).toBeTruthy()
    expect(screen.getByText(/21 \(70%\)/)).toBeTruthy()
    expect(screen.getByText(/Hỏi Hà về phần đóng góp kiểm thử/i)).toBeTruthy()
  })

  it('#4 RubricGradingCopilotPanel, ScoreCalibrationPanel & AppealAssistPanel work with human-in-the-loop callbacks', async () => {
    const onApplyComment = vi.fn()
    const onApplyAll = vi.fn()
    vi.mocked(aiSuiteApi.generateRubricGradingCopilot).mockResolvedValue({
      assignmentId: 83,
      projectId: 20,
      rubricName: 'Rubric Bảo vệ',
      overallSummary: 'Hồ sơ đầy đủ.',
      criteria: [
        {
          rubricCriterionId: 82,
          criterionName: 'Kiến trúc hệ thống',
          weightPercent: 100,
          maxScore: 10,
          suggestedLevel: 'Tốt',
          suggestedScoreMin: 8,
          suggestedScoreMax: 9,
          suggestedComment: 'Kiến trúc phân lớp rõ ràng.',
          evidenceCitations: ['Báo cáo kiến trúc v2'],
          confidence: 'HIGH',
        },
      ],
      verificationQuestions: ['Giải thích sơ đồ sequence?'],
      disclaimer: 'AI chỉ gợi ý tham khảo.',
      meta,
    })

    // TK-W0-09: Hidden by default unless explicitly enabled
    const { container: hiddenCopilot } = render(<RubricGradingCopilotPanel assignmentId={83} />)
    expect(hiddenCopilot.innerHTML).toBe('')

    render(<RubricGradingCopilotPanel assignmentId={83} enabled onApplyCriterionComment={onApplyComment} onApplyAllComments={onApplyAll} />)
    fireEvent.click(screen.getByRole('button', { name: /AI Gợi ý theo Rubric/i }))
    expect(await screen.findByText(/Kiến trúc phân lớp rõ ràng/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Điền nhận xét này/i }))
    expect(onApplyComment).toHaveBeenCalledWith(82, 'Kiến trúc phân lớp rõ ràng.')

    vi.mocked(aiSuiteApi.checkScoreCalibration).mockResolvedValue({
      projectId: 20,
      evaluatedCount: 2,
      overallStatus: 'HIGH_VARIANCE',
      summary: 'Chênh lệch 3.5 điểm giữa 2 giám khảo.',
      alerts: [{ severity: 'HIGH', category: 'DISCREPANCY', title: 'Lệch tổng điểm 3.5', detail: '9.0 vs 5.5', criterionName: null }],
      recommendations: ['Họp thống nhất hội đồng'],
      meta,
    })

    render(<ScoreCalibrationPanel projectId={20} />)
    fireEvent.click(screen.getByRole('button', { name: /AI Kiểm tra độ lệch điểm/i }))
    expect(await screen.findByText(/Lệch tổng điểm 3.5/i)).toBeTruthy()

    const onUseDraft = vi.fn()
    vi.mocked(aiSuiteApi.assistAppealReview).mockResolvedValue({
      appealId: 90,
      projectId: 20,
      appealSummary: 'Sinh viên khiếu nại điểm kiểm thử.',
      meritAssessment: 'NEEDS_MANUAL_CHECK',
      keyClaims: ['Đã bổ sung test unit'],
      evidenceChecks: ['Kiểm tra bản nộp cuối'],
      draftResponse: 'Hội đồng đã rà soát lại hồ sơ gốc...',
      meta,
    })

    // TK-W0-09: Hidden by default unless explicitly enabled
    const { container: hiddenAppeal } = render(<AppealAssistPanel appealId={90} />)
    expect(hiddenAppeal.innerHTML).toBe('')

    render(<AppealAssistPanel appealId={90} enabled onUseDraftResponse={onUseDraft} />)
    fireEvent.click(screen.getByRole('button', { name: /AI Phân tích đơn phúc khảo/i }))
    expect(await screen.findByText(/Hội đồng đã rà soát lại hồ sơ gốc/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Chèn vào ô Lý do thẩm định/i }))
    expect(onUseDraft).toHaveBeenCalledWith('Hội đồng đã rà soát lại hồ sơ gốc...')
  })

  it('#5 TaskBreakdownAiPanel adds selected criteria via task-criteria-api & SprintRetroAiButton renders retro', async () => {
    const onApplied = vi.fn()
    vi.mocked(aiSuiteApi.breakdownTask).mockResolvedValue({
      projectId: 20,
      taskTitle: 'Xây dựng API AI Suite',
      suggestedPriority: 'HIGH',
      suggestedStoryPoints: 5,
      implementationSummary: 'Thiết kế DTO + Service + Controller.',
      criteria: [
        { title: 'Hoàn thiện endpoint và RBAC', verificationHint: 'Test 403 cho sinh viên' },
        { title: 'Viết unit test đầy đủ', verificationHint: 'Pass 100%' },
      ],
      potentialRisks: ['Quá timeout LLM'],
      relatedExistingTasks: [],
      recommendedAssignees: [{ userId: 1, fullName: 'Nguyễn Minh Khang', majorName: 'SE', openTaskCount: 1, reason: 'Phù hợp backend' }],
      meta,
    })
    vi.mocked(taskCriteriaApi.getTaskCriteria).mockResolvedValue({
      taskId: 41,
      totalCount: 0,
      completedCount: 0,
      canManage: true,
      canToggle: true,
      items: [],
    })
    vi.mocked(taskCriteriaApi.replaceTaskCriteria).mockResolvedValue({
      taskId: 41,
      totalCount: 2,
      completedCount: 0,
      canManage: true,
      canToggle: true,
      items: [],
    })

    render(<TaskBreakdownAiPanel projectId={20} taskId={41} taskTitle="Xây dựng API AI Suite" onCriteriaApplied={onApplied} />)
    fireEvent.click(screen.getByRole('button', { name: /AI Chia nhỏ công việc/i }))
    expect(await screen.findByText(/Hoàn thiện endpoint và RBAC/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Thêm tiêu chí đã chọn/i }))
    await waitFor(() => {
      expect(taskCriteriaApi.replaceTaskCriteria).toHaveBeenCalledWith(41, [
        { title: 'Hoàn thiện endpoint và RBAC' },
        { title: 'Viết unit test đầy đủ' },
      ])
      expect(onApplied).toHaveBeenCalledTimes(1)
    })

    vi.mocked(aiSuiteApi.generateSprintRetro).mockResolvedValue({
      projectId: 20,
      sprintId: 60,
      sprintName: 'Sprint 3',
      totalTasks: 5,
      completedTasks: 4,
      overdueOrIncompleteTasks: 1,
      headline: 'Sprint 3 đạt 80% mục tiêu',
      executiveSummary: 'Tiến độ tốt.',
      wentWell: ['Phối hợp họp tốt'],
      needsImprovement: ['Ước lượng sát hơn'],
      bottlenecks: ['Chờ cổng thanh toán'],
      nextSprintActions: ['Chốt integration test'],
      meta,
    })

    render(<SprintRetroAiButton projectId={20} sprintId={60} sprintName="Sprint 3" />)
    fireEvent.click(screen.getByRole('button', { name: /AI Sprint Retrospective/i }))
    expect(await screen.findByText(/Sprint 3 đạt 80% mục tiêu/i)).toBeTruthy()
  })

  it('#6 SubmissionPreflightPanel renders readiness score & blocking issues', async () => {
    vi.mocked(aiSuiteApi.checkSubmissionPreflight).mockResolvedValue({
      projectId: 20,
      target: 'FINAL_SUBMISSION',
      readinessScore: 55,
      verdict: 'BLOCKING_ISSUES',
      summary: 'Còn thiếu báo cáo tổng kết PDF.',
      checks: [{ item: 'Báo cáo tổng kết PDF', status: 'FAIL', detail: 'Chưa đính kèm phiên bản nộp', fixSuggestion: 'Tải lên file PDF' }],
      priorityFixes: ['Upload PDF báo cáo trước 23:59'],
      meta,
    })

    render(<SubmissionPreflightPanel projectId={20} target="FINAL_SUBMISSION" />)
    fireEvent.click(screen.getByRole('button', { name: /AI Quét kiểm tra trước khi nộp/i }))
    expect(await screen.findByText(/Mức độ sẵn sàng: 55\/100/i)).toBeTruthy()
    expect(screen.getByText(/Upload PDF báo cáo trước 23:59/i)).toBeTruthy()
  })

  it('#7 TeamSkillGapPanel & WorkingAgreementAiDraftBar render analysis and apply sections', async () => {
    vi.mocked(aiSuiteApi.analyzeTeamSkillGap).mockResolvedValue({
      teamId: 10,
      teamName: 'Nhóm 10',
      projectMode: 'INTERDISCIPLINARY',
      readinessScore: 84,
      summary: 'Đội hình SE + AI bổ trợ rất tốt.',
      coverageMatrix: [{ skillOrRole: 'Backend & DevOps', status: 'COVERED', coveredByMembers: ['Khang'], note: 'Đủ mạnh' }],
      roleSuggestions: [{ userId: 1, fullName: 'Nguyễn Minh Khang', majorName: 'SE', suggestedRole: 'Tech Lead', strengths: ['.NET', 'Docker'] }],
      onboardingRecommendations: ['Thống nhất API contract sớm'],
      meta,
    })

    render(<TeamSkillGapPanel teamId={10} />)
    fireEvent.click(screen.getByRole('button', { name: /AI Phân tích năng lực nhóm/i }))
    expect(await screen.findByText(/Độ phủ năng lực: 84\/100/i)).toBeTruthy()

    const onApplySections = vi.fn()
    vi.mocked(aiSuiteApi.draftWorkingAgreement).mockResolvedValue({
      projectId: 20,
      summary: 'Dự thảo cam kết 4 điều khoản.',
      sections: [{ title: 'Lịch họp tuần', body: 'Họp tối thứ 4 qua LiveKit.' }],
      meta,
    })

    render(<WorkingAgreementAiDraftBar projectId={20} onApplySections={onApplySections} />)
    fireEvent.click(screen.getByRole('button', { name: /AI Soạn mẫu cam kết/i }))
    expect(await screen.findByText(/Họp tối thứ 4 qua LiveKit/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Áp dụng 1 mục vào biểu mẫu/i }))
    expect(onApplySections).toHaveBeenCalledWith([{ title: 'Lịch họp tuần', body: 'Họp tối thứ 4 qua LiveKit.' }])
  })

  it('#8 DepartmentExecutiveBriefPanel renders executive metrics & clickable risk project links', async () => {
    vi.mocked(aiSuiteApi.generateDepartmentBrief).mockResolvedValue({
      departmentId: 1,
      scopeName: 'Khoa Kỹ thuật Phần mềm',
      totalActiveProjects: 24,
      atRiskProjectCount: 3,
      silentTeamCount: 2,
      pendingAppealsCount: 1,
      headline: 'Tuần này có 3 đồ án cần Ban Chủ nhiệm lưu ý',
      executiveSummary: 'Đa số tiến độ tốt, tập trung tháo gỡ 3 nhóm trễ hạn.',
      topRiskProjects: [
        {
          projectId: 20,
          projectCode: 'AI-2026-10',
          projectTitle: 'Hệ thống AI quản lý đồ án',
          riskLevel: 'HIGH',
          overdueTaskCount: 3,
          blockedTaskCount: 1,
          daysSinceLastMeeting: 15,
          reason: 'Có 3 task quá hạn và 15 ngày chưa họp.',
          recommendedAction: 'Nhắc GVHD họp kiểm tra ngay.',
        },
      ],
      supervisorAlerts: [{ userId: 3, fullName: 'TS. Lê Quang Huy', activeProjectCount: 7, note: 'Đang hướng dẫn tải cao' }],
      weeklyPriorityActions: ['Xử lý 1 đơn phúc khảo tồn đọng'],
      meta,
    })

    render(
      <MemoryRouter>
        <DepartmentExecutiveBriefPanel departmentId={1} routePrefix="/department" />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: /AI Tổng hợp bản tin tuần/i }))
    expect(await screen.findByText(/Tuần này có 3 đồ án cần Ban Chủ nhiệm lưu ý/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: /Mở hồ sơ đồ án/i }).getAttribute('href')).toBe('/department/projects/20/governance')
  })
})
