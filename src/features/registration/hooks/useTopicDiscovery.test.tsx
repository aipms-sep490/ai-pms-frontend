import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '../../../services/http/http-client'
import { useTopicDiscovery } from './useTopicDiscovery'

const topicsApi = vi.hoisted(() => ({ listTopics: vi.fn() }))
vi.mock('../../topics/api/topic-api', () => topicsApi)

const filters = { search: 'AI', departmentId: 8, projectMode: 'SINGLE_MAJOR' as const, compatibleOnly: true, page: 2, pageSize: 12 }
const item = {
  id: 5, code: 'TOP-5', status: 'PUBLISHED', projectPeriodId: 9, academicSemesterId: 4,
  leadDepartmentId: 8, leadDepartmentName: 'SE', title: 'AI topic', description: null,
  problemStatement: null, objectives: null, expectedOutput: null, domain: null,
  technologies: [], keywords: [], projectMode: 'SINGLE_MAJOR' as const, primaryMajorId: 12,
  requirements: [], concurrencyToken: 'token', closeReason: null,
}

describe('useTopicDiscovery', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads the backend-filtered page and passes filters unchanged to the topic adapter', async () => {
    topicsApi.listTopics.mockResolvedValue({ items: [item], totalCount: 13 })
    const { result } = renderHook(() => useTopicDiscovery('access-token', filters))

    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.topics).toEqual([item])
    expect(result.current.totalCount).toBe(13)
    expect(topicsApi.listTopics).toHaveBeenCalledWith('access-token', filters)
  })

  it.each([
    [401, 'authentication'],
    [403, 'forbidden'],
    [500, 'system'],
  ] as const)('classifies HTTP %s as %s and supports retry', async (status, kind) => {
    topicsApi.listTopics.mockRejectedValueOnce(new HttpError('Failed', status))
      .mockResolvedValueOnce({ items: [], totalCount: 0 })
    const { result } = renderHook(() => useTopicDiscovery('access-token', filters))

    await waitFor(() => expect(result.current.errorKind).toBe(kind))
    result.current.retry()
    await waitFor(() => expect(result.current.error).toBeNull())
    expect(topicsApi.listTopics).toHaveBeenCalledTimes(2)
  })

  it('does not request a catalogue page without an authenticated session', () => {
    const { result } = renderHook(() => useTopicDiscovery(undefined, filters))
    expect(result.current.isLoading).toBe(false)
    expect(topicsApi.listTopics).not.toHaveBeenCalled()
  })
})
