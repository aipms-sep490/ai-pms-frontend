import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Pagination, generatePageNumbers } from './Pagination'

afterEach(cleanup)

describe('generatePageNumbers', () => {
  it('returns all numbers when pages <= 7', () => {
    expect(generatePageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5])
    expect(generatePageNumbers(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('handles current page at start with trailing ellipsis', () => {
    expect(generatePageNumbers(2, 10)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 10])
  })

  it('handles current page at end with leading ellipsis', () => {
    expect(generatePageNumbers(9, 10)).toEqual([1, 'ellipsis', 6, 7, 8, 9, 10])
  })

  it('handles current page in middle with both ellipses', () => {
    expect(generatePageNumbers(6, 15)).toEqual([1, 'ellipsis', 5, 6, 7, 'ellipsis', 15])
  })
})

describe('Pagination component', () => {
  it('renders records summary and handles page changes', () => {
    const onPage = vi.fn()
    const onPageSizeChange = vi.fn()

    render(
      <Pagination
        page={2}
        pages={5}
        total={45}
        pageSize={10}
        onPage={onPage}
        onPageSizeChange={onPageSizeChange}
      />
    )

    expect(screen.getByText(/Hiển thị/)).toBeTruthy()
    expect(screen.getByText(/11–20/)).toBeTruthy()
    expect(screen.getByText(/45/)).toBeTruthy()

    // Click next page button
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
    expect(onPage).toHaveBeenCalledWith(3)

    // Click direct page number 4
    fireEvent.click(screen.getByRole('button', { name: 'Trang 4' }))
    expect(onPage).toHaveBeenCalledWith(4)

    // Page size dropdown change
    fireEvent.change(screen.getByLabelText('Số bản ghi trên mỗi trang'), { target: { value: '20' } })
    expect(onPageSizeChange).toHaveBeenCalledWith(20)
  })

  it('disables previous button on first page and next button on last page', () => {
    const { rerender } = render(
      <Pagination page={1} pages={3} total={30} onPage={vi.fn()} />
    )
    expect((screen.getByRole('button', { name: 'Trang trước' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Trang sau' }) as HTMLButtonElement).disabled).toBe(false)

    rerender(<Pagination page={3} pages={3} total={30} onPage={vi.fn()} />)
    expect((screen.getByRole('button', { name: 'Trang trước' }) as HTMLButtonElement).disabled).toBe(false)
    expect((screen.getByRole('button', { name: 'Trang sau' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
