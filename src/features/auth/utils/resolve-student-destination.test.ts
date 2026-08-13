import { describe, expect, it } from 'vitest'
import { resolveStudentDestination } from './resolve-student-destination'

describe('resolveStudentDestination', () => {
  it('sends an active project to its workspace', () => {
    expect(resolveStudentDestination('ACTIVE')).toBe('/project/workspace')
  })

  it('sends a revision request back to project editing', () => {
    expect(resolveStudentDestination('REVISION_REQUIRED')).toBe('/project/edit')
  })
})
