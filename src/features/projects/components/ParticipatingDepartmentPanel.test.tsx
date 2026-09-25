import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAcademicNameResolver } from './academic-name-resolver'
import { ParticipatingDepartmentPanel } from './ParticipatingDepartmentPanel'
import { summarizeParticipatingDecisions } from './participating-decision-summary'

afterEach(cleanup)
const names = createAcademicNameResolver([{ organization: {} as any, departments: [{
  department: { id: 4, name: 'Department of Computing', code: 'COMP' } as any, majors: [],
}, {
  department: { id: 5, name: 'Department of Business', code: 'BUS' } as any, majors: [],
}] }])

describe('ParticipatingDepartmentPanel', () => {
  it('renders pending, approved, and rejected decisions from the current snapshot only', () => {
    render(<ParticipatingDepartmentPanel mode="INTERDISCIPLINARY" snapshotId={12} departmentIds={[4, 5, 6]} names={names} canApprove={false} canReject={false} pending={false} onDecide={vi.fn()} decisions={[
      { departmentId: 4, decision: 'APPROVED', decidedBy: 11, decidedAt: '2026-09-23T00:00:00Z', reason: null },
      { departmentId: 5, decision: 'REJECTED', decidedBy: 12, decidedAt: null, reason: 'No qualified member' },
    ]} />)
    expect(screen.getByText(/Current snapshot #12 only/)).toBeTruthy()
    expect(screen.getByText('APPROVED')).toBeTruthy()
    expect(screen.getByText('REJECTED')).toBeTruthy()
    expect(screen.getByText('PENDING')).toBeTruthy()
    expect(screen.getByText(/No qualified member/)).toBeTruthy()
  })

  it('only offers backend-derived actor actions for the current interdisciplinary snapshot', () => {
    const onDecide = vi.fn()
    render(<ParticipatingDepartmentPanel mode="INTERDISCIPLINARY" snapshotId={12} departmentIds={[4]} names={names} canApprove canReject pending={false} onDecide={onDecide} decisions={[]} />)
    fireEvent.click(screen.getByText('Approve as participating department'))
    fireEvent.click(screen.getByText('Reject as participating department'))
    expect(onDecide).toHaveBeenNthCalledWith(1, 'APPROVED')
    expect(onDecide).toHaveBeenNthCalledWith(2, 'REJECTED')
  })

  it('does not render for SINGLE_MAJOR and summarizes final approval gates without changing project state', () => {
    const { container } = render(<ParticipatingDepartmentPanel mode="SINGLE_MAJOR" snapshotId={12} departmentIds={[4]} names={names} canApprove canReject pending={false} onDecide={vi.fn()} decisions={[]} />)
    expect(container.innerHTML).toBe('')
    expect(summarizeParticipatingDecisions([4, 5], [{ departmentId: 4, decision: 'APPROVED', decidedBy: null, decidedAt: null, reason: null }])).toBe('PENDING')
    expect(summarizeParticipatingDecisions([4], [{ departmentId: 4, decision: 'REJECTED', decidedBy: null, decidedAt: null, reason: 'No' }])).toBe('REJECTED')
    expect(summarizeParticipatingDecisions([4], [{ departmentId: 4, decision: 'APPROVED', decidedBy: null, decidedAt: null, reason: null }])).toBe('ALL_APPROVED')
  })

  it('does not reuse a prior approved decision for a new current snapshot', () => {
    const oldSnapshot = [{ departmentId: 4, decision: 'APPROVED', decidedBy: null, decidedAt: null, reason: null }]
    const newSnapshot = [{ departmentId: 4, decision: 'PENDING', decidedBy: null, decidedAt: null, reason: null }]
    expect(summarizeParticipatingDecisions([4], oldSnapshot)).toBe('ALL_APPROVED')
    expect(summarizeParticipatingDecisions([4], newSnapshot)).toBe('PENDING')
  })
})
