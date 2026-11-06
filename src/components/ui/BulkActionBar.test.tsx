import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { BulkActionBar } from './BulkActionBar'

afterEach(cleanup)

describe('BulkActionBar', () => {
  it('counts the selection with its noun', () => {
    render(<BulkActionBar count={3} noun="đồ án" onClear={() => {}} />)
    expect(screen.getByText('Đã chọn 3 đồ án')).toBeTruthy()
  })

  it('names the selected item and reason that block a bulk action', () => {
    render(<BulkActionBar count={3} noun="đồ án" blocked={[{ id: 7, label: 'PRJ-07', reason: 'Đã lưu trữ' }]} onClear={() => {}}><button>Xóa</button></BulkActionBar>)
    const bar = screen.getByRole('region', { name: /đang chọn/i })
    expect(bar.getAttribute('data-tone')).toBe('attention')
    expect(screen.getByText(/PRJ-07/)).toBeTruthy()
    expect(screen.getByText(/Đã lưu trữ/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Xóa' })).toBeNull()
  })

  it('renders nothing when no items are selected', () => {
    const { container } = render(<BulkActionBar count={0} noun="đồ án" onClear={() => {}} />)
    expect(container.firstChild).toBeNull()
  })

  it('lets the user clear a valid selection', () => {
    const onClear = vi.fn()
    render(<BulkActionBar count={1} noun="đồ án" onClear={onClear} />)
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ chọn' }))
    expect(onClear).toHaveBeenCalledOnce()
  })
})
