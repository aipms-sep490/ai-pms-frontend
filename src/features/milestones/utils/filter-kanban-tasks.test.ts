import { describe, it, expect } from 'vitest'
import { filterKanbanTasks, groupTasksByStatus } from './filter-kanban-tasks'
import type { KanbanTask } from '../types/milestone-kanban.types'

const sampleTasks: KanbanTask[] = [
  {
    id: 'SEP-108',
    title: 'Xử lý JWT Token và Identity',
    major: 'SE',
    assignee: 'Nguyễn Văn A',
    assigneeRole: 'Lead',
    deadline: '10/09',
    progress: 40,
    status: 'in_progress',
    isCritical: true,
    storyPoints: 5,
    milestoneId: 'M3',
  },
  {
    id: 'SEP-112',
    title: 'Xây dựng Design System',
    major: 'UIUX',
    assignee: 'Lê Văn C',
    assigneeRole: 'UI Designer',
    deadline: '12/09',
    progress: 70,
    status: 'in_progress',
    storyPoints: 5,
    milestoneId: 'M3',
  },
  {
    id: 'SEP-114',
    title: 'Pipeline AI Risk Prediction',
    major: 'AI',
    assignee: 'Phạm Minh D',
    assigneeRole: 'AI Eng',
    deadline: '15/09',
    progress: 50,
    status: 'todo',
    storyPoints: 5,
    milestoneId: 'M3',
  },
  {
    id: 'SEP-103',
    title: 'Chuẩn hóa quy trình CDIO',
    major: 'QA',
    assignee: 'Hoàng Quang E',
    assigneeRole: 'QA',
    deadline: '04/09',
    progress: 100,
    status: 'done',
    storyPoints: 3,
    milestoneId: 'M3',
  },
]

describe('filterKanbanTasks', () => {
  it('returns all tasks when filter is "all" and query is empty', () => {
    const result = filterKanbanTasks(sampleTasks, 'all', '')
    expect(result).toHaveLength(4)
  })

  it('filters strictly by major tag', () => {
    const seTasks = filterKanbanTasks(sampleTasks, 'SE')
    expect(seTasks).toHaveLength(1)
    expect(seTasks[0].id).toBe('SEP-108')

    const uiuxTasks = filterKanbanTasks(sampleTasks, 'UIUX')
    expect(uiuxTasks).toHaveLength(1)
    expect(uiuxTasks[0].id).toBe('SEP-112')
  })

  it('filters by search query case-insensitively across id, title, and assignee', () => {
    const byId = filterKanbanTasks(sampleTasks, 'all', '108')
    expect(byId).toHaveLength(1)
    expect(byId[0].id).toBe('SEP-108')

    const byTitle = filterKanbanTasks(sampleTasks, 'all', 'design system')
    expect(byTitle).toHaveLength(1)
    expect(byTitle[0].id).toBe('SEP-112')

    const byAssignee = filterKanbanTasks(sampleTasks, 'all', 'minh d')
    expect(byAssignee).toHaveLength(1)
    expect(byAssignee[0].id).toBe('SEP-114')
  })

  it('combines major filter and search query correctly', () => {
    const combinedMatch = filterKanbanTasks(sampleTasks, 'SE', 'Token')
    expect(combinedMatch).toHaveLength(1)
    expect(combinedMatch[0].id).toBe('SEP-108')

    const combinedMismatch = filterKanbanTasks(sampleTasks, 'AI', 'Token')
    expect(combinedMismatch).toHaveLength(0)
  })

  it('handles empty task list gracefully', () => {
    expect(filterKanbanTasks([], 'all', 'test')).toEqual([])
  })
})

describe('groupTasksByStatus', () => {
  it('groups tasks correctly into 4 columns', () => {
    const grouped = groupTasksByStatus(sampleTasks)
    expect(grouped.todo).toHaveLength(1)
    expect(grouped.in_progress).toHaveLength(2)
    expect(grouped.review).toHaveLength(0)
    expect(grouped.done).toHaveLength(1)
  })

  it('returns empty arrays for all columns when tasks list is empty', () => {
    const grouped = groupTasksByStatus([])
    expect(grouped.todo).toEqual([])
    expect(grouped.in_progress).toEqual([])
    expect(grouped.review).toEqual([])
    expect(grouped.done).toEqual([])
  })
})
