import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { HttpError } from '../../../services/http/http-client'
import type { CurriculumPreviewRow } from '../api/curriculum-import-api'

const mocks = vi.hoisted(() => ({ previewCurriculum: vi.fn(), commitCurriculum: vi.fn(), useAuthSession: vi.fn() }))
vi.mock('../api/curriculum-import-api', async importOriginal => ({ ...await importOriginal<typeof import('../api/curriculum-import-api')>(), previewCurriculum: mocks.previewCurriculum, commitCurriculum: mocks.commitCurriculum }))
vi.mock('../../auth/context/useAuthSession', () => ({ useAuthSession: mocks.useAuthSession }))
import { CurriculumImportDialog } from './CurriculumImportDialog'

const row: CurriculumPreviewRow = { rowNumber: 2, studentCode: 'DE0001', fullName: 'Sinh viên thử', userId: 7, currentCurriculumCode: 'OLD', curriculumCode: 'NEW', expectedConcurrencyToken: 'version-1', status: 'UPDATE', errors: [] }
const file = new File(['MSSV,Khung\nDE0001,NEW'], 'curriculum.csv', { type: 'text/csv' })
const choose = (value = file) => fireEvent.change(screen.getByLabelText('Tệp MSSV + Khung'), { target: { files: [value] } })
const confirmButton = () => screen.getByRole('button', { name: 'Xác nhận cập nhật' }) as HTMLButtonElement
async function preview() {
  choose()
  fireEvent.click(screen.getByRole('button', { name: 'Xem trước' }))
  await screen.findByRole('region', { name: 'Kết quả xem trước' })
}
beforeEach(() => {
  mocks.useAuthSession.mockReturnValue({ session: { accessToken: 'token', user: { roles: ['ADMIN'] } } })
  mocks.previewCurriculum.mockResolvedValue({ rows: [row], canCommit: true })
  mocks.commitCurriculum.mockResolvedValue({ updated: 1, unchanged: 0 })
})
afterEach(() => { cleanup(); vi.resetAllMocks() })

it('requires preview and explicit confirmation, then refreshes accounts after success', async () => {
  const refresh = vi.fn()
  render(<CurriculumImportDialog onClose={vi.fn()} onImported={refresh} />)
  expect(confirmButton().disabled).toBe(true)
  await preview()
  expect(screen.getByText('OLD')).toBeTruthy()
  expect(screen.getByText('NEW')).toBeTruthy()
  expect(confirmButton().disabled).toBe(true)
  fireEvent.click(screen.getByRole('checkbox', { name: /Tôi đã kiểm tra/ }))
  fireEvent.click(confirmButton())
  await screen.findByText('Đã cập nhật 1 sinh viên; 0 sinh viên không đổi.')
  expect(refresh).toHaveBeenCalledOnce()
  expect(mocks.commitCurriculum).toHaveBeenCalledWith([{ userId: 7, studentCode: 'DE0001', curriculumCode: 'NEW', expectedConcurrencyToken: 'version-1' }], 'token', expect.any(AbortSignal))
  expect(confirmButton().disabled).toBe(true)
})

it.each([new File(['data'], 'wrong.xls'), new File([], 'empty.csv'), new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.xlsx')])('rejects invalid files locally: $name', badFile => {
  render(<CurriculumImportDialog onClose={vi.fn()} onImported={vi.fn()} />)
  choose(badFile)
  expect(screen.getByRole('alert')).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Xem trước' }) as HTMLButtonElement).disabled).toBe(true)
  expect(mocks.previewCurriculum).not.toHaveBeenCalled()
})

it('invalidates preview and confirmation when a different file is selected', async () => {
  render(<CurriculumImportDialog onClose={vi.fn()} onImported={vi.fn()} />)
  await preview()
  fireEvent.click(screen.getByRole('checkbox', { name: /Tôi đã kiểm tra/ }))
  choose(new File(['data'], 'new.xlsx'))
  expect(screen.queryByRole('region', { name: 'Kết quả xem trước' })).toBeNull()
  expect(confirmButton().disabled).toBe(true)
})

it('shows row errors and skipped values, and never commits the valid subset of a failed batch', async () => {
  mocks.previewCurriculum.mockResolvedValue({ canCommit: false, rows: [row, { ...row, rowNumber: 3, status: 'ERROR', errors: ['DUPLICATE_STUDENT_CODE'] }, { ...row, rowNumber: 4, status: 'SKIPPED', curriculumCode: '' }] })
  render(<CurriculumImportDialog onClose={vi.fn()} onImported={vi.fn()} />)
  await preview()
  expect(screen.getByText('MSSV bị trùng trong tệp.')).toBeTruthy()
  expect(screen.getByText('Bỏ qua')).toBeTruthy()
  fireEvent.click(screen.getByRole('checkbox', { name: 'Chỉ hiện dòng lỗi' }))
  expect(screen.queryByText('Bỏ qua')).toBeNull()
  expect(confirmButton().disabled).toBe(true)
  expect(mocks.commitCurriculum).not.toHaveBeenCalled()
})

it.each([409, 503])('requires a fresh preview after commit failure %s without retrying mutations', async status => {
  mocks.commitCurriculum.mockRejectedValue(new HttpError('Failure', status))
  render(<CurriculumImportDialog onClose={vi.fn()} onImported={vi.fn()} />)
  await preview()
  fireEvent.click(screen.getByRole('checkbox', { name: /Tôi đã kiểm tra/ }))
  fireEvent.click(confirmButton())
  await screen.findByRole('alert')
  expect(confirmButton().disabled).toBe(true)
  expect(screen.queryByRole('region', { name: 'Kết quả xem trước' })).toBeNull()
  expect(mocks.commitCurriculum).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole('button', { name: 'Xem trước' }))
  await screen.findByRole('region', { name: 'Kết quả xem trước' })
  expect(confirmButton().disabled).toBe(true)
})

it('maps backend file validation errors', async () => {
  mocks.previewCurriculum.mockRejectedValue(new HttpError('Invalid file', 400, { errors: { file: ['IMPORT_HEADERS_REQUIRE_UNIQUE_MSSV_AND_CURRICULUM'] } } as never))
  render(<CurriculumImportDialog onClose={vi.fn()} onImported={vi.fn()} />)
  choose()
  fireEvent.click(screen.getByRole('button', { name: 'Xem trước' }))
  expect((await screen.findByRole('alert')).textContent).toMatch(/hai cột MSSV và Khung/)
})

it('paginates the preview without dropping rows from the commit', async () => {
  mocks.previewCurriculum.mockResolvedValue({ canCommit: true, rows: Array.from({ length: 26 }, (_, index) => ({ ...row, rowNumber: index + 2, userId: index + 1, studentCode: `DE${index + 1}` })) })
  render(<CurriculumImportDialog onClose={vi.fn()} onImported={vi.fn()} />)
  await preview()
  expect(screen.queryByText('DE26')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
  expect(screen.getByText('DE26')).toBeTruthy()
  fireEvent.click(screen.getByRole('checkbox', { name: /Tôi đã kiểm tra/ }))
  fireEvent.click(confirmButton())
  await waitFor(() => expect(mocks.commitCurriculum).toHaveBeenCalledOnce())
  expect(mocks.commitCurriculum.mock.calls[0][0]).toHaveLength(26)
})

it('locks duplicate commit clicks and close while saving', async () => {
  let resolve!: (value: { updated: number; unchanged: number }) => void
  mocks.commitCurriculum.mockReturnValue(new Promise(done => { resolve = done }))
  render(<CurriculumImportDialog onClose={vi.fn()} onImported={vi.fn()} />)
  await preview()
  fireEvent.click(screen.getByRole('checkbox', { name: /Tôi đã kiểm tra/ }))
  const button = confirmButton()
  fireEvent.click(button); fireEvent.click(button)
  expect(mocks.commitCurriculum).toHaveBeenCalledOnce()
  expect((screen.getByRole('button', { name: 'Đóng' }) as HTMLButtonElement).disabled).toBe(true)
  await act(async () => resolve({ updated: 1, unchanged: 0 }))
})

it('blocks non-admin and unauthenticated sessions', () => {
  mocks.useAuthSession.mockReturnValue({ session: { user: { roles: ['STUDENT'] } } })
  render(<CurriculumImportDialog onClose={vi.fn()} onImported={vi.fn()} />)
  expect(screen.getByRole('alert').textContent).toMatch(/Chỉ Admin/)
  expect(screen.queryByLabelText('Tệp MSSV + Khung')).toBeNull()
  expect(confirmButton().disabled).toBe(true)
})

it('aborts preview when unmounted', async () => {
  mocks.previewCurriculum.mockReturnValue(new Promise(() => {}))
  const view = render(<CurriculumImportDialog onClose={vi.fn()} onImported={vi.fn()} />)
  choose(); fireEvent.click(screen.getByRole('button', { name: 'Xem trước' }))
  const signal = mocks.previewCurriculum.mock.calls[0][2] as AbortSignal
  view.unmount()
  expect(signal.aborted).toBe(true)
})
