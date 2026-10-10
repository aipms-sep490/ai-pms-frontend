import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useProjectCapabilities } from './useProjectCapabilities'
import { HttpError } from '../../services/http/http-client'

const mocks = vi.hoisted(() => ({ getMyCapabilities: vi.fn() }))
vi.mock('./capabilities-api', async () => {
  const actual = await vi.importActual<typeof import('./capabilities-api')>('./capabilities-api')
  return { ...actual, getMyCapabilities: mocks.getMyCapabilities }
})

afterEach(() => vi.resetAllMocks())

describe('useProjectCapabilities', () => {
  it('exposes can/reasonsFor/reasonLabel from the unified map', async () => {
    mocks.getMyCapabilities.mockResolvedValue({
      projectId: 9, projectStatus: 'ACTIVE',
      capabilities: { SUBMIT_DELIVERABLE: true, PUBLISH_RESULT: false },
      blockedReasons: { PUBLISH_RESULT: ['STATE_NOT_ALLOWED'] },
    })
    const { result } = renderHook(() => useProjectCapabilities(9))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.can('SUBMIT_DELIVERABLE')).toBe(true)
    expect(result.current.can('PUBLISH_RESULT')).toBe(false)
    expect(result.current.can('UNKNOWN')).toBe(false)
    expect(result.current.reasonsFor('PUBLISH_RESULT')).toEqual(['STATE_NOT_ALLOWED'])
    expect(result.current.reasonLabel('PUBLISH_RESULT')).toContain('Trạng thái hiện tại')
    expect(result.current.reasonLabel('SUBMIT_DELIVERABLE')).toBeNull()
  })

  it('maps an unknown reason code to a safe fallback label', async () => {
    mocks.getMyCapabilities.mockResolvedValue({
      projectId: 9, capabilities: { DO_X: false }, blockedReasons: { DO_X: ['SOME_NEW_CODE'] },
    })
    const { result } = renderHook(() => useProjectCapabilities(9))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.reasonLabel('DO_X')).toBe('Bạn chưa đủ điều kiện thực hiện thao tác này.')
  })

  it('surfaces a 403 with a distinct message', async () => {
    mocks.getMyCapabilities.mockRejectedValue(new HttpError('forbidden', 403))
    const { result } = renderHook(() => useProjectCapabilities(9))
    await waitFor(() => expect(result.current.error).toContain('chưa có quyền'))
  })

  it('does not fetch without a project id', () => {
    const { result } = renderHook(() => useProjectCapabilities(undefined))
    expect(mocks.getMyCapabilities).not.toHaveBeenCalled()
    expect(result.current.loading).toBe(false)
  })
})
