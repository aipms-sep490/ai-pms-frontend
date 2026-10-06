import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HttpError } from '../../services/http/http-client'
import { ExecutionAccessProvider } from '../execution/context/ExecutionAccessProvider'
import { ProjectAiPage } from './ProjectAiPage'
import { ProjectProgressAnalysisPanel } from './components/ProjectProgressAnalysisPanel'
import { ReportAiSummary } from './components/ReportAiSummary'

const api = vi.hoisted(() => ({ getProjectProgressAnalysis: vi.fn(), getReportAiSummary: vi.fn(), askProjectAssistant: vi.fn() }))
vi.mock('./ai-api', () => api)

const analysis = {
  projectId: 9, generatedAtUtc: '2026-10-03T08:00:00Z', analysisTimeUtc: '2026-10-03T08:00:00Z', dataStatus: 'SUFFICIENT', riskLevel: 'MEDIUM', riskScore: 32, confidence: 0.73, trendStatus: 'INSUFFICIENT_DATA',
  progressSummary: { totalMilestones: 2, completedMilestones: 1, totalTasks: 8, doneTasks: 4, blockedTasks: 1, overdueTasks: 2, unassignedTasks: 0, progressPercentage: 50 },
  featureSnapshot: { overdueTaskRatio: 0.2, averageTaskDelayDays: 3, blockedTaskRatio: 0.1, milestoneCompletionRate: 0.5, milestoneDelayDays: null, milestoneNearDueCount: null, reportSubmissionDelayDays: null, missingReportCount: null, meetingFrequencyCount: 1, unassignedTaskRatio: 0, contributionVariance: null },
  factors: [{ code: 'OVERDUE_TASKS', feature: 'OverdueTaskRatio', observedValue: 0.2, severity: 'MEDIUM', explanation: '20% task quá hạn.' }], recommendations: ['Phân công người xử lý.'], ruleVersion: 'v1', featureVersion: 'v1', modelVersion: 'rule-v1', limitations: null,
}
const summary = { projectId: 9, reportId: 17, reportType: 'WEEKLY', periodStart: '2026-09-14', periodEnd: '2026-09-20', summary: { completed: 'Đã xong API.', inProgress: 'Kiểm thử.', blockers: 'Chờ tích hợp.', risks: 'Chậm tiến độ.', nextActions: 'Kiểm thử phân quyền.' }, contextScope: 'Project #9', evidence: [{ sourceType: 'PROGRESS_REPORT', sourceId: 'PR-17', title: 'Weekly report', periodOrDate: '2026-09-14 to 2026-09-20', referenceUrl: '/api/v1/progress-reports/17', excerpt: 'Đã xong API.' }], limitationNote: null, generatedAt: '2026-10-03T08:00:00Z' }

beforeEach(() => { vi.resetAllMocks(); api.getProjectProgressAnalysis.mockResolvedValue(analysis); api.getReportAiSummary.mockResolvedValue(summary) })
afterEach(cleanup)

describe('AI advisory components', () => {
  it('requests a report summary only after the user explicitly asks and shows returned evidence', async () => {
    render(<ReportAiSummary projectId={9} reportId={17} />)
    expect(api.getReportAiSummary).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tóm tắt AI' }))
    await screen.findByText('Weekly report')
    expect(api.getReportAiSummary).toHaveBeenCalledWith(9, 17)
    expect(screen.getByText('Nguồn tham chiếu: /api/v1/progress-reports/17')).toBeTruthy()
  })

  it('keeps the report-summary failure local and explains an authorization denial', async () => {
    api.getReportAiSummary.mockRejectedValue(new HttpError('forbidden', 403))
    render(<ReportAiSummary projectId={9} reportId={17} />)
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tóm tắt AI' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Hệ thống không cấp quyền')
  })

  it('does not render an unknown backend risk enum as a healthy state', async () => {
    api.getProjectProgressAnalysis.mockResolvedValue({ ...analysis, riskLevel: 'FUTURE_ENUM' })
    render(<ProjectProgressAnalysisPanel projectId={9} />)
    expect(await screen.findByText('Trạng thái chưa hỗ trợ')).toBeTruthy()
    expect(screen.getByText(/Chưa thể xác định mức rủi ro/)).toBeTruthy()
    expect(screen.queryByText('Rủi ro: FUTURE_ENUM')).toBeNull()
  })

  it('keeps the assistant advisory-only and surfaces a rate-limit failure', async () => {
    api.askProjectAssistant.mockRejectedValue(new HttpError('rate limited', 429))
    render(<MemoryRouter><ExecutionAccessProvider value={{ project: { id: 9, title: 'Đồ án', status: 'ACTIVE' } as never, actor: 'student', currentUserId: 2, canManageStructure: true, routeBase: '/project' }}><ProjectAiPage /></ExecutionAccessProvider></MemoryRouter>)
    await screen.findByText('Rủi ro và tiến độ đồ án')
    fireEvent.change(screen.getByLabelText('Câu hỏi'), { target: { value: 'Việc nào cần ưu tiên?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }))
    expect((await screen.findByRole('alert')).textContent).toContain('vượt giới hạn')
    expect(api.askProjectAssistant).toHaveBeenCalledWith(9, 'Việc nào cần ưu tiên?')
    expect(screen.queryByRole('button', { name: /thực thi|phê duyệt|cập nhật/i })).toBeNull()
  })

  it('renders assistant evidence without converting an API reference into a command', async () => {
    api.askProjectAssistant.mockResolvedValue({ projectId: 9, answer: 'Ưu tiên task quá hạn.', contextScope: 'Project #9', evidence: summary.evidence, limitationNote: 'Dữ liệu có giới hạn.', insufficientEvidence: true, generatedAt: '2026-10-03T08:00:00Z' })
    render(<MemoryRouter><ExecutionAccessProvider value={{ project: { id: 9, title: 'Đồ án', status: 'ACTIVE' } as never, actor: 'student', currentUserId: 2, canManageStructure: true, routeBase: '/project' }}><ProjectAiPage /></ExecutionAccessProvider></MemoryRouter>)
    await screen.findByText('Rủi ro và tiến độ đồ án')
    fireEvent.change(screen.getByLabelText('Câu hỏi'), { target: { value: 'Ưu tiên?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }))
    await screen.findByText('Ưu tiên task quá hạn.')
    expect(screen.getByText('Nguồn tham chiếu: /api/v1/progress-reports/17')).toBeTruthy()
    await waitFor(() => expect(screen.getByText(/Chưa đủ chứng cứ/)).toBeTruthy())
  })
})
