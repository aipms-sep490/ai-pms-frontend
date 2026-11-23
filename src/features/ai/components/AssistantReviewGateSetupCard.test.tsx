import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AssistantReviewGateSetupCard } from './AssistantReviewGateSetupCard'
import * as api from '../academic-ai-api'

vi.mock('../academic-ai-api', async importOriginal => {
  const actual = await importOriginal<typeof import('../academic-ai-api')>()
  return {
    ...actual,
    applyReviewGateAiSetup: vi.fn(),
  }
})

describe('AssistantReviewGateSetupCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validates 100% total weight and calls applyReviewGateAiSetup with selected period', async () => {
    vi.mocked(api.applyReviewGateAiSetup).mockResolvedValue({
      templateId: 501,
      code: 'GATE_SE_2026',
      name: 'Khung SE 2026',
      status: 'DRAFT',
      gatesCount: 2,
      replay: false,
      warnings: null,
    })

    const onApplied = vi.fn()
    render(
      <AssistantReviewGateSetupCard
        runId={77}
        canApply
        periods={[{ id: 101, code: 'P1', name: 'Đợt chính Fall 2026' }]}
        majors={[{ id: 11, code: 'SE', name: 'Kỹ thuật phần mềm' }]}
        plan={{
          code: 'GATE_SE_2026',
          name: 'Khung SE 2026',
          mode: 'SINGLE_MAJOR',
          majorCode: 'SE',
          summary: 'Đề xuất 2 cổng chuẩn.',
          warnings: [],
          gates: [
            {
              code: 'G1',
              sequence: 1,
              title: 'Cổng 1',
              objective: 'Chốt SRS',
              weight: 40,
              startDate: '2026-09-10',
              endDate: '2026-09-20',
              required: true,
              blockNextGate: true,
              blocksDefense: false,
              reviewerPolicy: 'SUPERVISOR',
              reviewScope: 'COMMON',
              requirements: [
                { code: 'G1_SRS', title: 'Tài liệu SRS', type: 'FILE', scope: 'COMMON', verification: 'HUMAN', required: true },
              ],
            },
            {
              code: 'G2',
              sequence: 2,
              title: 'Cổng 2',
              objective: 'Nghiệm thu',
              weight: 60,
              startDate: '2026-10-10',
              endDate: '2026-11-10',
              required: true,
              blockNextGate: false,
              blocksDefense: true,
              reviewerPolicy: 'COUNCIL',
              reviewScope: 'COMMON',
              requirements: [
                { code: 'G2_FINAL', title: 'Báo cáo tổng kết', type: 'FILE', scope: 'COMMON', verification: 'HUMAN', required: true },
              ],
            },
          ],
        }}
        onApplied={onApplied}
      />,
    )

    expect(screen.getByText(/Tổng trọng số: 100% \/ 100%/i)).toBeTruthy()
    const applyBtn = screen.getByRole('button', { name: 'Lưu bản nháp Cổng thẩm định' }) as HTMLButtonElement
    expect(applyBtn.disabled).toBe(false)
    fireEvent.click(applyBtn)

    await waitFor(() => {
      expect(api.applyReviewGateAiSetup).toHaveBeenCalledTimes(1)
    })
    expect(api.applyReviewGateAiSetup).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 77,
        projectPeriodId: 101,
        code: 'GATE_SE_2026',
        mode: 'SINGLE_MAJOR',
      }),
    )
    expect(onApplied).toHaveBeenCalledWith(expect.objectContaining({ templateId: 501, status: 'DRAFT' }))
  })
})
