import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ResultHistoryPanel } from './ResultHistoryPanel'
const api = vi.hoisted(() => ({ getProjectResultHistory: vi.fn(), getProjectResultVersion: vi.fn(), getStudentResultHistory: vi.fn(), getStudentResultVersion: vi.fn() }))
vi.mock('../../services/api/project-results.api', () => api)
beforeEach(() => { vi.clearAllMocks(); api.getProjectResultHistory.mockResolvedValue({ items: [{ version: 2, supersedesVersion: 1, totalScore: 8, outcome: 'PASS', publishedAt: '2026-10-15T00:00:00Z' }], totalCount: 21 }); api.getStudentResultHistory.mockResolvedValue({ items: [], totalCount: 0 }) })
afterEach(cleanup)
it('loads the exact selected published version and paginates using the server count', async () => {
  api.getProjectResultVersion.mockResolvedValue({ projectId: 9, version: 2, totalScore: 8, outcome: 'PASS', contributions: [] })
  render(<ResultHistoryPanel projectId={9} />)
  fireEvent.click(await screen.findByRole('button', { name: /v2 · 8/ }))
  expect(await screen.findByText('Phiên bản đã chọn: v2 · 8 · PASS')).toBeTruthy()
  expect(api.getProjectResultVersion).toHaveBeenCalledWith(9, 2)
  fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
  await waitFor(() => expect(api.getProjectResultHistory).toHaveBeenCalledWith(9, 2, 20, expect.any(AbortSignal)))
})
it('does not show a result returned for a different student or version', async () => {
  api.getStudentResultHistory.mockResolvedValue({ items: [{ version: 2, totalScore: 8, outcome: 'PASS', publishedAt: '2026-10-15T00:00:00Z' }], totalCount: 1 })
  api.getStudentResultVersion.mockResolvedValue({ projectId: 9, studentId: 99, version: 2, totalScore: 10, outcome: 'PASS' })
  render(<ResultHistoryPanel projectId={9} studentId={88} />)
  fireEvent.click(await screen.findByRole('button', { name: /v2 · 8/ }))
  expect(await screen.findByRole('alert')).toBeTruthy()
  expect(screen.queryByText(/Phiên bản đã chọn/)).toBeNull()
  expect(api.getStudentResultVersion).toHaveBeenCalledWith(9, 88, 2)
})
