import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AssistantProjectSetupCard, AssistantRubricSetupCard } from './AssistantSetupPlanCard'
import type { AssistantProjectSetupPlan, AssistantRubricSetupPlan } from '../academic-ai-api'
import { HttpError } from '../../../services/http/http-client'

const mocks = vi.hoisted(() => ({
  applyProjectAiSetup: vi.fn(),
  applyRubricAiSetup: vi.fn(),
}))

vi.mock('../academic-ai-api', () => ({
  applyProjectAiSetup: mocks.applyProjectAiSetup,
  applyRubricAiSetup: mocks.applyRubricAiSetup,
}))

beforeEach(() => { vi.clearAllMocks() })
afterEach(cleanup)

const projectPlan: AssistantProjectSetupPlan = {
  summary: 'Kế hoạch giai đoạn SRS và API cho đồ án AI-PMS.',
  milestones: [{ tempKey: 'M1', existingMilestoneId: null, title: 'Mốc 1: SRS & Thiết kế', description: 'Hoàn thiện tài liệu và schema', startDate: '2026-11-23', dueDate: '2026-12-05' }],
  deliverables: [{ tempKey: 'D1', title: 'Tài liệu SRS v1', description: 'Bản hoàn chỉnh', deliverableType: 'DOCUMENT', milestoneRef: 'M1', evidenceScope: 'COMMON', acceptanceCriteria: ['Có đủ 6 chương', 'Có sơ đồ ERD'] }],
  tasks: [
    { tempKey: 'T1', title: 'Thiết kế schema DB', description: 'Tạo migration', priority: 'HIGH', milestoneRef: 'M1', assigneeNames: ['Nguyễn Quang Khải'], primaryMajorName: 'Software Engineering', acceptanceCriteria: ['Script idempotent'], dependsOnRefs: [] },
    { tempKey: 'T2', title: 'Viết API', description: 'REST endpoints', priority: 'MEDIUM', milestoneRef: 'M1', assigneeNames: ['Võ Văn Tín'], primaryMajorName: 'Software Engineering', acceptanceCriteria: ['Test pass 100%'], dependsOnRefs: ['T1'] },
  ],
  warnings: [],
}

it('lets leader preview, edit criteria, toggle items and apply project setup in one click', async () => {
  mocks.applyProjectAiSetup.mockResolvedValue({
    projectId: 9, replay: false, milestonesCreated: 1, deliverablesCreated: 1, tasksCreated: 1,
    taskCriteriaCreated: 2, dependenciesCreated: 0, items: [], warnings: [],
  })
  const onNav = vi.fn()
  render(<AssistantProjectSetupCard projectId={9} runId={55} plan={projectPlan} canApply onNavigateTarget={onNav} />)

  // Uncheck second task, edit first task's acceptance criteria
  fireEvent.click(screen.getByLabelText(/T2 · M1/))
  fireEvent.change(screen.getAllByLabelText(/Checklist tiêu chí nghiệm thu/)[0], { target: { value: 'Script idempotent\nCó ràng buộc khóa ngoại' } })

  fireEvent.click(screen.getByRole('button', { name: 'Tự động áp dụng vào đồ án' }))
  expect(await screen.findByText('Đã thiết lập tự động vào đồ án')).toBeTruthy()
  expect(mocks.applyProjectAiSetup).toHaveBeenCalledWith(9, expect.objectContaining({
    runId: 55,
    tasks: [expect.objectContaining({ tempKey: 'T1', acceptanceCriteria: ['Script idempotent', 'Có ràng buộc khóa ngoại'] })],
  }))

  fireEvent.click(screen.getByRole('button', { name: 'Mở bảng công việc' }))
  expect(onNav).toHaveBeenCalledWith('tasks')
})

it('preserves user edits on API error and hides apply button when user lacks authority', async () => {
  mocks.applyProjectAiSetup.mockRejectedValueOnce(new HttpError('Trạng thái đồ án đã thay đổi.', 409))
  const view = render(<AssistantProjectSetupCard projectId={9} plan={projectPlan} canApply />)
  fireEvent.change(screen.getByLabelText('Tên công việc 1'), { target: { value: 'Tên đã chỉnh tay' } })
  fireEvent.click(screen.getByRole('button', { name: 'Tự động áp dụng vào đồ án' }))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Trạng thái đồ án đã thay đổi.')
  expect((screen.getByLabelText('Tên công việc 1') as HTMLInputElement).value).toBe('Tên đã chỉnh tay')

  view.unmount()
  render(<AssistantProjectSetupCard projectId={9} plan={projectPlan} canApply={false} />)
  expect(screen.queryByRole('button', { name: 'Tự động áp dụng vào đồ án' })).toBeNull()
  expect(screen.getByText(/Chỉ Trưởng nhóm hoặc GVHD/)).toBeTruthy()
})

it('validates 100% root weight sum and applies draft rubric setup for department staff', async () => {
  const rubricPlan: AssistantRubricSetupPlan = {
    code: 'RUBRIC_SE_2026', name: 'Rubric Bảo vệ SE', description: 'Đánh giá bảo vệ cuối kỳ',
    projectMode: 'SINGLE_MAJOR', evaluationStage: 'DEFENSE', evaluationScope: 'COMMON',
    criteria: [
      { tempKey: 'C1', name: 'Thiết kế & Kiến trúc', weightPercent: 40, isRequired: true, levels: [] },
      { tempKey: 'C2', name: 'Triển khai & Kiểm thử', weightPercent: 60, isRequired: true, levels: [] },
    ],
    warnings: [],
  }
  mocks.applyRubricAiSetup.mockResolvedValue({ rubricId: 7, code: 'RUBRIC_SE_2026', name: 'Rubric Bảo vệ SE', status: 'DRAFT', criteriaCount: 2, replay: false })
  const onOpenRubrics = vi.fn()
  render(<AssistantRubricSetupCard runId={88} plan={rubricPlan} canApply academicSemesterId={3} onOpenRubrics={onOpenRubrics} />)

  // Change weight so total != 100% -> button disabled
  const weightInputs = screen.getAllByRole('spinbutton')
  fireEvent.change(weightInputs[0], { target: { value: '50' } })
  expect((screen.getByRole('button', { name: 'Tạo bộ tiêu chí nháp (DRAFT)' }) as HTMLButtonElement).disabled).toBe(true)

  // Restore to 40% -> total 100% -> apply succeeds
  fireEvent.change(weightInputs[0], { target: { value: '40' } })
  fireEvent.click(screen.getByRole('button', { name: 'Tạo bộ tiêu chí nháp (DRAFT)' }))
  await waitFor(() => expect(screen.getByText('Đã tạo bộ tiêu chí nháp (DRAFT)')).toBeTruthy())
  expect(mocks.applyRubricAiSetup).toHaveBeenCalledWith(expect.objectContaining({ code: 'RUBRIC_SE_2026', academicSemesterId: 3 }))
  fireEvent.click(screen.getByRole('button', { name: 'Mở quản lý Bộ tiêu chí' }))
  expect(onOpenRubrics).toHaveBeenCalled()
})
