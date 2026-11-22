import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ProjectGovernanceEditor } from './ProjectGovernanceEditor'
import * as api from '../api/project-governance-api'

vi.mock('../api/project-governance-api', async () => {
  const actual = await vi.importActual<typeof import('../api/project-governance-api')>('../api/project-governance-api')
  return {
    ...actual,
    getReportingCycle: vi.fn(),
    createReportingCycle: vi.fn(),
    updateReportingCycle: vi.fn(),
    getProjectActionItem: vi.fn(),
    createProjectActionItem: vi.fn(),
    updateProjectActionItem: vi.fn(),
    updateProjectActionItemStatus: vi.fn(),
  }
})

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

const sampleCycles: api.ReportingCycle[] = [
  {
    id: 101,
    projectId: 1,
    projectPeriodId: 10,
    reportType: 'WEEKLY',
    periodStart: '2026-11-12T00:00:00.000Z',
    periodEnd: '2026-11-19T23:59:00.000Z',
    deadline: '2026-11-20T23:59:00.000Z',
    latePolicy: 'FLAG',
    createdBy: 1,
    createdAt: '2026-11-10T00:00:00.000Z',
    updatedAt: '2026-11-10T00:00:00.000Z',
    concurrencyToken: 'token-101',
  },
]

it('prefills edit form when selecting a cycle and submits updated report schedule', async () => {
  vi.mocked(api.getReportingCycle).mockResolvedValue(sampleCycles[0])
  vi.mocked(api.updateReportingCycle).mockResolvedValue({ ...sampleCycles[0], reportType: 'MONTHLY' })

  const run = vi.fn(async (op: () => Promise<unknown>) => {
    await op()
  })

  render(
    <ProjectGovernanceEditor
      projectId={1}
      cycles={sampleCycles}
      actions={[]}
      sources={[]}
      busy={false}
      run={run}
    />
  )

  // Click "Sửa lịch #101"
  const editBtn = screen.getByRole('button', { name: 'Sửa lịch #101' })
  fireEvent.click(editBtn)

  expect(run).toHaveBeenCalled()

  // Form should have "Lưu thay đổi" button now
  const saveBtn = await screen.findByRole('button', { name: 'Lưu thay đổi' })
  expect(saveBtn).toBeDefined()

  // Verify fields are prefilled
  const typeSelect = screen.getByLabelText('Loại báo cáo') as HTMLSelectElement
  expect(typeSelect.value).toBe('WEEKLY')

  // Change type to MONTHLY
  fireEvent.change(typeSelect, { target: { value: 'MONTHLY' } })

  // Submit the form
  fireEvent.submit(saveBtn.closest('form')!)

  await vi.waitFor(() => {
    expect(api.updateReportingCycle).toHaveBeenCalledWith(
      1,
      101,
      expect.objectContaining({
        reportType: 'MONTHLY',
        concurrencyToken: 'token-101',
      })
    )
  })
})

it('blocks submission when deadline is earlier than periodEnd', async () => {
  const run = vi.fn(async (op: () => Promise<unknown>) => {
    await op()
  })

  render(
    <ProjectGovernanceEditor
      projectId={1}
      cycles={[]}
      actions={[]}
      sources={[]}
      busy={false}
      run={run}
    />
  )

  // Fill dates: start = 12/11, end = 30/11, deadline = 23/11 (invalid!)
  const startInput = screen.getByLabelText('Từ ngày') as HTMLInputElement
  const endInput = screen.getByLabelText('Đến ngày') as HTMLInputElement
  const deadlineInput = screen.getByLabelText('Hạn nộp') as HTMLInputElement

  fireEvent.change(startInput, { target: { value: '2026-11-12T00:00' } })
  fireEvent.change(endInput, { target: { value: '2026-11-30T23:59' } })
  fireEvent.change(deadlineInput, { target: { value: '2026-11-23T23:59' } })

  const submitBtn = screen.getByRole('button', { name: 'Tạo lịch nộp' })
  fireEvent.submit(submitBtn.closest('form')!)

  // Custom validity should be set on deadline
  expect(deadlineInput.validationMessage).toContain('Hạn nộp phải bằng hoặc sau ngày kết thúc')
  expect(api.createReportingCycle).not.toHaveBeenCalled()
})
