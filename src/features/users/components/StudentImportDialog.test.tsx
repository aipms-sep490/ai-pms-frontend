import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { HttpError } from '../../../services/http/http-client'

const mocks = vi.hoisted(() => ({ previewStudentImport: vi.fn(), commitStudentImport: vi.fn(), useAuthSession: vi.fn() }))
vi.mock('../api/student-import-api', () => mocks)
vi.mock('../../auth/context/useAuthSession', () => ({ useAuthSession: mocks.useAuthSession }))
vi.mock('../../academic/components/AcademicScopeFields', () => ({ AcademicScopeFields: ({ majorId, onChange, disabled }: { majorId: string; disabled: boolean; onChange: (scope: { departmentId: string; majorId: string }) => void }) => <label>Chuyên ngành<select value={majorId} disabled={disabled} onChange={event => onChange({ departmentId: '2', majorId: event.target.value })}><option value="">Chọn</option><option value="7">SE</option><option value="8">IS</option></select></label> }))
import { StudentImportDialog } from './StudentImportDialog'

const account = { rowNumber: 2, studentCode: 'DE0001', fullName: 'Nguyễn An', email: 'an@gmail.com', phone: '0123456789', curriculumCode: 'BIT_SE' }
const file = new File(['MSSV,Ho ten,Email\nDE0001,Nguyen An,an@gmail.com'], 'students.csv')
const selectScope = (id = '7') => fireEvent.change(screen.getByLabelText('Chuyên ngành'), { target: { value: id } })
const chooseFile = (value = file) => fireEvent.change(screen.getByLabelText('File danh sách sinh viên'), { target: { files: [value] } })
const createButton = () => screen.getByRole('button', { name: 'Tạo tài khoản sinh viên' }) as HTMLButtonElement
async function preview() { selectScope(); chooseFile(); fireEvent.click(screen.getByRole('button', { name: 'Xem trước danh sách' })); await screen.findByRole('region', { name: 'Danh sách tài khoản sẽ tạo' }) }
beforeEach(() => {
  mocks.useAuthSession.mockReturnValue({ session: { accessToken: 'token', user: { roles: ['ADMIN'] } } })
  mocks.previewStudentImport.mockResolvedValue({ majorId: 7, majorName: 'SE', departmentName: 'IT', canCommit: true, rows: [{ account, errors: [] }] })
  mocks.commitStudentImport.mockResolvedValue({ created: 1 })
})
afterEach(() => { cleanup(); vi.resetAllMocks() })

it('requires scope, preview and confirmation before creating Google student accounts', async () => {
  const refresh = vi.fn(); render(<StudentImportDialog onClose={vi.fn()} onImported={refresh} />)
  chooseFile(); expect((screen.getByRole('button', { name: 'Xem trước danh sách' }) as HTMLButtonElement).disabled).toBe(true)
  await preview()
  expect(mocks.previewStudentImport).toHaveBeenCalledWith(file, 7, 'token', expect.any(AbortSignal))
  expect(screen.getByText(/an@gmail.com/)).toBeTruthy(); expect(createButton().disabled).toBe(true)
  fireEvent.click(screen.getByRole('checkbox', { name: /Tôi đã kiểm tra/ })); fireEvent.click(createButton())
  await screen.findByText(/Đã tạo 1 tài khoản/)
  expect(mocks.commitStudentImport).toHaveBeenCalledWith(7, [account], 'token', expect.any(AbortSignal))
  expect(refresh).toHaveBeenCalledOnce(); expect(createButton().disabled).toBe(true)
})

it.each(['scope', 'file'])('invalidates the confirmed preview when changing %s', async field => {
  render(<StudentImportDialog onClose={vi.fn()} onImported={vi.fn()} />); await preview()
  fireEvent.click(screen.getByRole('checkbox', { name: /Tôi đã kiểm tra/ }))
  if (field === 'scope') selectScope('8'); else chooseFile(new File(['data'], 'new.xlsx'))
  expect(createButton().disabled).toBe(true); expect(screen.queryByRole('region', { name: 'Danh sách tài khoản sẽ tạo' })).toBeNull()
})

it('blocks the entire batch on duplicate and existing-account errors', async () => {
  mocks.previewStudentImport.mockResolvedValue({ majorId: 7, majorName: 'SE', departmentName: 'IT', canCommit: false, rows: [{ account, errors: ['EMAIL_ALREADY_EXISTS', 'DUPLICATE_STUDENT_CODE'] }] })
  render(<StudentImportDialog onClose={vi.fn()} onImported={vi.fn()} />); await preview()
  expect(screen.getByText('Email đã có tài khoản.')).toBeTruthy(); expect(createButton().disabled).toBe(true)
  expect(mocks.commitStudentImport).not.toHaveBeenCalled()
})

it.each([409, 500])('requires another preview after uncertain/conflicting commit %s', async status => {
  mocks.commitStudentImport.mockRejectedValue(new HttpError('Failed', status))
  render(<StudentImportDialog onClose={vi.fn()} onImported={vi.fn()} />); await preview()
  fireEvent.click(screen.getByRole('checkbox', { name: /Tôi đã kiểm tra/ })); fireEvent.click(createButton())
  await screen.findByRole('alert'); expect(createButton().disabled).toBe(true)
  expect(mocks.commitStudentImport).toHaveBeenCalledOnce()
  expect(screen.queryByRole('region', { name: 'Danh sách tài khoản sẽ tạo' })).toBeNull()
})

it('locks duplicate clicks during commit', async () => {
  let resolve!: (value: { created: number }) => void
  mocks.commitStudentImport.mockReturnValue(new Promise(done => { resolve = done }))
  render(<StudentImportDialog onClose={vi.fn()} onImported={vi.fn()} />); await preview()
  fireEvent.click(screen.getByRole('checkbox', { name: /Tôi đã kiểm tra/ }))
  const button = createButton(); fireEvent.click(button); fireEvent.click(button)
  expect(mocks.commitStudentImport).toHaveBeenCalledOnce()
  expect((screen.getByRole('button', { name: 'Đóng' }) as HTMLButtonElement).disabled).toBe(true)
  await act(async () => resolve({ created: 1 }))
})

it.each([new File(['data'], 'students.xls'), new File([], 'students.csv')])('rejects an invalid file: $name', invalid => {
  render(<StudentImportDialog onClose={vi.fn()} onImported={vi.fn()} />); selectScope(); chooseFile(invalid)
  expect(screen.getByRole('alert')).toBeTruthy(); expect(mocks.previewStudentImport).not.toHaveBeenCalled()
})

it('denies non-admin', () => {
  mocks.useAuthSession.mockReturnValue({ session: { user: { roles: ['STUDENT'] } } })
  render(<StudentImportDialog onClose={vi.fn()} onImported={vi.fn()} />)
  expect(screen.queryByLabelText('File danh sách sinh viên')).toBeNull(); expect(createButton().disabled).toBe(true)
})
