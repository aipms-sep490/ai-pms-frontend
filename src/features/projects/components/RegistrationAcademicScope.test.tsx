import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { RegistrationAcademicScope } from './RegistrationAcademicScope'

const getMajors = vi.hoisted(() => vi.fn())
vi.mock('../../../services/service-gateway', () => ({ services: { academic: { getMajors } } }))
afterEach(() => { cleanup(); vi.resetAllMocks() })
const scope = { projectMode: 'SINGLE_MAJOR' as const, primaryMajorId: 3, leadDepartmentId: 4, requirements: [{ majorId: 3, minMembers: 3, maxMembers: 5, responsibility: 'Phát triển phần mềm' }], concurrencyToken: 'token' }
const majors = [{ id: 3, name: 'Công nghệ thông tin', code: 'IT', departmentId: 4, departmentName: 'Khoa Công nghệ', departmentCode: 'CNTT' }]

it('resolves the frozen IDs to catalog labels without changing the scope', async () => {
  getMajors.mockResolvedValue(majors)
  render(<RegistrationAcademicScope scope={scope} organizationId={1} />)
  expect(await screen.findByText('Khoa Công nghệ (CNTT)', { exact: false })).toBeTruthy()
  expect((await screen.findAllByText('Công nghệ thông tin (IT)', { exact: false })).length).toBe(2)
  expect(screen.queryByText('Mã tham chiếu #4')).toBeNull()
  expect(getMajors).toHaveBeenCalledWith(1)
})

it('keeps missing labels explicit and allows retry after a catalog failure', async () => {
  getMajors.mockRejectedValueOnce(new Error('Network unavailable')).mockResolvedValueOnce(majors)
  render(<RegistrationAcademicScope scope={scope} organizationId={1} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }))
  expect(await screen.findByText('Khoa Công nghệ (CNTT)', { exact: false })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Thử lại' })).toBeNull()
})

it('shows all participating majors and does not invent a primary major for interdisciplinary scope', async () => {
  getMajors.mockResolvedValue([...majors, { id: 7, name: 'Marketing', code: 'MKT', departmentId: 6, departmentName: 'Kinh doanh', departmentCode: 'KD' }])
  render(<RegistrationAcademicScope scope={{ ...scope, projectMode: 'INTERDISCIPLINARY', primaryMajorId: null, requirements: [...scope.requirements, { majorId: 7, minMembers: 1, maxMembers: 2, responsibility: 'Nghiên cứu thị trường' }] }} organizationId={1} />)
  expect(await screen.findByText('Marketing (MKT)', { exact: false })).toBeTruthy()
  expect(screen.getByText('Không áp dụng', { exact: false })).toBeTruthy()
})
