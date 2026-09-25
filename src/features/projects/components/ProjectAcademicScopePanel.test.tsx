import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ProjectAcademicScopePanel } from './ProjectAcademicScopePanel'

afterEach(cleanup)

describe('ProjectAcademicScopePanel', () => {
  it('renders a SINGLE_MAJOR scope without participating-department representation', () => {
    render(<ProjectAcademicScopePanel scope={{ projectMode: 'SINGLE_MAJOR', primaryMajorId: 7, leadDepartmentId: 4, requirements: [] }} participatingDepartmentIds={[4, 8]} />)

    expect(screen.getByText('SINGLE_MAJOR')).toBeTruthy()
    expect(screen.getByText('Major #7')).toBeTruthy()
    expect(screen.queryByText(/Participating departments/)).toBeNull()
    expect(screen.getByText(/No participating-department action/)).toBeTruthy()
  })

  it('renders all INTERDISCIPLINARY requirements and supplied participating departments', () => {
    render(<ProjectAcademicScopePanel scope={{
      projectMode: 'INTERDISCIPLINARY', primaryMajorId: null, leadDepartmentId: 4,
      requirements: [
        { majorId: 7, minMembers: 1, maxMembers: 2, responsibility: 'Data engineering' },
        { majorId: 9, minMembers: 1, maxMembers: 1, responsibility: 'Security' },
      ],
    }} participatingDepartmentIds={[4, 8]} />)

    expect(screen.getByText('INTERDISCIPLINARY')).toBeTruthy()
    expect(screen.getByText(/Major #7/)).toBeTruthy()
    expect(screen.getByText(/Data engineering/)).toBeTruthy()
    expect(screen.getByText(/Major #9/)).toBeTruthy()
    expect(screen.getByText(/Participating departments: #4, #8/)).toBeTruthy()
  })
})
