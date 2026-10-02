import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { DepartmentAcademicScopeRoute } from './DepartmentAcademicScopeRoute'

const workflow = vi.hoisted(() => vi.fn())
vi.mock('../../../app/context/useAcademicWorkflow', () => ({ useAcademicWorkflow: workflow }))
afterEach(() => { cleanup(); vi.clearAllMocks() })

function renderGuard() { render(<MemoryRouter initialEntries={['/department/workspace']}><Routes><Route element={<DepartmentAcademicScopeRoute />}><Route path="/department/workspace" element={<p>Department workspace</p>} /></Route></Routes></MemoryRouter>) }

describe('DepartmentAcademicScopeRoute', () => {
  it('allows only a server-confirmed active Department scope', () => {
    workflow.mockReturnValue({ status: 'ready', academic: { hasActiveDepartmentScope: true, departments: [{ id: 2 }] }, refresh: vi.fn() })
    renderGuard()
    expect(screen.getByText('Department workspace')).toBeDefined()
  })

  it('fails closed for an inactive Department scope without treating it as an empty workspace', () => {
    workflow.mockReturnValue({ status: 'ready', academic: { hasActiveDepartmentScope: false, departments: [{ id: 2 }] }, refresh: vi.fn() })
    renderGuard()
    expect(screen.getByText('Department scope không hợp lệ hoặc đã hết hiệu lực.')).toBeDefined()
    expect(screen.queryByText('Department workspace')).toBeNull()
  })

  it('keeps unavailable context distinct and retryable', () => {
    workflow.mockReturnValue({ status: 'unavailable', academic: null, refresh: vi.fn() })
    renderGuard()
    expect(screen.getByText('Chưa xác minh được Department scope.')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeDefined()
  })
})
