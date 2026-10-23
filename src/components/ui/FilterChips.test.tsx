import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { FilterChips } from './FilterChips'

afterEach(cleanup)

describe('FilterChips', () => {
  it('renders nothing when chips array is empty', () => {
    const { container } = render(<FilterChips chips={[]} onRemove={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders active chips and handles remove and clear all', () => {
    const onRemove = vi.fn()
    const onClearAll = vi.fn()

    render(
      <FilterChips
        chips={[
          { id: 'search', label: 'Tên tệp', value: 'báo cáo' },
          { id: 'source', label: 'Nguồn', value: 'Công việc' },
        ]}
        onRemove={onRemove}
        onClearAll={onClearAll}
      />
    )

    expect(screen.getByText('báo cáo')).toBeTruthy()
    expect(screen.getByText('Công việc')).toBeTruthy()

    // Click remove on search chip
    fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc Tên tệp' }))
    expect(onRemove).toHaveBeenCalledWith('search')

    // Click clear all
    fireEvent.click(screen.getByRole('button', { name: 'Xóa tất cả' }))
    expect(onClearAll).toHaveBeenCalled()
  })
})
