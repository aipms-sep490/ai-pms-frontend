import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { WorkspaceTaskForm } from './WorkspaceTaskForm'
import type { ProjectDto } from '../../../types/backend'
const api = vi.hoisted(() => ({ createTask: vi.fn(), getProjectMajorRequirements: vi.fn() }))
vi.mock('../../../services/service-gateway', () => ({ services: { task: { createTask: api.createTask } } }))
vi.mock('../api/project-review-api', () => ({ getProjectMajorRequirements: api.getProjectMajorRequirements }))
const project = { id: 9, academicScopeProvenance: 'FROZEN_REGISTRATION_SNAPSHOT', academicScope: { projectMode: 'INTERDISCIPLINARY', requirements: [{ majorId: 3 }, { majorId: 12 }] }, majors: [{ majorId: 3, majorName: 'Phần mềm' }, { majorId: 12, majorName: 'Thiết kế' }] } as ProjectDto
afterEach(() => { cleanup(); vi.resetAllMocks() })
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
