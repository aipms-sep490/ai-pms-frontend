import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { createAcademicNameResolver } from './academic-name-resolver'
import { ProjectAcademicScopePanel } from './ProjectAcademicScopePanel'

afterEach(cleanup)
const names = createAcademicNameResolver([{ organization: {} as any, departments: [{
  department: { id: 4, name: 'Department of Computing', code: 'COMP' } as any,
  majors: [
    { id: 7, name: 'Software Engineering', code: 'SE' } as any,
    { id: 8, name: 'Business Administration', code: 'BA' } as any,
  ],
}] }])

describe('ProjectAcademicScopePanel', () => {
  it('renders SINGLE_MAJOR primary evidence without cross-department controls', () => {
    render(<ProjectAcademicScopePanel names={names} scope={{ projectMode: 'SINGLE_MAJOR', primaryMajorId: 7, leadDepartmentId: 4, requirements: [] }} members={[{ userId: 1, fullName: 'Linh', majorId: 7, isLeader: true }]} />)
    expect(screen.getByText('SINGLE_MAJOR')).toBeTruthy()
    expect(screen.getByText('Software Engineering (SE)')).toBeTruthy()
    expect(screen.getByText(/no participating-department review action/i)).toBeTruthy()
    expect(screen.queryByText(/Approve as participating/)).toBeNull()
  })

  it('renders every INTERDISCIPLINARY quota, responsibility and verified roster major', () => {
    render(<ProjectAcademicScopePanel names={names} scope={{ projectMode: 'INTERDISCIPLINARY', primaryMajorId: null, leadDepartmentId: 4, requirements: [
      { majorId: 7, minMembers: 1, maxMembers: 2, responsibility: 'Technical delivery' },
      { majorId: 8, minMembers: 2, maxMembers: 3, responsibility: 'Business validation' },
    ] }} members={[{ userId: 1, fullName: 'Linh', majorId: 7, isLeader: true }, { userId: 2, fullName: 'Minh', majorId: 8, isLeader: false }]} />)
    expect(screen.getByText('INTERDISCIPLINARY')).toBeTruthy()
    expect(screen.getByText(/Quota: 1–2 members/)).toBeTruthy()
    expect(screen.getByText(/Business validation/)).toBeTruthy()
    expect(screen.getByText(/Minh.*Business Administration/)).toBeTruthy()
  })
})
