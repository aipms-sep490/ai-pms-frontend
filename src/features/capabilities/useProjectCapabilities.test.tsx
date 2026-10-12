import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { useProjectCapabilities } from './useProjectCapabilities'
import { HttpError } from '../../services/http/http-client'
import { projectCapabilities } from '../../test/project-capabilities'

const mocks = vi.hoisted(() => ({ getMyCapabilities: vi.fn(), session: { accessToken: 'fixture' } as { accessToken: string } | null }))
vi.mock('../auth/context/useAuthSession', () => ({ useAuthSession: () => ({ session: mocks.session }) }))
vi.mock('./capabilities-api', async () => ({
  ...await vi.importActual<typeof import('./capabilities-api')>('./capabilities-api'), getMyCapabilities: mocks.getMyCapabilities,
}))
beforeEach(() => { mocks.session = { accessToken: 'fixture' }; mocks.getMyCapabilities.mockResolvedValue(projectCapabilities(9)) })
afterEach(() => { cleanup(); vi.resetAllMocks() })

describe('useProjectCapabilities', () => {
  it('reads merged BE action codes, reasons and rejects unknown actions', async () => {
    const data = projectCapabilities(9)
    data.actions[2] = { code: 'publish_project_result', allowed: false, reasons: ['LEAD_DEPARTMENT_REQUIRED_FOR_PUBLICATION'] }
    mocks.getMyCapabilities.mockResolvedValue(data)
    const { result } = renderHook(() => useProjectCapabilities(9))
    expect(result.current.can('manage_evaluation_scheme')).toBe(false)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.can('manage_evaluation_scheme')).toBe(true)
    expect(result.current.can('PUBLISH_RESULT')).toBe(false)
    expect(result.current.can('publish_project_result')).toBe(false)
    expect(result.current.reasonsFor('publish_project_result')).toEqual(['LEAD_DEPARTMENT_REQUIRED_FOR_PUBLICATION'])
    expect(result.current.reasonLabel('publish_project_result')).toContain('khoa chủ trì')
    expect(result.current.reasonLabel('manage_evaluation_scheme')).toBeNull()
  })
  it('maps an unknown server reason to a safe fallback', async () => {
    mocks.getMyCapabilities.mockResolvedValue({ ...projectCapabilities(9), actions: [{ code: 'new_action', allowed: false, reasons: ['NEW_BE_REASON'] }] })
    const { result } = renderHook(() => useProjectCapabilities(9))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.reasonLabel('new_action')).toBe('Bạn chưa đủ điều kiện thực hiện thao tác này.')
  })
  it.each([403, 404, 503])('fails closed for HTTP %s and supports retry', async status => {
    mocks.getMyCapabilities.mockRejectedValueOnce(new HttpError('unavailable', status))
    const { result } = renderHook(() => useProjectCapabilities(9))
    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.can('manage_evaluators')).toBe(false)
    if (status === 403) expect(result.current.error).toContain('chưa có quyền')
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.can('manage_evaluators')).toBe(true))
  })
  it.each([undefined, 0, -1, 1.2, NaN])('does not fetch invalid project %s', projectId => {
    const { result } = renderHook(() => useProjectCapabilities(projectId))
    expect(mocks.getMyCapabilities).not.toHaveBeenCalled()
    expect(result.current.loading).toBe(false)
    expect(result.current.can('manage_evaluators')).toBe(false)
  })
  it('does not retain authority when the session is removed', async () => {
    const { result, rerender } = renderHook(() => useProjectCapabilities(9))
    await waitFor(() => expect(result.current.can('manage_evaluators')).toBe(true))
    mocks.session = null; rerender()
    expect(result.current.data).toBeNull()
    expect(result.current.can('manage_evaluators')).toBe(false)
  })
  it('immediately revokes old authority on refresh, even when the refresh fails', async () => {
    const { result } = renderHook(() => useProjectCapabilities(9))
    await waitFor(() => expect(result.current.can('manage_evaluators')).toBe(true))
    mocks.getMyCapabilities.mockRejectedValueOnce(new Error('network'))
    act(() => result.current.retry())
    expect(result.current.data).toBeNull()
    expect(result.current.can('manage_evaluators')).toBe(false)
    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.can('manage_evaluators')).toBe(false)
  })
  it('aborts old projects and ignores late responses after a project change', async () => {
    let resolveOld!: (data: ReturnType<typeof projectCapabilities>) => void
    mocks.getMyCapabilities.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
    mocks.getMyCapabilities.mockResolvedValueOnce(projectCapabilities(10, false))
    const { result, rerender } = renderHook(({ id }) => useProjectCapabilities(id), { initialProps: { id: 9 } })
    const signal = mocks.getMyCapabilities.mock.calls[0][1] as AbortSignal
    rerender({ id: 10 })
    expect(signal.aborted).toBe(true)
    expect(result.current.can('manage_evaluators')).toBe(false)
    await waitFor(() => expect(result.current.data?.projectId).toBe(10))
    await act(async () => resolveOld(projectCapabilities(9)))
    expect(result.current.data?.projectId).toBe(10)
    expect(result.current.can('manage_evaluators')).toBe(false)
  })
  it('invalidates a previous identity even when the new request is pending', async () => {
    const { result, rerender } = renderHook(() => useProjectCapabilities(9))
    await waitFor(() => expect(result.current.can('manage_evaluators')).toBe(true))
    mocks.getMyCapabilities.mockImplementationOnce(() => new Promise(() => {}))
    mocks.session = { accessToken: 'other-identity' }; rerender()
    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeNull()
    expect(result.current.can('manage_evaluators')).toBe(false)
  })
})
