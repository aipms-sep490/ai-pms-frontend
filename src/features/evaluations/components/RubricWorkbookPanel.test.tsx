import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { RubricWorkbookPanel } from './RubricWorkbookPanel'
import type { Rubric } from '../rubrics-api'

const api = vi.hoisted(() => ({ downloadRubricWorkbook: vi.fn(), previewRubricWorkbook: vi.fn() }))
vi.mock('../rubrics-api', () => api)

const rubric: Rubric = {
  id: 10, departmentId: 2, academicSemesterId: 3, code: 'R1', name: 'Tiêu chí',
  description: null, status: 'DRAFT', version: 1, concurrencyToken: 'v1', canEdit: true,
  criteria: [],
}

beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)

it('previews the workbook and commits only after explicit confirmation', async () => {
  const onCommitted = vi.fn().mockResolvedValue(undefined)
  const preview = { draft: { name: 'Tiêu chí mới', description: null, criteria: [], concurrencyToken: 'v1' }, issues: [], changes: ['Tên thay đổi'] }
  api.previewRubricWorkbook.mockResolvedValue(preview)
  render(<RubricWorkbookPanel rubric={rubric} dirty={false} onCommitted={onCommitted} />)
  fireEvent.change(screen.getByLabelText('Tệp Excel đã điền'), { target: { files: [new File(['xlsx'], 'rubric.xlsx')] } })
  fireEvent.click(screen.getByRole('button', { name: 'Xem lỗi và thay đổi' }))
  expect(await screen.findByText('Tên thay đổi')).toBeTruthy()
  expect(onCommitted).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận lưu tiêu chí' }))
  await waitFor(() => expect(onCommitted).toHaveBeenCalledWith(preview))
})

it('does not upload an invalid file or overwrite a dirty editor', () => {
  render(<RubricWorkbookPanel rubric={rubric} dirty={false} onCommitted={vi.fn()} />)
  fireEvent.change(screen.getByLabelText('Tệp Excel đã điền'), { target: { files: [new File(['x'], 'rubric.xls')] } })
  fireEvent.click(screen.getByRole('button', { name: 'Xem lỗi và thay đổi' }))
  expect(screen.getByRole('alert').textContent).toContain('.xlsx')
  expect(api.previewRubricWorkbook).not.toHaveBeenCalled()
  cleanup()
  render(<RubricWorkbookPanel rubric={rubric} dirty onCommitted={vi.fn()} />)
  expect((screen.getByRole('button', { name: 'Xem lỗi và thay đổi' }) as HTMLButtonElement).disabled).toBe(true)
})

it('clears a stale preview when the rubric token changes', async () => {
  api.previewRubricWorkbook.mockResolvedValue({ draft: { name: 'X', criteria: [], concurrencyToken: 'v1' }, issues: [], changes: ['Cũ'] })
  const { rerender } = render(<RubricWorkbookPanel rubric={rubric} dirty={false} onCommitted={vi.fn()} />)
  fireEvent.change(screen.getByLabelText('Tệp Excel đã điền'), { target: { files: [new File(['xlsx'], 'rubric.xlsx')] } })
  fireEvent.click(screen.getByRole('button', { name: 'Xem lỗi và thay đổi' }))
  expect(await screen.findByText('Cũ')).toBeTruthy()
  rerender(<RubricWorkbookPanel rubric={{ ...rubric, concurrencyToken: 'v2' }} dirty={false} onCommitted={vi.fn()} />)
  await waitFor(() => expect(screen.queryByText('Cũ')).toBeNull())
  expect((screen.getByRole('button', { name: 'Xem lỗi và thay đổi' }) as HTMLButtonElement).disabled).toBe(true)
})
