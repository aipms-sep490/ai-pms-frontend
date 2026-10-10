import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SupervisorRecommendationPanel } from './SupervisorRecommendationPanel'
import { HttpError } from '../../../services/http/http-client'

const mocks = vi.hoisted(() => ({ getSupervisorRecommendations: vi.fn() }))
vi.mock('../api/supervisor-recommendation-api', () => ({ getSupervisorRecommendations: mocks.getSupervisorRecommendations }))

afterEach(() => { cleanup(); vi.resetAllMocks() })

const run = () => ({
  id: 1, projectId: 9, generatedAt: '2026-10-08T03:00:00Z',
  items: [
    { supervisorId: 11, lecturerName: 'TS. An', departmentName: 'CNTT', score: 0.92, matchedExpertise: ['AI', 'ML'], availableCapacity: 2, reasons: ['Khớp 2/2 chuyên môn chính.'] },
    { supervisorId: 12, lecturerName: 'TS. Bình', score: 0.6, matchedExpertise: [], availableCapacity: 0, reasons: [] },
  ],
})

describe('SupervisorRecommendationPanel', () => {
  it('renders ranked suggestions with score and expertise', async () => {
    mocks.getSupervisorRecommendations.mockResolvedValue(run())
    render(<SupervisorRecommendationPanel projectId={9} />)
    expect(await screen.findByText('TS. An')).toBeTruthy()
    expect(screen.getByText('Phù hợp 92%')).toBeTruthy()
    expect(screen.getByText('AI')).toBeTruthy()
    expect(screen.getByText('Còn nhận 2 nhóm')).toBeTruthy()
  })

  it('picks a selectable suggestion and blocks one that is not a candidate', async () => {
    mocks.getSupervisorRecommendations.mockResolvedValue(run())
    const onPick = vi.fn()
    render(<SupervisorRecommendationPanel projectId={9} candidateIds={new Set([11])} onPick={onPick} />)
    await screen.findByText('TS. An')
    fireEvent.click(screen.getByRole('button', { name: 'Chọn giảng viên này' }))
    expect(onPick).toHaveBeenCalledWith(11)
    expect(screen.getByText('Giảng viên này hiện không nằm trong danh sách có thể mời.')).toBeTruthy()
  })

  it('treats a 404 as no suggestions yet', async () => {
    mocks.getSupervisorRecommendations.mockRejectedValue(new HttpError('none', 404))
    render(<SupervisorRecommendationPanel projectId={9} />)
    expect(await screen.findByText('Chưa có gợi ý nào cho đồ án này.')).toBeTruthy()
  })

  it('shows an error with retry on other failures', async () => {
    mocks.getSupervisorRecommendations.mockRejectedValue(new HttpError('boom', 500))
    render(<SupervisorRecommendationPanel projectId={9} />)
    expect((await screen.findByRole('alert')).textContent).toContain('Chưa tải được')
  })
})
