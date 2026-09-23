import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MajorRequirementEditor } from './MajorRequirementEditor'
import { validateMajorRequirements } from './major-requirement-validation'

describe('MajorRequirementEditor foundation', () => {
  it('validates unique majors and quota consistency for a future backend mutation', () => {
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

  it('states that the editor foundation has no local persistence', () => {
    render(<MajorRequirementEditor projectMode="INTERDISCIPLINARY" requirements={[{ majorId: 7, minMembers: 1, maxMembers: 2, responsibility: 'Technical' }]} />)
    expect(screen.getByText(/No local changes are persisted/)).toBeTruthy()
    expect(screen.getByText(/at least two major requirements/)).toBeTruthy()
  })
})
