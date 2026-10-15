import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadSprintBoard } from './sprint-board-data'
const api = vi.hoisted(() => ({ getProjectSprints: vi.fn(), getTaskBoard: vi.fn() }))
vi.mock('../../services/api/tasks.api', () => api)
const rows = Array.from({ length: 100 }, (_, index) => ({ id: index + 1 }))
beforeEach(() => { vi.resetAllMocks(); api.getProjectSprints.mockResolvedValue({ items: [], totalCount: 0 }) })
describe('Complete bounded board snapshot', () => {
  it('fetches later task pages before calculating scope and carryover', async () => {
    api.getTaskBoard.mockResolvedValueOnce({ items: rows, totalCount: 101 }).mockResolvedValueOnce({ items: [{ id: 101 }], totalCount: 101 })
    expect((await loadSprintBoard(9)).tasks).toHaveLength(101)
    expect(api.getTaskBoard).toHaveBeenLastCalledWith(9, { page: 2, pageSize: 100 }, undefined)
  })
  it.each([{ items: [{ id: 100 }], totalCount: 101 }, { items: [], totalCount: 100 }])('does not turn a concurrent partial read into a carryover list', async second => {
    api.getTaskBoard.mockResolvedValueOnce({ items: rows, totalCount: 101 }).mockResolvedValueOnce(second)
    await expect(loadSprintBoard(9)).rejects.toThrow('SPRINT_BOARD_CHANGED')
  })
  it('does not issue unbounded requests for oversized boards', async () => {
    api.getTaskBoard.mockResolvedValue({ items: rows, totalCount: 2001 })
    await expect(loadSprintBoard(9)).rejects.toThrow('SPRINT_BOARD_LIMIT')
    expect(api.getTaskBoard).toHaveBeenCalledTimes(1)
  })
})
