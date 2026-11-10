import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ImportDialog } from './ImportDialog'

afterEach(cleanup)

const rows: { id: number; status: 'error' | 'warning' | 'valid' }[] = Array.from({ length: 13 }, (_, index) => ({ id: index + 1, status: index === 0 ? 'error' : index === 1 ? 'warning' : 'valid' }))

function setup(overrides: Record<string, unknown> = {}) {
  const onCommit = vi.fn()
  render(<ImportDialog
    title="Nhập dữ liệu" onClose={vi.fn()} authorized busy={false}
    notice={<p>Lưu ý khi nhập</p>} templateHref="/templates/sample.csv"
    fileLabel="Tệp dữ liệu" file={null} accept=".csv,.xlsx" limits="5 MB · 500 dòng"
    onFileChange={vi.fn()} onPreview={vi.fn()} previewDisabled
    preview={{ rows, label: 'Kết quả xem trước', regionLabel: 'Chi tiết', columns: ['Dòng'],
      getKey: row => row.id, getStatus: row => row.status,
      renderRow: row => <td>{row.id}</td>,
      validLabel: 'sẽ tạo mới', warningLabel: 'sẽ cập nhật',
      canCommit: true, commitCount: 12, confirmationLabel: 'Tôi xác nhận' }}
    onCommit={onCommit} {...overrides}
  />)
  return { onCommit }
}

it('shows upload guidance and count in commit label', () => {
  setup()
  expect(screen.getByText('Lưu ý khi nhập')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Tải mẫu CSV' }).getAttribute('href')).toBe('/templates/sample.csv')
  expect(screen.getByText(/11 sẽ tạo mới/)).toBeTruthy()
  expect(screen.getByText(/1 sẽ cập nhật/)).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Xác nhận nhập (12)' })).toBeTruthy()
})

it('blocks commit when preview contains an error', () => {
  const { onCommit } = setup()
  const commit = screen.getByRole('button', { name: 'Xác nhận nhập (12)' }) as HTMLButtonElement
  expect(commit.disabled).toBe(true)
  fireEvent.click(commit)
  expect(onCommit).not.toHaveBeenCalled()
})

it('commits a clean preview only after explicit confirmation', () => {
  const cleanRows = rows.filter(row => row.status !== 'error')
  const { onCommit } = setup({ preview: { rows: cleanRows, label: 'Kết quả xem trước', regionLabel: 'Chi tiết', columns: ['Dòng'],
    getKey: (row: typeof rows[number]) => row.id, getStatus: (row: typeof rows[number]) => row.status,
    renderRow: (row: typeof rows[number]) => <td>{row.id}</td>, validLabel: 'sẽ tạo mới', warningLabel: 'sẽ cập nhật',
    canCommit: true, commitCount: 12, confirmationLabel: 'Tôi xác nhận' } })
  const commit = screen.getByRole('button', { name: 'Xác nhận nhập (12)' }) as HTMLButtonElement
  expect(commit.disabled).toBe(true)
  fireEvent.click(screen.getByRole('checkbox', { name: 'Tôi xác nhận' }))
  expect(commit.disabled).toBe(false)
  fireEvent.click(commit)
  expect(onCommit).toHaveBeenCalledOnce()
})

it('filters to error rows and offers a return to upload', () => {
  setup()
  fireEvent.click(screen.getByRole('checkbox', { name: 'Chỉ hiện dòng lỗi' }))
  expect(screen.getAllByRole('row')).toHaveLength(2)
  fireEvent.click(screen.getByRole('button', { name: 'Quay lại chọn tệp' }))
  expect(screen.queryByRole('region', { name: 'Chi tiết' })).toBeNull()
})
