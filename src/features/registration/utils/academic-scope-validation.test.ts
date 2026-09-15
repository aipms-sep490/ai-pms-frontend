import { describe, expect, it } from 'vitest'
import { validateAcademicScopeDraft } from './academic-scope-validation'

describe('validateAcademicScopeDraft', () => {
  it('accepts a SINGLE_MAJOR scope with an authoritative primary major', () => {
    expect(validateAcademicScopeDraft({
      projectMode: 'SINGLE_MAJOR',
      leadDepartmentId: 8,
      primaryMajorId: 12,
      requirements: [],
    })).toEqual([])
  })

  it('requires PrimaryMajor for SINGLE_MAJOR', () => {
    expect(validateAcademicScopeDraft({
      projectMode: 'SINGLE_MAJOR', leadDepartmentId: 8, requirements: [],
    })).toContain('SINGLE_MAJOR requires PrimaryMajor.')
  })

  it('accepts two or more complete INTERDISCIPLINARY requirements', () => {
    expect(validateAcademicScopeDraft({
      projectMode: 'INTERDISCIPLINARY', leadDepartmentId: 8, requirements: [
        { majorId: 12, minMembers: 1, maxMembers: 2, responsibility: 'Frontend' },
        { majorId: 14, minMembers: 1, maxMembers: 3, responsibility: 'Data' },
      ],
    })).toEqual([])
  })

  it('rejects invalid IDs, duplicate majors, invalid quotas and blank responsibilities', () => {
    expect(validateAcademicScopeDraft({
      projectMode: 'INTERDISCIPLINARY', leadDepartmentId: undefined, requirements: [
        { majorId: 0, minMembers: 0, maxMembers: 0, responsibility: ' ' },
        { majorId: 0, minMembers: 2, maxMembers: 1, responsibility: 'Backend' },
      ],
    })).toEqual(expect.arrayContaining([
      'LeadDepartment must be supplied by an authorized backend scope.',
      'Each major requirement must use an authoritative major ID.',
      'Major requirements must not contain duplicate major IDs.',
      'Each major requirement must have at least one required member.',
      'A major requirement maximum must be greater than or equal to its minimum.',
      'Each major requirement must include a responsibility.',
    ]))
  })
})
