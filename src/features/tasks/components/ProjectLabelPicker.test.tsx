import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProjectLabelPicker } from './ProjectLabelPicker'

describe('ProjectLabelPicker (PR-P1-D)', () => {
  const sampleLabels = [
    { id: 1, slug: 'bug', name: 'Bug', colorHex: '#DC2626', description: 'Lỗi cần xử lý', isSystem: true },
    { id: 2, slug: 'integration', name: 'Integration', colorHex: '#115E59', description: 'Điểm giao IT <-> MKT', isSystem: true },
  ]

  it('splits Selected and Labels groups, filters by text, and restricts Edit labels by role', () => {
    const onToggle = vi.fn()
    const onEdit = vi.fn()
    render(
      <ProjectLabelPicker
        labels={sampleLabels}
        selectedSlugs={['bug']}
        canEditCatalog
        onToggle={onToggle}
        onEditCatalog={onEdit}
      />,
    )

    expect(screen.getByText('Selected')).toBeTruthy()
    expect(screen.getByText('Labels')).toBeTruthy()
    fireEvent.click(screen.getByLabelText(/Integration/))
    expect(onToggle).toHaveBeenCalledWith('integration')

    fireEvent.change(screen.getByLabelText('Lọc nhãn'), { target: { value: 'MKT' } })
    expect(screen.queryByText('Bug')).toBeNull()
    expect(screen.getByText('Integration')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Quản lý nhãn (Edit labels)' }))
    expect(onEdit).toHaveBeenCalledTimes(1)
  })
})
