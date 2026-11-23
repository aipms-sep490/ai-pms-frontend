import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AssistantRubricSetupCard } from './AssistantSetupPlanCard'
import type { AssistantRubricSetupPlan } from '../academic-ai-api'

const api = vi.hoisted(() => ({
  applyRubricAiSetup: vi.fn(),
  applyProjectAiSetup: vi.fn(),
}))

vi.mock('../academic-ai-api', async () => {
  const actual = await vi.importActual<typeof import('../academic-ai-api')>('../academic-ai-api')
  return { ...actual, applyRubricAiSetup: api.applyRubricAiSetup, applyProjectAiSetup: api.applyProjectAiSetup }
})

const plan: AssistantRubricSetupPlan = {
  code: 'RUB_SE_DEF_2026',
  name: 'Rubric Bảo vệ SE',
  description: 'Đánh giá bảo vệ đồ án',
  projectMode: 'SINGLE_MAJOR',
  evaluationStage: 'DEFENSE',
  evaluationScope: 'MAJOR_SPECIFIC',
  warnings: [],
  criteria: [
    {
      tempKey: 'C1',
      parentTempKey: null,
      name: 'Kiến trúc hệ thống',
      description: 'Thiết kế rõ ràng',
      weightPercent: 60,
      maxScore: 10,
      isRequired: true,
      learningOutcome: 'CLO1',
      evidenceGuidance: 'Tài liệu SDS',
      levels: [
        { levelOrder: 1, label: 'Xuất sắc', descriptor: 'Đầy đủ và tối ưu', scoreFrom: 8.5, scoreTo: 10 },
      ],
    },
    {
      tempKey: 'C2',
      parentTempKey: null,
      name: 'Triển khai & Kiểm thử',
      description: 'Mã nguồn sạch',
      weightPercent: 40,
      maxScore: 10,
      isRequired: true,
      learningOutcome: 'CLO2',
      evidenceGuidance: 'Báo cáo test',
      levels: [],
    },
  ],
}

beforeEach(() => {
  api.applyRubricAiSetup.mockReset()
  api.applyRubricAiSetup.mockResolvedValue({
    rubricId: 99,
    code: 'RUB_SE_DEF_2026',
    name: 'Rubric Bảo vệ SE',
    status: 'DRAFT',
    criteriaCount: 2,
    replay: false,
    warnings: ['Cần kiểm tra lại mức chất lượng.'],
  })
})

afterEach(cleanup)

describe('AssistantRubricSetupCard', () => {
  it('lets staff pick department, semester, major and fill 4 standard levels before applying DRAFT', async () => {
    const onApplied = vi.fn()
    render(
      <AssistantRubricSetupCard
        runId={77}
        plan={plan}
        canApply
        departments={[{ id: 3, name: 'Khoa CNTT' }]}
        semesters={[{ id: 12, code: 'FA26', name: 'Học kỳ Thu 2026' }]}
        majors={[{ id: 21, code: 'SE', name: 'Kỹ thuật phần mềm', departmentId: 3 }]}
        onApplied={onApplied}
      />,
    )

    // Major is required because evaluationScope === MAJOR_SPECIFIC
    const submitBtn = screen.getByRole('button', { name: 'Tạo bộ tiêu chí bản nháp' }) as HTMLButtonElement
    expect(submitBtn.disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('Chuyên ngành áp dụng bộ tiêu chí'), { target: { value: '21' } })
    expect(submitBtn.disabled).toBe(false)

    // Fill 4 standard levels on criterion 1
    fireEvent.click(screen.getAllByRole('button', { name: 'Điền sẵn 4 mức chuẩn' })[0])
    expect(screen.getByDisplayValue('Khá / Tốt')).toBeTruthy()

    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(api.applyRubricAiSetup).toHaveBeenCalledWith(
        expect.objectContaining({
          runId: 77,
          departmentId: 3,
          academicSemesterId: 12,
          majorId: 21,
          code: 'RUB_SE_DEF_2026',
          evaluationScope: 'MAJOR_SPECIFIC',
        }),
      )
    })
    expect(onApplied).toHaveBeenCalledWith(expect.objectContaining({ rubricId: 99, status: 'DRAFT' }))
    expect(await screen.findByText(/Cần kiểm tra lại mức chất lượng/)).toBeTruthy()
  })
})
