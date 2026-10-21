import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HttpError } from '../../../services/http/http-client'
import { ReviewGateGovernancePage } from './ReviewGateGovernancePage'
import { StudentReviewTimeline } from '../components/StudentReviewTimeline'
import type { ReviewGateTemplate, StudentReviewTimelineDto } from '../types/review-gates.types'

const api = vi.hoisted(() => ({ getReviewGateTemplates: vi.fn(), getProjectReviewMatrix: vi.fn(), getDefenseReadiness: vi.fn(), saveReviewGateTemplate: vi.fn(), publishReviewGateTemplate: vi.fn(), updateGateDecision: vi.fn(), updateHybridScopeDecision: vi.fn() }))
vi.mock('../api/review-gates-api', () => api)
const template: ReviewGateTemplate = { id: '1', code: 'T', name: 'Mẫu kiểm thử trọng số', mode: 'SINGLE_MAJOR', major: '', gatesCount: 2, status: 'DRAFT', version: '1', concurrencyToken: 'v1', gates: [20, 80].map((weight, i) => ({ id: String(i), code: `R${i + 1}`, title: `Cổng ${i + 1}`, objective: '', required: true, blockNextGate: false, start: null, end: null, reviewerPolicy: 'Assigned Reviewer', reviewScope: 'COMMON', requirements: [], weight })) }
const timeline: StudentReviewTimelineDto = { projectId: '1', projectCode: 'P1', projectName: 'Đồ án kiểm thử', projectMode: 'INTERDISCIPLINARY', major: '', effectivePolicyVersion: '1', currentGateCode: 'R2', academicProgress: 20, taskProgress: 75, isDefenseReady: false, gates: template.gates.map((g, i) => ({ gateInstanceId: g.id, code: g.code, title: g.title, objective: '', status: i === 0 ? 'PASSED' : 'IN_REVIEW', reviewEligibility: 'READY', isRequired: true, windowStart: null, windowEnd: null, blockingReasons: [], requirements: [], weight: g.weight })), capabilities: { canSubmitPackage: true, canSubmitRevision: true, blockingReasons: [] } }
beforeEach(() => { vi.resetAllMocks(); api.getReviewGateTemplates.mockResolvedValue(structuredClone([template])); api.getProjectReviewMatrix.mockResolvedValue([]); api.saveReviewGateTemplate.mockResolvedValue(template) })
afterEach(cleanup)
async function builder() {
  render(<MemoryRouter><ReviewGateGovernancePage /></MemoryRouter>)
  await screen.findByText(template.name)
  fireEvent.click(screen.getByRole('button', { name: 'Thiết kế Review Gates (Builder)' }))
  return screen.getByRole('spinbutton', { name: 'Trọng số học vụ của R1 (%)' }) as HTMLInputElement
}

describe('batch 1 template form', () => {
  it('edits weight and blocks a partial total without losing other input', async () => {
    const weight = await builder()
    fireEvent.change(screen.getByLabelText('Tên đợt thẩm định *'), { target: { value: 'Tên dài đang nhập' } })
    fireEvent.change(weight, { target: { value: '35' } })
    expect(screen.getByRole('alert').textContent).toContain('115%')
    expect((screen.getByRole('button', { name: 'Lưu bản nháp' }) as HTMLButtonElement).disabled).toBe(true)
    expect(api.saveReviewGateTemplate).not.toHaveBeenCalled()
    expect((screen.getByLabelText('Tên đợt thẩm định *') as HTMLInputElement).value).toBe('Tên dài đang nhập')
  })
  it.each([422, 409])('keeps draft values and a useful form error after server %s', async status => {
    api.saveReviewGateTemplate.mockRejectedValue(new HttpError('Technical message', status, { errors: { weights: ['Invalid weights'] } }))
    const weight = await builder()
    fireEvent.change(screen.getByLabelText('Tên đợt thẩm định *'), { target: { value: 'Giữ nội dung' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    await screen.findAllByText(status === 422 ? /Tổng hiện tại: 100%/ : /nhân bản thành phiên bản nháp mới/)
    expect(weight.value).toBe('20')
    expect((screen.getByLabelText('Tên đợt thẩm định *') as HTMLInputElement).value).toBe('Giữ nội dung')
  })
  it('makes a published template read-only and offers cloning', async () => {
    api.getReviewGateTemplates.mockResolvedValue([{ ...template, status: 'PUBLISHED' }])
    const weight = await builder()
    expect(weight.matches(':disabled')).toBe(true)
    expect((screen.getByRole('button', { name: '＋ Thêm Gate' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Nhân bản bản nháp mới' })).toBeTruthy()
  })
  it('announces loading and empty templates without fabricating defaults', async () => {
    api.getReviewGateTemplates.mockResolvedValue([])
    render(<MemoryRouter><ReviewGateGovernancePage /></MemoryRouter>)
    expect(screen.getByText('Đang tải dữ liệu tiến trình học vụ…')).toBeTruthy()
    await screen.findByText('Chưa cấu hình')
    expect(screen.queryByRole('spinbutton')).toBeNull()
  })
})

describe('server-authoritative timeline progress', () => {
  const renderTimeline = (over: Partial<StudentReviewTimelineDto> = {}, isLeader = true) => render(<StudentReviewTimeline timeline={{ ...timeline, ...over }} isLeader={isLeader} onSubmitRevision={vi.fn()} onSubmitForReview={vi.fn()} />)
  it('keeps task progress separate; IN_REVIEW is not a passed gate', () => {
    renderTimeline()
    expect(screen.getByRole('progressbar', { name: 'Tiến độ học vụ' }).getAttribute('aria-valuenow')).toBe('20')
    expect(screen.getByRole('progressbar', { name: 'Tiến độ công việc' }).getAttribute('aria-valuenow')).toBe('75')
    expect(screen.getByText('(1/2 Cổng đạt)')).toBeTruthy()
  })
  it('shows NOT_CONFIGURED as text without a zero bar while keeping a real task zero', () => {
    renderTimeline({ academicProgress: null, academicProgressSource: 'NOT_CONFIGURED', taskProgress: 0 })
    expect(screen.getByText('Chưa áp dụng quy chế Cổng thẩm định')).toBeTruthy()
    expect(screen.queryByRole('progressbar', { name: 'Tiến độ học vụ' })).toBeNull()
    expect(screen.getByRole('progressbar', { name: 'Tiến độ công việc' }).getAttribute('aria-valuenow')).toBe('0')
  })
  it('shows branches with weights and missing progress distinctly', () => {
    renderTimeline({ disciplineProgress: [{ scope: 'COMMON', name: 'Phần chung', progress: 20, weight: 40 }, { scope: 'MAJOR:1', name: 'Công nghệ thông tin', progress: null, weight: 60 }] })
    expect(screen.getByText('Trọng số: 40%')).toBeTruthy(); expect(screen.getByText('Trọng số: 60%')).toBeTruthy()
    expect(screen.getByText('Chưa có dữ liệu')).toBeTruthy()
    expect(screen.queryByRole('progressbar', { name: 'Tiến độ Công nghệ thông tin' })).toBeNull()
  })
  it('uses server submit capabilities independently of advisory readiness', () => {
    renderTimeline({ gates: timeline.gates.map(g => ({ ...g, status: 'PLANNED' })), isDefenseReady: false })
    expect((screen.getByRole('button', { name: 'Gửi hồ sơ thẩm định' }) as HTMLButtonElement).disabled).toBe(false)
  })
})
