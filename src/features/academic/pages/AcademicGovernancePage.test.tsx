import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AcademicGovernancePage } from './AcademicGovernancePage'
import { HttpError } from '../../../services/http/http-client'
const governanceHook=vi.hoisted(()=>({useAcademicGovernance:vi.fn()}));vi.mock('../hooks/useAcademicGovernance',()=>governanceHook);afterEach(cleanup)
const state=()=>({semesters:[{id:1,organizationId:1,organizationCode:'FPTU',organizationName:'FPT University',code:'FA26',name:'Fall 2026',startDate:'2026-09-01',endDate:'2026-12-31',status:'UPCOMING',createdAt:'',updatedAt:''}],periods:[{id:2,academicSemesterId:1,semesterCode:'FA26',semesterName:'Fall 2026',code:'REG-01',name:'Registration',periodType:'REGISTRATION',startAt:'2026-09-01T00:00',endAt:'2026-09-10T00:00',status:'DRAFT',minTeamSize:3,maxTeamSize:5,minDistinctMajors:1,maxProjectsPerSupervisor:5,milestoneTemplateId:null,rubricId:null,createdAt:'',updatedAt:''}],error:null,loading:false,isForbidden:false,isUnauthorized:false,canManage:true,submitting:false,retry:vi.fn(),saveSemester:vi.fn(),saveProjectPeriod:vi.fn(),setStatus:vi.fn()})
beforeEach(()=>governanceHook.useAcademicGovernance.mockImplementation(()=>state()))

function fillPeriod() {
  fireEvent.click(screen.getByRole('button', { name: 'Thêm giai đoạn' }))
  const dialog = screen.getByRole('dialog')
  fireEvent.change(within(dialog).getByLabelText('Học kỳ'), { target: { value: '1' } })
  fireEvent.change(within(dialog).getByLabelText('Mã giai đoạn'), { target: { value: 'OVERLAP-TEST' } })
  fireEvent.change(within(dialog).getByLabelText('Tên giai đoạn'), { target: { value: 'Giai đoạn kiểm thử' } })
  fireEvent.change(within(dialog).getByLabelText(/^Bắt đầu/), { target: { value: '2026-09-02T08:00' } })
  fireEvent.change(within(dialog).getByLabelText(/^Kết thúc/), { target: { value: '2026-09-03T17:00' } })
  fireEvent.submit(within(dialog).getByLabelText('Mã giai đoạn').closest('form')!)
  return dialog
}

it('preserves period input after the real uncoded overlap rejection without an automatic retry CTA', async () => {
  const data = state()
  data.saveProjectPeriod.mockRejectedValue(new HttpError('Conflict', 409, {
    detail: "Project Period window overlaps with an existing 'REGISTRATION' period in this semester.", traceId: 'PRIVATE_TRACE',
  }))
  governanceHook.useAcademicGovernance.mockReturnValue(data)
  render(<AcademicGovernancePage />, { wrapper: MemoryRouter })
  const dialog = fillPeriod()
  expect((await within(dialog).findByRole('alert')).textContent).toContain('kiểm tra mã, khoảng thời gian')
  expect((within(dialog).getByLabelText('Mã giai đoạn') as HTMLInputElement).value).toBe('OVERLAP-TEST')
  expect(within(dialog).queryByRole('button', { name: 'Thử lại' })).toBeNull()
  expect(dialog.textContent).not.toMatch(/PRIVATE|overlaps/)
  expect(data.saveProjectPeriod).toHaveBeenCalledTimes(1)
})

it('shows an accessible field correction after 422 while retaining input', async () => {
  const data = state()
  data.saveProjectPeriod.mockRejectedValue(new HttpError('Invalid', 422, { errors: { EndAt: ['PRIVATE_DATE'] } }))
  governanceHook.useAcademicGovernance.mockReturnValue(data)
  render(<AcademicGovernancePage />, { wrapper: MemoryRouter })
  const dialog = fillPeriod()
  await within(dialog).findByRole('alert')
  const end = within(dialog).getByLabelText(/^Kết thúc/)
  expect(end.getAttribute('aria-invalid')).toBe('true')
  expect(document.getElementById(end.getAttribute('aria-describedby')!)?.textContent).toContain('Kiểm tra thời gian kết thúc')
  expect((end as HTMLInputElement).value).toBe('2026-09-03T17:00')
  expect(dialog.textContent).not.toContain('PRIVATE_DATE')
})

it('offers an explicit retry only after a temporary failure', async () => {
  const data = state()
  data.saveProjectPeriod.mockRejectedValue(new HttpError('PRIVATE_SERVER', 503))
  governanceHook.useAcademicGovernance.mockReturnValue(data)
  render(<AcademicGovernancePage />, { wrapper: MemoryRouter })
  const dialog = fillPeriod()
  expect(await within(dialog).findByRole('button', { name: 'Thử lại' })).toBeTruthy()
  expect(data.saveProjectPeriod).toHaveBeenCalledTimes(1)
})
describe('AcademicGovernancePage',()=>{it('renders semester ownership and the period policy entry',()=>{render(<AcademicGovernancePage/>,{wrapper:MemoryRouter});expect(screen.getByText('Fall 2026')).toBeDefined();expect(screen.getByText('Registration')).toBeDefined();expect(screen.getByText('Số thành viên')).toBeDefined();expect(screen.getByText('Đồ án tối đa mỗi GVHD')).toBeDefined();expect(screen.getByRole('link',{name:'Các phiên bản chính sách'})).toBeDefined();expect(screen.getByText(/Điều kiện về thành viên và ngành tham gia/)).toBeDefined()});it('exposes structure editing separately from semester editing while the backend permits mutation',()=>{render(<AcademicGovernancePage/>,{wrapper:MemoryRouter});expect(screen.getAllByRole('button',{name:'Chỉnh sửa'})).toHaveLength(1);expect(screen.getByRole('button',{name:'Chỉnh sửa cấu trúc'})).toBeDefined()});it('does not present an unavailable transition for archived records',()=>{governanceHook.useAcademicGovernance.mockReturnValue({...state(),semesters:[{...state().semesters[0],status:'ARCHIVED'}],periods:[]});render(<AcademicGovernancePage/>,{wrapper:MemoryRouter});expect(screen.queryByRole('button',{name:'Chỉnh sửa'})).toBeNull();expect(screen.queryByRole('button',{name:'Sắp diễn ra'})).toBeNull()});it('keeps unauthorized access on the existing login path',()=>{governanceHook.useAcademicGovernance.mockReturnValue({...state(),isUnauthorized:true});render(<AcademicGovernancePage/>,{wrapper:MemoryRouter});expect(screen.getByRole('link',{name:'Đăng nhập'})).toBeDefined()})})
