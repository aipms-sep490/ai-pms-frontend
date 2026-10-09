import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StudentProjectResultPage } from './StudentProjectResultPage'
import { HttpError } from '../../services/http/http-client'
const mocks = vi.hoisted(() => ({ journey: { project: { id: 1, majors: [{ majorId: 3, majorName: 'Phần mềm' }] } as { id: number; majors: {majorId:number;majorName:string}[] } | null, profile: { id: 7 }, isLoading: false }, getStudentResult: vi.fn() }))
vi.mock('../../app/context', () => ({ useStudentJourney: () => mocks.journey }))
vi.mock('../../services/api/project-results.api', () => ({ getStudentResult: mocks.getStudentResult }))
const result = { projectId: 1, studentId: 7, majorId: 3, schemeId: 2, totalScore: 8.25, passThreshold: 5, outcome: 'PASSED', publishedAt: '2026-10-01T12:00:00Z', calculationRule: 'SERVER_RULE', snapshotJson: '{}' }
afterEach(() => { cleanup(); vi.resetAllMocks(); mocks.journey.project = { id: 1, majors: [{ majorId: 3, majorName: 'Phần mềm' }] } })
it('does not show the previous own result when the project context disappears', async () => {
  mocks.getStudentResult.mockResolvedValue(result)
  const ui = <MemoryRouter><StudentProjectResultPage /></MemoryRouter>
  const view = render(ui); await screen.findByText('8.25')
  view.rerender(<MemoryRouter><StudentProjectResultPage /></MemoryRouter>)
  expect(screen.getByText('Phần mềm')).toBeTruthy()
  mocks.journey.project = null; view.rerender(<MemoryRouter><StudentProjectResultPage /></MemoryRouter>)
  expect(screen.queryByText('8.25')).toBeNull()
  expect(screen.queryByText('Kết quả chưa được công bố')).toBeNull()
})
it('ignores an old request completing after switching project', async () => {
  let old!: (value: unknown) => void
  mocks.getStudentResult.mockReturnValueOnce(new Promise(resolve => { old = resolve })).mockResolvedValueOnce(null)
  const view = render(<MemoryRouter><StudentProjectResultPage /></MemoryRouter>)
  mocks.journey.project = { id: 2, majors: [] }; view.rerender(<MemoryRouter><StudentProjectResultPage /></MemoryRouter>)
  await screen.findByText('Kết quả chưa được công bố')
  await act(async () => old(result))
  expect(screen.queryByText('8.25')).toBeNull()
  expect(screen.getByText('Kết quả chưa được công bố')).toBeTruthy()
})
it('distinguishes access denied from unpublished and retries the own student endpoint', async () => {
  mocks.getStudentResult.mockRejectedValueOnce(new HttpError('Denied', 403)).mockResolvedValueOnce(result)
  render(<MemoryRouter><StudentProjectResultPage /></MemoryRouter>)
  expect((await screen.findByRole('alert')).textContent).toContain('chưa có quyền')
  expect(screen.queryByText('Kết quả chưa được công bố')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }))
  await screen.findByText('8.25')
  expect(mocks.getStudentResult).toHaveBeenLastCalledWith(1, 7, expect.any(AbortSignal))
})
it('rejects a returned result belonging to another student', async () => {
  mocks.getStudentResult.mockResolvedValue({ ...result, studentId: 8 })
  render(<MemoryRouter><StudentProjectResultPage /></MemoryRouter>)
  await screen.findByRole('alert')
  expect(screen.queryByText('8.25')).toBeNull()
})
