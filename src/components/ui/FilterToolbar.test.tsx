import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { FilterToolbar } from './FilterToolbar'

describe('FilterToolbar', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('switches instant status tabs and debounces live search with clear action', () => {
    vi.useFakeTimers()
    const onTabChange = vi.fn()
    const onSearchChange = vi.fn()
    const onClearAll = vi.fn()

    render(
      <FilterToolbar
        tabs={[
          { value: 'ALL', label: 'Tất cả', count: 12 },
          { value: 'ACTIVE', label: 'Đang làm', count: 5 },
        ]}
        activeTab="ALL"
        onTabChange={onTabChange}
        search=""
        onSearchChange={onSearchChange}
        searchPlaceholder="Tìm công việc…"
        debounceMs={200}
        onClearAll={onClearAll}
      />,
    )

    fireEvent.click(screen.getByRole('tab', { name: /Đang làm/i }))
    expect(onTabChange).toHaveBeenCalledWith('ACTIVE')

    const input = screen.getByPlaceholderText('Tìm công việc…')
    fireEvent.change(input, { target: { value: 'API' } })
    expect(onSearchChange).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(210)
    })
    expect(onSearchChange).toHaveBeenCalledWith('API')

    fireEvent.click(screen.getByRole('button', { name: 'Xóa từ khóa tìm kiếm' }))
    expect(onSearchChange).toHaveBeenLastCalledWith('')
  })

  it('toggles collapsible advanced filters, renders chips, and triggers clear all', () => {
    const onClearAll = vi.fn()
    const onRemoveChip = vi.fn()

    render(
      <FilterToolbar
        advancedControls={<div><span>Trường lọc nâng cao</span></div>}
        advancedActiveCount={0}
        activeChips={[{ id: 'status', label: 'Trạng thái', value: 'Quá hạn' }]}
        onRemoveChip={onRemoveChip}
        hasActiveFilters
        onClearAll={onClearAll}
        resultSummary="Hiển thị 3 / 10 mục"
      />,
    )

    expect(screen.queryByText('Trường lọc nâng cao')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Bộ lọc nâng cao/i }))
    expect(screen.getByText('Trường lọc nâng cao')).toBeTruthy()
    expect(screen.getByText('Hiển thị 3 / 10 mục')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc Trạng thái' }))
    expect(onRemoveChip).toHaveBeenCalledWith('status')

    fireEvent.click(screen.getByRole('button', { name: /Xóa lọc/i }))
    expect(onClearAll).toHaveBeenCalledTimes(1)
  })
})
