import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
  afterEach(cleanup)

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

  it('skips archived and expired periods when picking default and keeps form retryable if 0 topics are created', async () => {
    vi.mocked(api.applyTopicBatchAiSetup).mockResolvedValue({
      createdCount: 0,
      skippedCount: 1,
      replay: false,
      created: [],
      skipped: [{ tempKey: 'TOP_1', code: 'CAP_01', title: 'Đề tài lỗi', reason: 'Kỳ đăng ký đã đóng.' }],
      warnings: [],
    })

    const onApplied = vi.fn()
    render(
      <TopicAiBatchPreview
        runId={101}
        leadDepartmentId={10}
        activeSemesterId={20}
        periods={[
          { id: 40007, academicSemesterId: 19, semesterCode: 'F8', code: 'F8-REG', name: 'Kỳ lưu trữ', periodType: 'REGISTRATION', status: 'ARCHIVED', endAt: '2099-12-30T00:00:00Z' },
          { id: 20002, academicSemesterId: 18, semesterCode: 'FA25', code: 'OLD-REG', name: 'Kỳ đã hết hạn', periodType: 'REGISTRATION', status: 'DRAFT', endAt: '2020-01-01T00:00:00Z' },
          { id: 30003, academicSemesterId: 20, semesterCode: 'DST', code: 'DST-REG-NOW', name: 'Đăng ký hiện hành', periodType: 'REGISTRATION', status: 'ACTIVE', endAt: '2099-12-30T00:00:00Z' },
        ]}
        majors={[{ id: 1, code: 'SE', name: 'Kỹ thuật phần mềm' }]}
        plan={{
          summary: '1 đề tài test.',
          warnings: [],
          topics: [
            {
              tempKey: 'TOP_1',
              code: 'CAP_01',
              title: 'Đề tài lỗi',
              domain: 'EdTech',
              technologies: ['React'],
              keywords: ['AI'],
              projectMode: 'SINGLE_MAJOR',
              primaryMajorId: 1,
              requirements: [],
              duplicateTitleConflict: false,
            },
          ],
        }}
        onApplied={onApplied}
      />,
    )

    const select = screen.getByLabelText('Kỳ đăng ký tạo hàng loạt đề tài') as HTMLSelectElement
    expect(select.value).toBe('30003')

    fireEvent.click(screen.getByRole('button', { name: 'Tạo 1 bản nháp đề tài' }))

    await waitFor(() => {
      expect(api.applyTopicBatchAiSetup).toHaveBeenCalledWith(expect.objectContaining({ projectPeriodId: 30003 }))
    })
    expect(onApplied).not.toHaveBeenCalled()
    expect(await screen.findByText(/Chưa tạo được bản nháp đề tài nào/)).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Tạo 1 bản nháp đề tài' }) as HTMLButtonElement).disabled).toBe(false)
  })
})
