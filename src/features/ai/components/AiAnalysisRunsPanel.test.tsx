import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AiAnalysisRunsPanel } from './AiAnalysisRunsPanel'
import { HttpError } from '../../../services/http/http-client'

const mocks = vi.hoisted(() => ({ getProjectAiRuns: vi.fn(), getAiRun: vi.fn() }))
vi.mock('../ai-api', () => ({ getProjectAiRuns: mocks.getProjectAiRuns, getAiRun: mocks.getAiRun }))

afterEach(() => { cleanup(); vi.resetAllMocks() })

describe('AiAnalysisRunsPanel', () => {
  it('lists runs and marks insufficient data', async () => {
    mocks.getProjectAiRuns.mockResolvedValue([
      { id: 1, projectId: 9, kind: 'RISK', engine: 'rule', engineVersion: 'v3', sufficiency: 'SUFFICIENT', status: 'DONE', createdAt: '2026-10-08T03:00:00Z' },
      { id: 2, projectId: 9, kind: 'SUMMARY', engine: 'llm', sufficiency: 'INSUFFICIENT', status: 'DONE', createdAt: '2026-10-07T03:00:00Z' },
    ])
    render(<AiAnalysisRunsPanel projectId={9} />)
    expect(await screen.findByText('Rủi ro & tiến độ')).toBeTruthy()
    expect(screen.getByText('Tóm tắt báo cáo')).toBeTruthy()
    expect(screen.getByText('Chưa đủ dữ liệu')).toBeTruthy()
  })

  it('expands a RISK run to show its risk factors', async () => {
    mocks.getProjectAiRuns.mockResolvedValue([
      { id: 1, projectId: 9, kind: 'RISK', engine: 'rule', sufficiency: 'SUFFICIENT', status: 'DONE', createdAt: '2026-10-08T03:00:00Z' },
    ])
    mocks.getAiRun.mockResolvedValue({
      id: 1, projectId: 9, kind: 'RISK', engine: 'rule', sufficiency: 'SUFFICIENT', status: 'DONE', createdAt: '2026-10-08T03:00:00Z',
      riskFactors: [{ code: 'OVERDUE_TASKS', weight: 0.4, explanation: 'Nhiều việc quá hạn.' }],
    })
    render(<AiAnalysisRunsPanel projectId={9} />)
    fireEvent.click(await screen.findByText('Rủi ro & tiến độ'))
    expect(await screen.findByText('OVERDUE_TASKS')).toBeTruthy()
    expect(screen.getByText('Nhiều việc quá hạn.')).toBeTruthy()
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
})
