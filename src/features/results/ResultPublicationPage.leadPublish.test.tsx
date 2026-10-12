import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ResultPublicationPage } from './ResultPublicationPage'
import { projectCapabilities } from '../../test/project-capabilities'

const capabilitiesApi = vi.hoisted(() => ({ getMyCapabilities: vi.fn() }))
const auth = vi.hoisted(() => ({ session: { accessToken: 'fixture', user: { roles: ['ADMIN', 'DEPARTMENT_STAFF'] } } }))
vi.mock('../auth/context/useAuthSession', () => ({ useAuthSession: () => auth }))
vi.mock('../capabilities/capabilities-api', async () => ({ ...await vi.importActual<typeof import('../capabilities/capabilities-api')>('../capabilities/capabilities-api'), ...capabilitiesApi }))

const api = vi.hoisted(() => ({ getProjectResult: vi.fn(), getResultPreview: vi.fn(), publishProjectResult: vi.fn(), configureResultPolicy: vi.fn() }))
vi.mock('../../services/api/project-results.api', () => api)
vi.mock('../../app/context/useAcademicWorkflow', () => ({ useAcademicWorkflow: () => ({ academic: { departments: [{ id: 2 }] } }) }))
vi.mock('./StudentResultPublicationPanel', () => ({ StudentResultPublicationPanel: () => <section aria-label="Kết quả sinh viên độc lập" /> }))
// A rollout flag never supplies authority; only the current server action does.
vi.mock('../../app/config/env', async () => {
  const actual = await vi.importActual<typeof import('../../app/config/env')>('../../app/config/env')
  return { env: { ...actual.env, leadDepartmentPublishEnabled: true } }
})

const preview = () => ({ canPublish: true, totalScore: 8, passThreshold: 5, outcome: 'PASS', blockers: [], confirmationToken: 'tok' })
const renderAt = (path: string, pattern: string) =>
  render(<MemoryRouter initialEntries={[path]}><Routes><Route path={pattern} element={<ResultPublicationPage />} /></Routes></MemoryRouter>)

beforeEach(() => { auth.session = { accessToken: 'fixture', user: { roles: ['ADMIN', 'DEPARTMENT_STAFF'] } }; capabilitiesApi.getMyCapabilities.mockResolvedValue(projectCapabilities(9)); api.getProjectResult.mockResolvedValue(null); api.getResultPreview.mockResolvedValue(preview()) })
afterEach(() => { cleanup(); vi.resetAllMocks() })

describe('ResultPublicationPage · Lead Department publication (BE-03)', () => {
  it('hides the publish CTA on the Admin route', async () => {
    auth.session = { accessToken: 'fixture', user: { roles: ['ADMIN'] } }
    capabilitiesApi.getMyCapabilities.mockResolvedValue(projectCapabilities(9, false))
    renderAt('/admin/projects/9/result', '/admin/projects/:projectId/result')
    await screen.findByRole('region', { name: 'Bản xem trước kết quả' })
    expect(screen.queryByRole('button', { name: 'Công bố kết quả đồ án' })).toBeNull()
    expect(screen.getAllByText(/Chỉ khoa chủ trì được công bố/).length).toBeGreaterThan(0)
  })

  it('keeps the publish CTA on the Department route', async () => {
    renderAt('/department/projects/9/result', '/department/projects/:projectId/result')
    await screen.findByRole('region', { name: 'Bản xem trước kết quả' })
    expect(screen.getByRole('button', { name: 'Công bố kết quả đồ án' })).toBeTruthy()
  })
  it('allows a server-authorized dual-role actor on an Admin route', async () => {
    renderAt('/admin/projects/9/result', '/admin/projects/:projectId/result')
    await screen.findByRole('button', { name: 'Công bố kết quả đồ án' })
  })
  it('does not grant a participating department publication authority from its route', async () => {
    capabilitiesApi.getMyCapabilities.mockResolvedValue(projectCapabilities(9, false))
    renderAt('/department/projects/9/result', '/department/projects/:projectId/result')
    await screen.findByRole('region', { name: 'Bản xem trước kết quả' })
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(api.publishProjectResult).not.toHaveBeenCalled()
  })
})
