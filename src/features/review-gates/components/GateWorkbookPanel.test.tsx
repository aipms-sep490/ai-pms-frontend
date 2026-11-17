import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { GateWorkbookPanel } from './GateWorkbookPanel'
import type { ReviewGateTemplate } from '../types/review-gates.types'

const api = vi.hoisted(() => ({ downloadGateWorkbook: vi.fn(), previewGateWorkbook: vi.fn(), commitGateWorkbook: vi.fn() }))
vi.mock('../api/review-gates-api', () => api)

const template: ReviewGateTemplate = {
  id: '5', code: 'GATE', name: 'Gate policy', mode: 'SINGLE_MAJOR', major: 'COMMON', gatesCount: 1,
  projectPeriodId: 11, status: 'DRAFT', version: '1', concurrencyToken: 'token-1', gates: [],
}
beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)

it('keeps Gate workbook preview separate from the confirmed save', async () => {
  const preview = { draft: { code: 'GATE', concurrencyToken: 'token-1', gates: [] }, issues: [], changes: ['Một Gate'] }
  const updated = { ...template, concurrencyToken: 'token-2' }
  api.previewGateWorkbook.mockResolvedValue(preview)
  api.commitGateWorkbook.mockResolvedValue(updated)
  const onSaved = vi.fn()
  render(<GateWorkbookPanel template={template} dirty={false} onSaved={onSaved} />)
  fireEvent.change(screen.getByLabelText('Tệp Gate đã điền'), { target: { files: [new File(['xlsx'], 'gate.xlsx')] } })
  fireEvent.click(screen.getByRole('button', { name: 'Xem lỗi và thay đổi' }))
  expect(await screen.findByText('Một Gate')).toBeTruthy()
  expect(api.commitGateWorkbook).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận lưu mẫu Gate' }))
  await waitFor(() => expect(api.commitGateWorkbook).toHaveBeenCalledWith('5', preview.draft))
  expect(onSaved).toHaveBeenCalledWith(updated)
})

it('does not import over unsaved edits', () => {
  render(<GateWorkbookPanel template={template} dirty onSaved={vi.fn()} />)
  expect((screen.getByLabelText('Tệp Gate đã điền') as HTMLInputElement).disabled).toBe(true)
  expect(screen.getByText('Lưu thay đổi trên màn hình trước khi nhập Excel.')).toBeTruthy()
})
