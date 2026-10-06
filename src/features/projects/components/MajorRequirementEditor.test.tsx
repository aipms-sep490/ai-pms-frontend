import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MajorRequirementEditor } from './MajorRequirementEditor'
import { validateMajorRequirements } from './major-requirement-validation'

describe('MajorRequirementEditor', () => {
  it('validates unique majors and quota consistency before a backend mutation', () => {
    expect(validateMajorRequirements([
      { majorId: 7, minMembers: 0, maxMembers: 1, responsibility: '' },
      { majorId: 7, minMembers: 2, maxMembers: 1, responsibility: 'Duplicate' },
    ], 'INTERDISCIPLINARY').issues).toEqual(expect.arrayContaining([
      'A major can appear only once.',
      'Minimum members must be at least 1.',
      'Maximum members must be at least the minimum.',
      'Each requirement needs a responsibility.',
    ]))
  })

  it('submits a valid requirement list to the backend callback', async () => {
    const onSave = vi.fn().mockResolvedValue(true)
    render(<MajorRequirementEditor projectMode="SINGLE_MAJOR" requirements={[{ majorId: 7, minMembers: 1, maxMembers: 2, responsibility: 'Technical' }]} majors={[{ id: 7, code: 'SE', name: 'Software Engineering' }]} busy={false} onSave={onSave} />)
    fireEvent.click(screen.getByRole('button', { name: /Chỉnh sửa requirements/i }))
    fireEvent.click(screen.getByRole('button', { name: /Lưu requirements/i }))
    expect(onSave).toHaveBeenCalledWith([{ majorId: 7, minMembers: 1, maxMembers: 2, responsibility: 'Technical' }])
    await screen.findByRole('button', { name: /Chỉnh sửa requirements/i })
  })
})
