import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AcademicWorkflowContext, type AcademicWorkflowContextValue } from './academic-workflow-context'
import { AcademicWorkflowGate } from './AcademicWorkflowGate'

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
  it('does not render workflow pages before initial academic context loading completes', () => {
    renderGate({ status: 'loading' })
    expect(screen.getByText('Đang tải bối cảnh học vụ…')).toBeDefined()
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
    expect(screen.getByText('Bối cảnh học vụ hiện chưa khả dụng.')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeDefined()
    expect(screen.queryByText('workflow page')).toBeNull()
  })
})
