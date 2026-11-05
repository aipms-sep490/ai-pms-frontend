import { describe, expect, it } from 'vitest'
import { workflowTarget } from './workflow-assistance-api'

describe('workflowTarget', () => {
  it('allows only app-owned resources for the current role route', () => {
    expect(workflowTarget('/project', 9, { target: 'tasks', resourceId: 42 } as never)).toBe('/project/tasks/42')
    expect(workflowTarget('/department/projects/9', 9, { target: 'tasks' } as never)).toBeUndefined()
    expect(workflowTarget('/project', 9, { target: 'https://evil.example' } as never)).toBeUndefined()
  })
})
