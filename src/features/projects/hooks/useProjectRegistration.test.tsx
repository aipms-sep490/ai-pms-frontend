import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '../../../services/http/http-client'
import { classifyProjectError, useProjectRegistration } from './useProjectRegistration'

const api = vi.hoisted(() => ({ createProjectDraft: vi.fn(), updateDraft: vi.fn(), submitProject: vi.fn(), resubmitProject: vi.fn(), getProject: vi.fn(), getHistory: vi.fn() }))
vi.mock('../../../services/service-gateway', () => ({ services: { project: api } }))
vi.mock('../../../app/config/env', () => ({ env: { isMockMode: false } }))

const token = 'MTIzNDU2Nzg='
const project = (status = 'Draft') => ({ id: 9, teamId: 4, teamName: 'Team 4', code: 'P-9', title: 'Saved', description: 'Description', objectives: 'Objectives', problemStatement: 'Problem', expectedOutput: 'Output', status, registeredAt: '2026-09-01', createdBy: 1, createdByName: 'Leader', createdAt: '2026-09-01', updatedAt: '2026-09-01', concurrencyToken: token, majors: [{ id: 1, majorId: 7, majorCode: 'SE', majorName: 'SE' }], tags: [{ id: 1, name: 'SE', tagType: 'DOMAIN' }, { id: 2, name: 'React', tagType: 'TECHNOLOGY' }, { id: 3, name: 'PMS', tagType: 'KEYWORD' }], academicScope: { projectMode: 'SINGLE_MAJOR', primaryMajorId: 7, leadDepartmentId: 2, concurrencyToken: 'scope', requirements: [{ majorId: 7, minMembers: 1, maxMembers: 4, responsibility: 'Lead' }] } })
const team = { id: 4, name: 'Team 4', members: [{ userId: 1, fullName: 'Leader', isLeader: true }], eligibility: { canRegister: true, reasons: [] }, academicScope: { projectMode: 'SINGLE_MAJOR', primaryMajorId: 7, leadDepartmentId: 2, concurrencyToken: 'scope', requirements: [{ majorId: 7, minMembers: 1, maxMembers: 4, responsibility: 'Lead' }] } }
const actions = (allowed: string[]) => ({ actions: allowed.map((code) => ({ code, allowed: true, reasons: [] })) })
const setup = (current = project(), projectAllowed = ['edit_project_draft', 'submit_project']) => ({ project: current as any, team: team as any, profile: { id: 1 } as any, teamActions: { canRegister: true, ...actions(['create_project_draft']) } as any, projectActions: actions(projectAllowed) as any, refreshAll: vi.fn().mockResolvedValue(undefined) })

describe('useProjectRegistration', () => {
  beforeEach(() => { vi.clearAllMocks(); api.getHistory.mockResolvedValue([]); api.getProject.mockResolvedValue(project()) })

  it('uses backend actions and exposes governed scope rather than editable academic authority', async () => {
    const state = setup()
    const { result } = renderHook(() => useProjectRegistration(state))
    await waitFor(() => expect(api.getHistory).toHaveBeenCalled())
    expect(result.current.canEdit).toBe(true)
    expect(result.current.canSubmit).toBe(true)
    expect(result.current.academicScope?.leadDepartmentId).toBe(2)
    expect(result.current.requiredMajorIds).toEqual([7])
    expect(result.current.form.domain).toBe('SE')
  })

  it('creates then refetches an authoritative draft without a client state transition', async () => {
    const state = setup(null as any)
    api.createProjectDraft.mockResolvedValue(project())
    const { result } = renderHook(() => useProjectRegistration(state))
    await act(async () => { result.current.setField('title', 'New'); result.current.setField('domain', 'SE') })
    await act(async () => { await result.current.saveDraft() })
    expect(api.createProjectDraft).toHaveBeenCalledWith(expect.objectContaining({ title: 'New', domain: 'SE', requiredMajorIds: [7] }))
    expect(api.getProject).toHaveBeenCalledWith(9)
    expect(state.refreshAll).toHaveBeenCalled()
  })

  it('uses resubmit endpoint only for backend-permitted revision state', async () => {
    const state = setup(project('RevisionRequired'), ['edit_project_draft', 'resubmit_project'])
    api.resubmitProject.mockResolvedValue(project('Submitted'))
    const { result } = renderHook(() => useProjectRegistration(state))
    await act(async () => { await result.current.resubmit() })
    expect(api.resubmitProject).toHaveBeenCalledWith(9, token)
    expect(api.submitProject).not.toHaveBeenCalled()
  })

  it('refreshes on a 409 and does not automatically retry the business transition', async () => {
    const state = setup()
    api.submitProject.mockRejectedValue(new HttpError('stale', 409))
    const { result } = renderHook(() => useProjectRegistration(state))
    await act(async () => { await result.current.submit() })
    expect(api.submitProject).toHaveBeenCalledTimes(1)
    expect(state.refreshAll).toHaveBeenCalledTimes(1)
    expect(result.current.error).toMatchObject({ kind: 'conflict' })
  })

  it('keeps a member from receiving mutation permissions without backend actions', async () => {
    const state = setup(project(), [])
    state.profile = { id: 2 } as any
    state.team = { ...team, members: [{ userId: 2, fullName: 'Member', isLeader: false }] } as any
    const { result } = renderHook(() => useProjectRegistration(state))
    expect(result.current.canEdit).toBe(false)
    expect(result.current.canSubmit).toBe(false)
  })

  it.each([[401, 'authentication'], [403, 'forbidden'], [404, 'not-found'], [409, 'conflict'], [422, 'validation']] as const)('classifies backend %s as %s', (status, kind) => {
    expect(classifyProjectError(new HttpError('backend', status)).kind).toBe(kind)
  })
})
