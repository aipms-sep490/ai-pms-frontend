import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { QualificationPolicyPanel } from './QualificationPolicyPanel'
const mocks = vi.hoisted(() => ({ roles: ['DEPARTMENT_STAFF'], read: vi.fn() }))
vi.mock('../../auth/context/useAuthSession', () => ({ useAuthSession: () => ({ session: { user: { roles: mocks.roles } } }) }))
vi.mock('../../../services/api/student-qualifications.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../services/api/student-qualifications.api')>()
  return { ...actual, getPeriodPolicy: mocks.read, setPeriodPolicy: vi.fn(), getQualificationTypes: vi.fn().mockResolvedValue(actual.DEFAULT_QUALIFICATION_TYPES) }
})
afterEach(() => { cleanup(); vi.clearAllMocks() })
it.each([['DEPARTMENT_STAFF', false], ['ADMIN', true]] as const)('allows DEPARTMENT_STAFF and restricts pure ADMIN on qualification policy (%s)', async (role, disabled) => {
  mocks.roles = [role]; mocks.read.mockResolvedValue({ qualificationType: 'CAPSTONE_READINESS', requireStudentQualification: true, requireCertificate: true, checkExpiration: true })
  render(<QualificationPolicyPanel periodId={7} />)
  const button = await screen.findByRole('button', { name: 'Lưu điều kiện' })
  expect((button as HTMLButtonElement).disabled).toBe(disabled)
  expect((screen.getByLabelText('Loại chứng nhận') as HTMLSelectElement).disabled).toBe(disabled)
})
