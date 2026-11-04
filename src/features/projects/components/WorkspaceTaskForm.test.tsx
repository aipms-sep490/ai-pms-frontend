import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { WorkspaceTaskForm } from './WorkspaceTaskForm'
import type { ProjectDto } from '../../../types/backend'
const api = vi.hoisted(() => ({ createTask: vi.fn(), getProjectMajorRequirements: vi.fn() }))
vi.mock('../../../services/service-gateway', () => ({ services: { task: { createTask: api.createTask } } }))
vi.mock('../api/project-review-api', () => ({ getProjectMajorRequirements: api.getProjectMajorRequirements }))
const project = { id: 9, academicScopeProvenance: 'FROZEN_REGISTRATION_SNAPSHOT', academicScope: { projectMode: 'INTERDISCIPLINARY', requirements: [{ majorId: 3 }, { majorId: 12 }] }, majors: [{ majorId: 3, majorName: 'Phần mềm' }, { majorId: 12, majorName: 'Thiết kế' }] } as ProjectDto
afterEach(() => { cleanup(); vi.resetAllMocks() })
it('prefills an assistant draft but still requires a valid milestone and discipline before creating', async () => {
  api.getProjectMajorRequirements.mockResolvedValue({ requirements: [{ majorId: 3 }, { majorId: 12 }] })
  render(<WorkspaceTaskForm project={project} initialDraft={{ title: 'Kiểm thử đăng nhập', description: 'Kiểm tra mật khẩu sai' }} milestones={[{ id: 2, title: 'Mốc 1' }]} members={[]} onCancel={vi.fn()} onCreated={vi.fn()} />)
  await screen.findByRole('combobox', { name: 'Ngành chính' })
  expect((screen.getByLabelText('Tên công việc') as HTMLInputElement).value).toBe('Kiểm thử đăng nhập')
  expect(api.createTask).not.toHaveBeenCalled()
  fireEvent.submit(screen.getByRole('button', { name: 'Tạo công việc' }).closest('form')!)
  expect(api.createTask).not.toHaveBeenCalled()
})
it('requires one primary and submits supporting disciplines in the same create request', async () => {
  api.getProjectMajorRequirements.mockResolvedValue({ requirements: [{ majorId: 3 }, { majorId: 12 }] })
  api.createTask.mockResolvedValue({ id: 1 })
  render(<WorkspaceTaskForm project={project} milestones={[{ id: 2, title: 'Mốc 1' }]} members={[]} onCancel={vi.fn()} onCreated={vi.fn()} />)
  await screen.findByRole('combobox', { name: 'Ngành chính' })
  fireEvent.change(screen.getByLabelText('Tên công việc'), { target: { value: 'Thiết kế ứng dụng' } })
  fireEvent.change(screen.getByLabelText('Mốc đồ án'), { target: { value: '2' } })
  fireEvent.submit(screen.getByRole('button', { name: 'Tạo công việc' }).closest('form')!)
  expect(api.createTask).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('Ngành chính'), { target: { value: '3' } })
  fireEvent.click(screen.getByRole('checkbox', { name: 'Thiết kế' }))
  fireEvent.click(screen.getByRole('button', { name: 'Tạo công việc' }))
  await vi.waitFor(() => expect(api.createTask).toHaveBeenCalledWith(expect.objectContaining({ disciplines: [{ majorId: 3, role: 'PRIMARY' }, { majorId: 12, role: 'SUPPORTING' }] })))
  expect(api.createTask).toHaveBeenCalledTimes(1)
})
it('blocks creation when the frozen scope is unknown', async () => {
  render(<WorkspaceTaskForm project={{ ...project, academicScopeProvenance: 'UNKNOWN' }} milestones={[{ id: 2, title: 'Mốc 1' }]} members={[]} onCancel={vi.fn()} onCreated={vi.fn()} />)
  expect((screen.getByRole('button', { name: 'Tạo công việc' }) as HTMLButtonElement).disabled).toBe(true)
  expect(api.createTask).not.toHaveBeenCalled()
})

it('prefills only uniquely matched project options and sends nothing until save', async () => {
  api.getProjectMajorRequirements.mockResolvedValue({ requirements: [{ majorId: 3 }, { majorId: 12 }] })
  api.createTask.mockResolvedValue({ id: 1 })
  render(<WorkspaceTaskForm project={project} initialDraft={{ title: 'Test API', description: 'Check scope', task: { dueAt: '2026-11-06T05:00:00Z', priority: 'HIGH', milestoneTitle: 'Mốc 1', primaryMajorName: 'Phần mềm', assigneeNames: ['Hung', 'Duplicate', 'Outsider'] } }} milestones={[{ id: 2, title: 'Mốc 1' }]} members={[{ userId: 1, fullName: 'Hung' }, { userId: 2, fullName: 'Duplicate' }, { userId: 3, fullName: 'Duplicate' }] as never} onCancel={vi.fn()} onCreated={vi.fn()} />)
  await screen.findByRole('combobox', { name: 'Ngành chính' })
  expect((screen.getByLabelText('Mốc đồ án') as HTMLSelectElement).value).toBe('2')
  expect((screen.getByLabelText('Ngành chính') as HTMLSelectElement).value).toBe('3')
  expect((screen.getByLabelText(/Hạn hoàn thành/) as HTMLInputElement).value).toBe('2026-11-06T12:00')
  expect((screen.getByRole('checkbox', { name: 'Hung' }) as HTMLInputElement).checked).toBe(true)
  expect(screen.getAllByRole('checkbox', { name: 'Duplicate' }).every(box => !(box as HTMLInputElement).checked)).toBe(true)
  expect(api.createTask).not.toHaveBeenCalled()
  fireEvent.submit(screen.getByRole('button', { name: 'Tạo công việc' }).closest('form')!)
  await vi.waitFor(() => expect(api.createTask).toHaveBeenCalledWith(expect.objectContaining({ milestoneId: 2, priority: 'HIGH', dueAt: '2026-11-06T05:00:00.000Z', assigneeUserIds: [1], disciplines: [{ majorId: 3, role: 'PRIMARY' }] })))
})
