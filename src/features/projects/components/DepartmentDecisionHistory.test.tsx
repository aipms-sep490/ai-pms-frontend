import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DepartmentDecisionHistory } from './DepartmentDecisionHistory'

describe('DepartmentDecisionHistory', () => {
  it('renders immutable snapshots supplied by the backend', () => {
    render(<DepartmentDecisionHistory snapshots={{ page: 1, pageSize: 20, totalCount: 1, items: [{ id: 9, submissionNumber: 2, projectPeriodId: 3, submittedBy: 4, submittedAt: '2026-09-30T09:00:00Z', evidence: { scope: { projectMode: 'INTERDISCIPLINARY', primaryMajorId: null, leadDepartmentId: 1, requirements: [] }, policy: { minMembers: 2, maxMembers: 5, minDistinctMajors: 2 }, organizationId: 1, windowStartAt: '', windowEndAt: '', members: [], departmentIds: [1] }, proposalAvailable: true, decisions: [{ departmentId: 1, decision: 'APPROVED', decidedBy: 4, decidedAt: '2026-09-30T10:00:00Z', reason: 'Ready' }] }] }} departmentName={(id) => `Department ${id}`} onPageChange={() => undefined} />)
    expect(screen.getByText(/Lần nộp #2/)).toBeTruthy()
    expect(screen.getByText(/Department 1/)).toBeTruthy()
  })
})
