import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CriterionLevelPanel } from './CriterionLevelPanel'

afterEach(cleanup)

it('does not assign a score to a descriptive level with no suggested range', () => {
  const select = vi.fn()
  render(<CriterionLevelPanel levels={[
    { levelOrder: 1, label: 'Xuất sắc', descriptor: 'Đạt mọi yêu cầu', scoreFrom: null, scoreTo: null },
    { levelOrder: 2, label: 'Chưa đạt', descriptor: 'Cần bổ sung', scoreFrom: 0, scoreTo: 0 },
  ]} onSelectScore={select} />)
  expect(screen.queryByRole('button', { name: 'Xuất sắc' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Chọn 0đ', hidden: true })).toBeTruthy()
  expect(select).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: /Chưa đạt/ }))
  expect(select).toHaveBeenCalledWith(0)
})
