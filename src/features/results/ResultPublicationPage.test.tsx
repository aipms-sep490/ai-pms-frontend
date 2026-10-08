import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HttpError } from '../../services/http/http-client'
import { ResultPublicationPage } from './ResultPublicationPage'

const api = vi.hoisted(() => ({ getProjectResult: vi.fn(), getResultPreview: vi.fn(), publishProjectResult: vi.fn(), configureResultPolicy: vi.fn() }))
vi.mock('../../services/api/project-results.api', () => api)
vi.mock('../../app/context/useAcademicWorkflow', () => ({ useAcademicWorkflow: () => ({ academic: { departments: [{ id: 2 }] } }) }))
vi.mock('./StudentResultPublicationPanel', () => ({ StudentResultPublicationPanel: () => <section aria-label="Kết quả sinh viên độc lập" /> }))
const preview = (token = 'current-token') => ({ canPublish: true, totalScore: 8, passThreshold: 5, outcome: 'PASS', blockers: [], confirmationToken: token })
function page() { render(<MemoryRouter initialEntries={['/department/projects/9/result']}><Routes><Route path="/department/projects/:projectId/result" element={<ResultPublicationPage />} /></Routes></MemoryRouter>) }
beforeEach(() => { api.getProjectResult.mockResolvedValue(null); api.getResultPreview.mockResolvedValue(preview()); api.publishProjectResult.mockResolvedValue({}) })
afterEach(() => { cleanup(); vi.resetAllMocks() })

it('replaces legacy writes with scoped scheme navigation', async () => {
  page()
  expect(await screen.findByRole('region', { name: 'Bản xem trước kết quả' })).toBeDefined()
  expect(screen.getByRole('link', { name: 'Quản lý phương án đánh giá' }).getAttribute('href')).toBe('/department/projects/9/evaluation-schemes')
  expect(screen.queryByRole('button', { name: 'Lưu cách tính điểm' })).toBeNull()
  expect(api.configureResultPolicy).not.toHaveBeenCalled()
})
it('requires review and confirmation, and cancellation never publishes', async () => {
  page(); await screen.findByRole('region', { name: 'Bản xem trước kết quả' })
  const button = screen.getByRole('button', { name: 'Công bố kết quả đồ án' }) as HTMLButtonElement
  expect(button.disabled).toBe(true)
  fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(button)
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Hủy' }))
  expect(api.publishProjectResult).not.toHaveBeenCalled()
})
it('publishes only the current token and refreshes result', async () => {
  page(); await screen.findByRole('region', { name: 'Bản xem trước kết quả' })
  fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByRole('button', { name: 'Công bố kết quả đồ án' }))
  api.getProjectResult.mockResolvedValue({ totalScore: 8, passThreshold: 5, outcome: 'PASS', publishedAt: '2026-10-07T00:00:00Z', calculationRule: 'server-rule' })
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận công bố' }))
  expect(await screen.findByRole('region', { name: 'Kết quả đồ án đã công bố' })).toBeDefined()
  expect(api.publishProjectResult).toHaveBeenCalledExactlyOnceWith(9, 'current-token')
})
it('invalidates confirmation and never replays publication after a conflict', async () => {
  page(); await screen.findByRole('region', { name: 'Bản xem trước kết quả' })
  api.publishProjectResult.mockRejectedValue(new HttpError('Stale token', 409))
  api.getResultPreview.mockResolvedValue(preview('fresh-token'))
  fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByRole('button', { name: 'Công bố kết quả đồ án' }))
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận công bố' }))
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('thay đổi'))
  expect(api.getResultPreview).toHaveBeenCalledTimes(2)
  expect(api.publishProjectResult).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('checkbox')).toBeNull()
})
it('shows a project preview forbidden error while preserving independent student results', async () => {
  api.getResultPreview.mockRejectedValue(new HttpError('Cross-department', 403))
  page()
  expect((await screen.findByRole('alert')).textContent).toContain('quyền')
  expect(screen.getByRole('region', { name: 'Kết quả sinh viên độc lập' })).toBeDefined()
  expect(screen.queryByRole('button', { name: 'Công bố kết quả đồ án' })).toBeNull()
})
