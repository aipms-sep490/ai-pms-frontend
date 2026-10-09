import { afterEach, describe, expect, it, vi } from 'vitest'
import { canManageProjectGovernance, createProjectEvidence, governanceReadOnlyReason, type ProjectGovernance } from './project-governance-api'

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })

it('distinguishes missing canonical scope from permission denial and aggregate mismatch', () => {
  const value: ProjectGovernance = { projectId: 2, projectStatus: 'ACTIVE', leadDepartment: { departmentId: 2, name: 'IT' }, participatingDepartments: [], actorScope: { departmentId: 2, isAdmin: false }, allowedActions: ['MANAGE_GOVERNANCE'], blockers: [] }
  expect(governanceReadOnlyReason(value)).toContain('chưa có thông tin khoa chủ trì')
  expect(governanceReadOnlyReason(value, 3)).toContain('thuộc phạm vi khoa chủ trì')
  expect(governanceReadOnlyReason({ ...value, leadDepartment: { departmentId: 1, name: 'Other' } }, 2)).toContain('chưa khớp')
  expect(governanceReadOnlyReason({ ...value, projectStatus: 'COMPLETED' })).toContain('đã kết thúc')
  expect(canManageProjectGovernance(value)).toBe(true)
})

describe('project evidence contract', () => {
  it('requires lead department scope and an editable project even when the capability is broad', () => {
    const scope: ProjectGovernance = { projectId: 9, projectStatus: 'ACTIVE', leadDepartment: { departmentId: 2, name: 'Bộ môn' }, participatingDepartments: [], actorScope: { departmentId: 2, isAdmin: false }, allowedActions: ['MANAGE_GOVERNANCE'], blockers: [] }
    expect(canManageProjectGovernance(scope)).toBe(true)
    expect(canManageProjectGovernance({ ...scope, actorScope: { departmentId: 3, isAdmin: false } })).toBe(false)
    expect(canManageProjectGovernance({ ...scope, actorScope: { departmentId: 2, isAdmin: true } })).toBe(false)
    expect(canManageProjectGovernance({ ...scope, leadDepartment: null })).toBe(false)
    expect(canManageProjectGovernance({ ...scope, projectStatus: 'ARCHIVED' })).toBe(false)
    expect(canManageProjectGovernance({ ...scope, allowedActions: [] })).toBe(false)
  })
  it('posts only the canonical Task source and optional major/notes', async () => {
    localStorage.setItem('token', 'evidence-token')
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 1 }) })
    vi.stubGlobal('fetch', fetch)
    await createProjectEvidence(9, { sourceType: 'TASK', sourceId: 8, majorId: 4, notes: 'Kiểm thử tích hợp' })
    expect(fetch).toHaveBeenCalledWith('/api/v1/projects/9/evidence', expect.objectContaining({ method: 'POST' }))
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ sourceType: 'TASK', sourceId: 8, majorId: 4, notes: 'Kiểm thử tích hợp' })
  })
})
