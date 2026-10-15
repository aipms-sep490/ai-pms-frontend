import * as api from '../../services/api/tasks.api'
import type { PagedResult, SprintDto, TaskDto } from '../../types/backend'

async function boundedPages<T extends { id: number }>(first: PagedResult<T>, size: number, limit: number, load: (page: number) => Promise<PagedResult<T>>): Promise<T[]> {
  if (first.totalCount > limit) throw new Error('SPRINT_BOARD_LIMIT')
  const rows = [...first.items]
  for (let page = 2; page <= Math.ceil(first.totalCount / size); page++) {
    const next = await load(page)
    if (next.totalCount !== first.totalCount) throw new Error('SPRINT_BOARD_CHANGED')
    rows.push(...next.items)
  }
  // Incomplete snapshots must never become a carryover list or a displayed total.
  if (rows.length !== first.totalCount || new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('SPRINT_BOARD_CHANGED')
  return rows
}

export async function loadSprintBoard(projectId: number, signal?: AbortSignal): Promise<{ sprints: SprintDto[]; tasks: TaskDto[] }> {
  const [sprintPage, taskPage] = await Promise.all([api.getProjectSprints(projectId, 1, 50, signal), api.getTaskBoard(projectId, {}, signal)])
  const [sprints, tasks] = await Promise.all([
    boundedPages(sprintPage, 50, 500, page => api.getProjectSprints(projectId, page, 50, signal)),
    boundedPages(taskPage, 100, 2000, page => api.getTaskBoard(projectId, { page, pageSize: 100 }, signal)),
  ])
  return { sprints, tasks }
}
