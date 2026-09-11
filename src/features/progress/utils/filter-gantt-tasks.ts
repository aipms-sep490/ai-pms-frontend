import type { WbsGroup, GanttFilterState } from '../types/gantt.types'

export function filterWbsGroups(
  groups: readonly WbsGroup[],
  filter: GanttFilterState
): WbsGroup[] {
  const query = filter.searchQuery.trim().toLowerCase()

  return groups
    .map((group) => {
      const filteredTasks = group.tasks.filter((task) => {
        if (filter.onlyCritical && !task.isCritical) {
          return false
        }

        if (filter.majorFilter !== 'all' && task.major !== filter.majorFilter) {
          return false
        }

        if (query) {
          const matchId = task.id.toLowerCase().includes(query)
          const matchName = task.name.toLowerCase().includes(query)
          const matchWbs = task.wbsCode.toLowerCase().includes(query)
          const matchAssignee = task.assignee.toLowerCase().includes(query)
          if (!matchId && !matchName && !matchWbs && !matchAssignee) {
            return false
          }
        }

        return true
      })

      return {
        ...group,
        tasks: filteredTasks,
      }
    })
    .filter((group) => group.tasks.length > 0)
}

export function countAllTasks(groups: readonly WbsGroup[]): number {
  return groups.reduce((acc, g) => acc + g.tasks.length, 0)
}

export function countCriticalTasks(groups: readonly WbsGroup[]): number {
  return groups.reduce(
    (acc, g) => acc + g.tasks.filter((t) => t.isCritical).length,
    0
  )
}
