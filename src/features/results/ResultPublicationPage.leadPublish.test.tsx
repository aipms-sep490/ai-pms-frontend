import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ResultPublicationPage } from './ResultPublicationPage'

const api = vi.hoisted(() => ({ getProjectResult: vi.fn(), getResultPreview: vi.fn(), publishProjectResult: vi.fn(), configureResultPolicy: vi.fn() }))
vi.mock('../../services/api/project-results.api', () => api)
vi.mock('../../app/context/useAcademicWorkflow', () => ({ useAcademicWorkflow: () => ({ academic: { departments: [{ id: 2 }] } }) }))
vi.mock('./StudentResultPublicationPanel', () => ({ StudentResultPublicationPanel: () => <section aria-label="Kết quả sinh viên độc lập" /> }))
// BE-03: Lead Department owns publication — flag turned on for this suite.
vi.mock('../../app/config/env', async () => {
  const actual = await vi.importActual<typeof import('../../app/config/env')>('../../app/config/env')
  return { env: { ...actual.env, leadDepartmentPublishEnabled: true } }
})

const preview = () => ({ canPublish: true, totalScore: 8, passThreshold: 5, outcome: 'PASS', blockers: [], confirmationToken: 'tok' })
const renderAt = (path: string, pattern: string) =>
  render(<MemoryRouter initialEntries={[path]}><Routes><Route path={pattern} element={<ResultPublicationPage />} /></Routes></MemoryRouter>)

beforeEach(() => { api.getProjectResult.mockResolvedValue(null); api.getResultPreview.mockResolvedValue(preview()) })
afterEach(() => { cleanup(); vi.resetAllMocks() })

describe('ResultPublicationPage · Lead Department publication (BE-03)', () => {
  it('hides the publish CTA on the Admin route', async () => {
    renderAt('/admin/projects/9/result', '/admin/projects/:projectId/result')
    await screen.findByRole('region', { name: 'Bản xem trước kết quả' })
    expect(screen.queryByRole('button', { name: 'Công bố kết quả đồ án' })).toBeNull()
    expect(screen.getByText(/Khoa chủ trì \(Lead Department\) công bố/)).toBeTruthy()
  })

  it('keeps the publish CTA on the Department route', async () => {
    renderAt('/department/projects/9/result', '/department/projects/:projectId/result')
    await screen.findByRole('region', { name: 'Bản xem trước kết quả' })
    expect(screen.getByRole('button', { name: 'Công bố kết quả đồ án' })).toBeTruthy()
  })
})
