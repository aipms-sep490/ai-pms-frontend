import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { HttpError } from '../../../services/http/http-client'

const mocks = vi.hoisted(() => ({ getSemesters: vi.fn(), getAcademicHierarchy: vi.fn(), exportTeamRoster: vi.fn(), useAuthSession: vi.fn() }))
vi.mock('../../academic/api/governance-api', () => ({ getSemesters: mocks.getSemesters }))
vi.mock('../../academic/api/academic-api', () => ({ getAcademicHierarchy: mocks.getAcademicHierarchy }))
vi.mock('../api/roster-export-api', () => ({ exportTeamRoster: mocks.exportTeamRoster }))
vi.mock('../../auth/context/useAuthSession', () => ({ useAuthSession: mocks.useAuthSession }))
import { RosterExportDialog } from './RosterExportDialog'

const semester = { id: 7, organizationId: 1, organizationCode: 'FPT', name: 'Fall 2026', code: 'FA26' }
const department = (id: number) => ({ department: { id, name: `Bộ môn ${id}`, isActive: true }, majors: [{ id: id * 10, code: `M${id}`, name: `Ngành ${id}`, isActive: true }] })
let clickedFile = ''

beforeEach(() => {
  mocks.useAuthSession.mockReturnValue({ session: { accessToken: 'token', user: { roles: ['ADMIN'] } } })
  mocks.getSemesters.mockResolvedValue({ items: [semester, { ...semester, id: 8, organizationId: 2, name: 'Spring 2027' }], totalCount: 2 })
  mocks.getAcademicHierarchy.mockResolvedValue([{ organization: { id: 1 }, departments: [department(2), department(3)] }, { organization: { id: 2 }, departments: [department(4)] }])
  mocks.exportTeamRoster.mockResolvedValue(new Blob(['xlsx']))
  clickedFile = ''
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { clickedFile = this.download })
  vi.stubGlobal('URL', class extends URL { static createObjectURL = vi.fn(() => 'blob:roster'); static revokeObjectURL = vi.fn() })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllMocks(); vi.useRealTimers() })

async function chooseSemester() {
  await screen.findByRole('option', { name: /Fall 2026/ })
  fireEvent.change(screen.getByLabelText(/Học kỳ/), { target: { value: '7' } })
}

it('requires a semester and limits department choices to that organization', async () => {
  render(<RosterExportDialog onClose={vi.fn()} />)
  expect((screen.getByRole('button', { name: 'Tải Excel' }) as HTMLButtonElement).disabled).toBe(true)
  await chooseSemester()
  expect((screen.getByRole('button', { name: 'Tải Excel' }) as HTMLButtonElement).disabled).toBe(false)
  expect(screen.queryByRole('option', { name: 'Bộ môn 4' })).toBeNull()
  expect(screen.getByText(/Sinh viên chưa có nhóm/)).toBeTruthy()
})

it('resets dependent filters and sends the selected scope to the server', async () => {
  render(<RosterExportDialog onClose={vi.fn()} />)
  await chooseSemester()
  fireEvent.change(screen.getByLabelText('Bộ môn'), { target: { value: '2' } })
  fireEvent.change(screen.getByLabelText('Chuyên ngành'), { target: { value: '20' } })
  expect(screen.getByText(/một phần nhóm liên ngành/)).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Bộ môn'), { target: { value: '3' } })
  expect((screen.getByLabelText('Chuyên ngành') as HTMLSelectElement).value).toBe('')
  fireEvent.change(screen.getByLabelText(/Học kỳ/), { target: { value: '8' } })
  expect((screen.getByLabelText('Bộ môn') as HTMLSelectElement).value).toBe('')
  expect(screen.queryByRole('option', { name: 'Bộ môn 2' })).toBeNull()
  fireEvent.change(screen.getByLabelText('Bộ môn'), { target: { value: '4' } })
  fireEvent.change(screen.getByLabelText('Chuyên ngành'), { target: { value: '40' } })
  fireEvent.click(screen.getByRole('button', { name: 'Tải Excel' }))
  await screen.findByText(/Đã tạo tệp Excel/)
  expect(mocks.exportTeamRoster).toHaveBeenCalledWith({ semesterId: 8, departmentId: 4, majorId: 40 }, 'token', expect.any(AbortSignal))
  expect(clickedFile).toBe('team-roster-8.xlsx')
})

it('prevents duplicate requests and releases the download URL', async () => {
  let resolve!: (value: Blob) => void
  mocks.exportTeamRoster.mockReturnValue(new Promise<Blob>(done => { resolve = done }))
  render(<RosterExportDialog onClose={vi.fn()} />)
  await chooseSemester()
  const form = screen.getByRole('button', { name: 'Tải Excel' }).closest('form')!
  fireEvent.submit(form)
  fireEvent.submit(form)
  expect(mocks.exportTeamRoster).toHaveBeenCalledTimes(1)
  expect((screen.getByRole('button', { name: 'Đóng' }) as HTMLButtonElement).disabled).toBe(true)
  vi.useFakeTimers()
  await act(async () => resolve(new Blob(['xlsx'])))
  expect(clickedFile).toBe('team-roster-7.xlsx')
  act(() => vi.advanceTimersByTime(60_000))
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:roster')
})

it.each([[401, /đăng nhập đã hết hạn/], [403, /Admin đang hoạt động/], [404, /không còn hợp lệ/], [422, /10.000 sinh viên/], [503, /Vui lòng thử lại/]])('explains HTTP %s without starting a download', async (status, message) => {
  mocks.exportTeamRoster.mockRejectedValue(new HttpError('Failed', Number(status)))
  render(<RosterExportDialog onClose={vi.fn()} />)
  await chooseSemester()
  fireEvent.click(screen.getByRole('button', { name: 'Tải Excel' }))
  expect((await screen.findByRole('alert')).textContent).toMatch(message as RegExp)
  expect(clickedFile).toBe('')
  expect((screen.getByRole('button', { name: 'Tải Excel' }) as HTMLButtonElement).disabled).toBe(false)
})

it('retries failed option loading and includes semesters from later pages', async () => {
  mocks.getSemesters.mockRejectedValueOnce(new Error('Offline'))
  render(<RosterExportDialog onClose={vi.fn()} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }))
  await chooseSemester()
  cleanup()
  mocks.getSemesters.mockImplementation((_token, _filters, _signal, page) => Promise.resolve({ items: [{ ...semester, id: page, name: `Page ${page}` }], totalCount: 2 }))
  render(<RosterExportDialog onClose={vi.fn()} />)
  expect(await screen.findByRole('option', { name: /Page 2/ })).toBeTruthy()
})

it('does not load export data for a non-admin actor', async () => {
  mocks.useAuthSession.mockReturnValue({ session: { accessToken: 'student-token', user: { roles: ['STUDENT'] } } })
  render(<RosterExportDialog onClose={vi.fn()} />)
  expect(screen.getByRole('alert').textContent).toMatch(/Chỉ tài khoản Admin/)
  expect(mocks.getSemesters).not.toHaveBeenCalled()
  expect(mocks.getAcademicHierarchy).not.toHaveBeenCalled()
})

it('aborts an in-flight download when leaving the page', async () => {
  mocks.exportTeamRoster.mockReturnValue(new Promise(() => {}))
  const view = render(<RosterExportDialog onClose={vi.fn()} />)
  await chooseSemester()
  fireEvent.click(screen.getByRole('button', { name: 'Tải Excel' }))
  await waitFor(() => expect(mocks.exportTeamRoster).toHaveBeenCalledTimes(1))
  const signal = mocks.exportTeamRoster.mock.calls[0][2] as AbortSignal
  view.unmount()
  expect(signal.aborted).toBe(true)
})
