import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AcademicWorkflowContext, type AcademicWorkflowContextValue } from './academic-workflow-context'
import { AcademicWorkflowGate } from './AcademicWorkflowGate'
afterEach(cleanup)

const baseValue: AcademicWorkflowContextValue = {
  currentUser: null,
  workflowContext: null,
  academic: null,
  authorization: { roles: [], permissions: [], departmentIds: [], majorIds: [] },
  status: 'idle',
  error: null,
  errorKind: null,
  refresh: async () => {},
}

function renderGate(value: Partial<AcademicWorkflowContextValue>) {
  return render(
    <AcademicWorkflowContext.Provider value={{ ...baseValue, ...value }}>
      <AcademicWorkflowGate><p>workflow page</p></AcademicWorkflowGate>
    </AcademicWorkflowContext.Provider>,
  )
}

describe('AcademicWorkflowGate', () => {
  it('keeps the first idle render neutral before a request starts', () => {
    renderGate({ status: 'idle' })
    expect(screen.getByRole('status', { name: 'Đang tải…' })).toBeDefined()
    expect(screen.queryByText('workflow page')).toBeNull()
  })
  it('does not render workflow pages before initial academic context loading completes', () => {
    renderGate({ status: 'loading' })
    expect(screen.getByRole('status', { name: 'Đang tải…' })).toBeDefined()
    expect(screen.queryByText('workflow page')).toBeNull()
  })

  it('keeps forbidden context distinct from authentication and system context errors', () => {
    renderGate({ status: 'forbidden', error: new Error('Forbidden') })
    expect(screen.getByText(/không có quyền truy cập/i)).toBeDefined()
    expect(screen.queryByText('workflow page')).toBeNull()
  })

  it('offers retry for an unavailable academic context without redirecting to login', () => {
    const refresh = vi.fn().mockResolvedValue(undefined)
    renderGate({ status: 'unavailable', errorKind: 'system', error: new Error('Offline'), refresh })
    expect(screen.getByText('Chưa tải được thông tin tài khoản.')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeDefined()
    expect(screen.queryByText('workflow page')).toBeNull()
  })
})
