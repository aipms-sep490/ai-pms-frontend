import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TopicAiBatchPreview } from './TopicAiBatchModal'
import * as api from '../../ai/academic-ai-api'

vi.mock('../../ai/academic-ai-api', async importOriginal => {
  const actual = await importOriginal<typeof import('../../ai/academic-ai-api')>()
  return {
    ...actual,
    applyTopicBatchAiSetup: vi.fn(),
  }
})

describe('TopicAiBatchPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('auto-deselects duplicate title conflicts and creates selected draft topics', async () => {
    vi.mocked(api.applyTopicBatchAiSetup).mockResolvedValue({
      createdCount: 1,
      skippedCount: 0,
      replay: false,
      created: [{ tempKey: 'TOP_1', topicId: 88, code: 'CAP_01', title: 'Đề tài mới hợp lệ', status: 'DRAFT' }],
      skipped: [],
      warnings: [],
    })

    const onApplied = vi.fn()
    render(
      <TopicAiBatchPreview
        runId={99}
        leadDepartmentId={10}
        periods={[{ id: 300, code: 'REG_2026', name: 'Đăng ký Fall 2026', periodType: 'REGISTRATION' }]}
        majors={[{ id: 1, code: 'SE', name: 'Kỹ thuật phần mềm' }]}
        plan={{
          summary: 'Trích xuất 2 đề tài từ file Excel.',
          warnings: ['Phát hiện 1 đề tài trùng tiêu đề 3 kỳ.'],
          topics: [
            {
              tempKey: 'TOP_1',
              code: 'CAP_01',
              title: 'Đề tài mới hợp lệ',
              domain: 'EdTech',
              technologies: ['React'],
              keywords: ['AI'],
              projectMode: 'SINGLE_MAJOR',
              primaryMajorId: 1,
              requirements: [],
              duplicateTitleConflict: false,
            },
            {
              tempKey: 'TOP_2',
              code: 'CAP_02',
              title: 'Đề tài trùng kỳ trước',
              domain: 'EdTech',
              technologies: ['React'],
              keywords: ['AI'],
              projectMode: 'SINGLE_MAJOR',
              primaryMajorId: 1,
              requirements: [],
              duplicateTitleConflict: true,
              duplicateTitleDetail: 'Trùng hoàn toàn với đề tài ở kỳ SP26.',
            },
          ],
        }}
        onApplied={onApplied}
      />,
    )

    expect(screen.getByText('Trùng tiêu đề 3 kỳ')).toBeTruthy()
    const validCheckbox = screen.getByRole('checkbox', { name: 'Chọn đề tài Đề tài mới hợp lệ' }) as HTMLInputElement
    const dupCheckbox = screen.getByRole('checkbox', { name: 'Chọn đề tài Đề tài trùng kỳ trước' }) as HTMLInputElement
    expect(validCheckbox.checked).toBe(true)
    expect(dupCheckbox.checked).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Tạo 1 bản nháp đề tài' }))

    await waitFor(() => {
      expect(api.applyTopicBatchAiSetup).toHaveBeenCalledTimes(1)
    })
    expect(api.applyTopicBatchAiSetup).toHaveBeenCalledWith(
      expect.objectContaining({
        projectPeriodId: 300,
        leadDepartmentId: 10,
        topics: [expect.objectContaining({ code: 'CAP_01' })],
      }),
    )
    expect(onApplied).toHaveBeenCalled()
  })
})
