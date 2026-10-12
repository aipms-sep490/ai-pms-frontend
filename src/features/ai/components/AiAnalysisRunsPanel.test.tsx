import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AiAnalysisRunsPanel } from './AiAnalysisRunsPanel'
import { HttpError } from '../../../services/http/http-client'

const mocks = vi.hoisted(() => ({ getProjectAiRuns: vi.fn(), getAiRun: vi.fn() }))
vi.mock('../ai-api', () => ({ getProjectAiRuns: mocks.getProjectAiRuns, getAiRun: mocks.getAiRun }))

afterEach(() => { cleanup(); vi.resetAllMocks() })

const paged = (items: unknown[], totalPages = 1) => ({ items, page: 1, pageSize: 20, totalCount: items.length, totalPages })
const run = (over: Partial<Record<string, unknown>>) => ({
  id: 1, projectId: 9, kind: 'PROJECT_ASK', status: 'COMPLETED', modelVersion: 'rule-v1', configVersion: 'v1',
  startedAt: '2026-10-08T03:00:00Z', completedAt: '2026-10-08T03:00:05Z', errorCode: null, evidence: [], ...over,
})

describe('AiAnalysisRunsPanel', () => {
  it('lists runs with kind, model/config version and status', async () => {
    mocks.getProjectAiRuns.mockResolvedValue(paged([
      run({ id: 1, kind: 'PROJECT_ASK' }),
      run({ id: 2, kind: 'REPORT_SUMMARY', status: 'FAILED', errorCode: 'AI_PROVIDER_FALLBACK' }),
    ]))
    render(<AiAnalysisRunsPanel projectId={9} />)
    expect(await screen.findByText('Hỏi trợ lý')).toBeTruthy()
    expect(screen.getByText('Tóm tắt báo cáo')).toBeTruthy()
    expect(screen.getAllByText('rule-v1 · v1').length).toBe(2)
    expect(screen.getAllByText('Lỗi').length).toBeGreaterThan(0)
  })

  it('calls the paged, project-scoped routes with the exact arguments', async () => {
    mocks.getProjectAiRuns.mockResolvedValue(paged([run({ id: 5 })]))
    mocks.getAiRun.mockResolvedValue(run({ id: 5, answer: { projectId: 9, answer: 'Ưu tiên task quá hạn.', contextScope: 'PROJECT_WITH_INVITED_MEETINGS', evidence: [], limitationNote: null, insufficientEvidence: false, generatedAt: '2026-10-08T03:00:00Z', generationStatus: 'COMPLETED', runId: 5 } }))
    render(<AiAnalysisRunsPanel projectId={9} />)
    fireEvent.click(await screen.findByText('Hỏi trợ lý'))
    await waitFor(() => expect(mocks.getAiRun).toHaveBeenCalledWith(9, 5, expect.any(AbortSignal)))
    expect(mocks.getProjectAiRuns).toHaveBeenCalledWith(9, 1, 20, expect.any(AbortSignal))
  })

  it('expands a PROJECT_ASK run to show the saved answer', async () => {
    mocks.getProjectAiRuns.mockResolvedValue(paged([run({ id: 1 })]))
    mocks.getAiRun.mockResolvedValue(run({ id: 1, answer: { projectId: 9, answer: 'Ưu tiên task quá hạn.', contextScope: 'PROJECT_WITH_INVITED_MEETINGS', evidence: [], limitationNote: 'Chỉ dựa trên dữ liệu hiện có.', insufficientEvidence: false, generatedAt: '2026-10-08T03:00:00Z', generationStatus: 'COMPLETED', runId: 1 } }))
    render(<AiAnalysisRunsPanel projectId={9} />)
    fireEvent.click(await screen.findByText('Hỏi trợ lý'))
    expect(await screen.findByText('Ưu tiên task quá hạn.')).toBeTruthy()
    expect(screen.getByText('Chỉ dựa trên dữ liệu hiện có.')).toBeTruthy()
  })

  it('expands a REPORT_SUMMARY run to show the structured summary', async () => {
    mocks.getProjectAiRuns.mockResolvedValue(paged([run({ id: 2, kind: 'REPORT_SUMMARY' })]))
    mocks.getAiRun.mockResolvedValue(run({
      id: 2, kind: 'REPORT_SUMMARY',
      reportSummary: { projectId: 9, reportId: 17, reportType: 'WEEKLY', periodStart: '2026-09-14', periodEnd: '2026-09-20', summary: { completed: 'Đã xong API.', inProgress: 'Kiểm thử.', blockers: 'Chờ tích hợp.', risks: 'Chậm tiến độ.', nextActions: 'Kiểm thử phân quyền.' }, contextScope: 'PROJECT_WITH_INVITED_MEETINGS', evidence: [], limitationNote: null, generatedAt: '2026-10-08T03:00:00Z', generationStatus: 'COMPLETED', runId: 2 },
    }))
    render(<AiAnalysisRunsPanel projectId={9} />)
    fireEvent.click(await screen.findByText('Tóm tắt báo cáo'))
    expect(await screen.findByText('Đã xong API.')).toBeTruthy()
    expect(screen.getByText('Chờ tích hợp.')).toBeTruthy()
  })

  it('expands a PROGRESS_ANALYSIS run and flags the MAJOR-scope caveat', async () => {
    mocks.getProjectAiRuns.mockResolvedValue(paged([run({ id: 3, kind: 'PROGRESS_ANALYSIS' })]))
    mocks.getAiRun.mockResolvedValue(run({
      id: 3, kind: 'PROGRESS_ANALYSIS',
      progressAnalysis: {
        projectId: 9, generatedAtUtc: '2026-10-08T03:00:00Z', analysisTimeUtc: '2026-10-08T03:00:00Z', dataStatus: 'INSUFFICIENT_DATA', riskLevel: 'INSUFFICIENT_DATA', riskScore: null, confidence: null, trendStatus: 'STABLE',
        progressSummary: { totalMilestones: null, completedMilestones: null, totalTasks: 3, doneTasks: 1, blockedTasks: 1, overdueTasks: 1, unassignedTasks: 0, progressPercentage: 33 },
        featureSnapshot: { overdueTaskRatio: null, averageTaskDelayDays: null, blockedTaskRatio: null, milestoneCompletionRate: null, milestoneDelayDays: null, milestoneNearDueCount: null, reportSubmissionDelayDays: null, missingReportCount: null, meetingFrequencyCount: null, unassignedTaskRatio: null, contributionVariance: null },
        factors: [], recommendations: [], ruleVersion: 'v1', featureVersion: 'v1', modelVersion: 'RULE_BASED', limitations: 'Chỉ công việc thuộc ngành của bạn được tính.',
        runId: 3, contextScope: 'MAJOR', majorIds: [4], unavailableMetrics: ['PROJECT_RISK', 'MILESTONES'],
      },
    }))
    render(<AiAnalysisRunsPanel projectId={9} />)
    fireEvent.click(await screen.findByText('Phân tích tiến độ'))
    expect(await screen.findByText(/Phạm vi ngành/)).toBeTruthy()
    expect(screen.getByText(/PROJECT_RISK, MILESTONES/)).toBeTruthy()
  })

  it('shows a scope-changed notice instead of a hard error when evidence is no longer visible', async () => {
    mocks.getProjectAiRuns.mockResolvedValue(paged([run({ id: 4, errorCode: 'AI_HISTORY_SCOPE_CHANGED' })]))
    mocks.getAiRun.mockResolvedValue(run({ id: 4, errorCode: 'AI_HISTORY_SCOPE_CHANGED', evidence: [], answer: null }))
    render(<AiAnalysisRunsPanel projectId={9} />)
    expect(await screen.findByText('Ngoài phạm vi hiện tại')).toBeTruthy()
    fireEvent.click(screen.getByText('Hỏi trợ lý'))
    expect(await screen.findByText(/không còn hiển thị trong phạm vi hiện tại/)).toBeTruthy()
  })

  it('treats a 404 as an empty history', async () => {
    mocks.getProjectAiRuns.mockRejectedValue(new HttpError('none', 404))
    render(<AiAnalysisRunsPanel projectId={9} />)
    expect(await screen.findByText('Chưa có lần phân tích nào được lưu.')).toBeTruthy()
  })

  it('shows an error with retry on other failures', async () => {
    mocks.getProjectAiRuns.mockRejectedValue(new HttpError('boom', 500))
    render(<AiAnalysisRunsPanel projectId={9} />)
    expect((await screen.findByRole('alert')).textContent).toContain('Chưa tải được')
  })

  it('pages through history without refetching on the detail route', async () => {
    mocks.getProjectAiRuns.mockResolvedValue(paged([run({ id: 1 })], 2))
    render(<AiAnalysisRunsPanel projectId={9} />)
    await screen.findByText('Hỏi trợ lý')
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
    await waitFor(() => expect(mocks.getProjectAiRuns).toHaveBeenCalledWith(9, 2, 20, expect.any(AbortSignal)))
  })
})
