import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { EvaluatorAssignmentsPage } from './EvaluatorAssignmentsPage'

const api = vi.hoisted(() => ({ getAllMyEvaluationAssignments: vi.fn() }))
vi.mock('../../services/api/evaluations.api', async importOriginal => ({ ...await importOriginal<typeof import('../../services/api/evaluations.api')>(), getAllMyEvaluationAssignments: api.getAllMyEvaluationAssignments }))

beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)

it('shows the server assigned stage and scope on each evaluation card', async () => {
  api.getAllMyEvaluationAssignments.mockResolvedValue([{ id: 41, projectId: 9, projectTitle: 'StudySpace', evaluationType: 'LECTURER', rubricId: 7, rubricName: 'Rubric hệ thống', departmentId: 2, assignedAt: '2026-10-02T00:00:00Z', scope: 'MAJOR_SPECIFIC', majorName: 'Công nghệ thông tin', stage: 'COLD' }])
  render(<MemoryRouter><EvaluatorAssignmentsPage /></MemoryRouter>)
  expect(await screen.findByText(/Rubric hệ thống · Giai đoạn: Chấm hồ sơ đã khóa · Phạm vi: Công nghệ thông tin/)).toBeTruthy()
})

it('distinguishes no assignment from an unfinished score', async () => {
  api.getAllMyEvaluationAssignments.mockResolvedValue([])
  render(<MemoryRouter><EvaluatorAssignmentsPage /></MemoryRouter>)
  expect(await screen.findByRole('region', { name: 'Chưa có phân công đánh giá đang hiệu lực' })).toBeTruthy()
  expect(screen.queryByText('0 điểm')).toBeNull()
})
