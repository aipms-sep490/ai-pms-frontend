import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AccountRoleAssignments } from './AccountRoleAssignments'

const api = vi.hoisted(() => ({ assignRole: vi.fn(), removeRole: vi.fn(), getUser: vi.fn() }))
vi.mock('../api/admin-api', () => api)
afterEach(() => { cleanup(); vi.resetAllMocks() })

const roles = [
  { id: 1, code: 'LECTURER', name: 'Giảng viên', isAssignableGlobalRole: true, assignmentKind: 'GLOBAL' },
  { id: 2, code: 'DEPARTMENT_STAFF', name: 'Cán bộ bộ môn', isAssignableGlobalRole: true, assignmentKind: 'GLOBAL' },
  { id: 3, code: 'EVALUATOR', name: 'Người chấm', isAssignableGlobalRole: false, assignmentKind: 'RESOURCE' },
] as Parameters<typeof AccountRoleAssignments>[0]['roles']
const user = { id: 7, fullName: 'Nguyễn Minh', roles: ['LECTURER'] } as Parameters<typeof AccountRoleAssignments>[0]['user']

it('adds a second global role and confirms the server readback while hiding resource roles', async () => {
  const onReadback = vi.fn()
  api.assignRole.mockResolvedValue(undefined)
  api.getUser.mockResolvedValue({ ...user, roles: ['LECTURER', 'DEPARTMENT_STAFF'] })
  render(<AccountRoleAssignments user={user} roles={roles} rolesState="ready" accessToken="token" onReadback={onReadback} />)
  expect(screen.queryByRole('button', { name: /Gán Người chấm/ })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: /Gán Cán bộ bộ môn/ }))
  await waitFor(() => expect(api.assignRole).toHaveBeenCalledWith(7, 2, 'token'))
  await waitFor(() => expect(onReadback).toHaveBeenCalledWith(expect.objectContaining({ roles: ['LECTURER', 'DEPARTMENT_STAFF'] })))
  expect(screen.getByText(/đối chiếu với máy chủ/)).toBeTruthy()
})

it('blocks duplicate mutation if the write cannot be read back', async () => {
  api.assignRole.mockResolvedValue(undefined)
  api.getUser.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ ...user, roles: ['LECTURER', 'DEPARTMENT_STAFF'] })
  const onReadback = vi.fn()
  render(<AccountRoleAssignments user={user} roles={roles} rolesState="ready" accessToken="token" onReadback={onReadback} />)
  fireEvent.click(screen.getByRole('button', { name: /Gán Cán bộ bộ môn/ }))
  expect(await screen.findByText(/chưa đọc lại được/)).toBeTruthy()
  expect((screen.getByRole('button', { name: /Gán Cán bộ bộ môn/ }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Tải lại vai trò' }))
  await waitFor(() => expect(onReadback).toHaveBeenCalledTimes(1))
  expect(api.assignRole).toHaveBeenCalledTimes(1)
})
