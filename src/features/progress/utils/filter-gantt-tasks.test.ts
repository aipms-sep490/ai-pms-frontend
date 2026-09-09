import { describe, it, expect } from 'vitest'
import {
  filterWbsGroups,
  countAllTasks,
  countCriticalTasks,
} from './filter-gantt-tasks'
import { wbsGroupsPreview } from '../fixtures/gantt-preview'

describe('filter-gantt-tasks utility', () => {
  it('returns all groups when filter is default (empty query, all majors, not only critical)', () => {
    const result = filterWbsGroups(wbsGroupsPreview, {
      onlyCritical: false,
      majorFilter: 'all',
      searchQuery: '',
    })
    expect(result.length).toBe(wbsGroupsPreview.length)
    expect(countAllTasks(result)).toBe(14)
  })

  it('filters only critical tasks when onlyCritical is true', () => {
    const result = filterWbsGroups(wbsGroupsPreview, {
      onlyCritical: true,
      majorFilter: 'all',
      searchQuery: '',
    })
    // Only WBS-3 has critical tasks (SEP-105, SEP-108, SEP-112)
    expect(result.length).toBe(1)
    expect(result[0].wbsCode).toBe('3.0')
    expect(result[0].tasks.every((t) => t.isCritical)).toBe(true)
    expect(result[0].tasks.map((t) => t.id)).toEqual(['SEP-105', 'SEP-108', 'SEP-112'])
  })

  it('filters by major filter', () => {
    const result = filterWbsGroups(wbsGroupsPreview, {
      onlyCritical: false,
      majorFilter: 'UI/UX',
      searchQuery: '',
    })
    // Groups with UI/UX: WBS-2 (SEP-104), WBS-3 (SEP-112), WBS-4 (SEP-122)
    expect(result.length).toBe(3)
    const allUiuxTasks = result.flatMap((g) => g.tasks)
    expect(allUiuxTasks.every((t) => t.major === 'UI/UX')).toBe(true)
    expect(allUiuxTasks.map((t) => t.id)).toEqual(['SEP-104', 'SEP-112', 'SEP-122'])
  })

  it('filters by searchQuery matching task ID, name, or assignee', () => {
    const byId = filterWbsGroups(wbsGroupsPreview, {
      onlyCritical: false,
      majorFilter: 'all',
      searchQuery: 'SEP-108',
    })
    expect(byId.length).toBe(1)
    expect(byId[0].tasks[0].id).toBe('SEP-108')

    const byName = filterWbsGroups(wbsGroupsPreview, {
      onlyCritical: false,
      majorFilter: 'all',
      searchQuery: 'Clean Architecture',
    })
    expect(byName.length).toBe(1)
    expect(byName[0].tasks[0].id).toBe('SEP-105')

    const byAssignee = filterWbsGroups(wbsGroupsPreview, {
      onlyCritical: false,
      majorFilter: 'all',
      searchQuery: 'Hoàng Quang E',
    })
    expect(byAssignee.length).toBe(3) // WBS-1 (SEP-103), WBS-3 (SEP-111), WBS-5 (SEP-130)
  })

  it('handles empty groups array gracefully', () => {
    const result = filterWbsGroups([], {
      onlyCritical: true,
      majorFilter: 'all',
      searchQuery: '',
    })
    expect(result).toEqual([])
    expect(countAllTasks([])).toBe(0)
    expect(countCriticalTasks([])).toBe(0)
  })

  it('correctly counts critical tasks', () => {
    const count = countCriticalTasks(wbsGroupsPreview)
    expect(count).toBe(3)
  })
})
