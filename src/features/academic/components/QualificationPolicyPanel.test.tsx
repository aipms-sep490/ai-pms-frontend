import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { QualificationPolicyPanel } from './QualificationPolicyPanel'
const mocks = vi.hoisted(() => ({ roles: ['DEPARTMENT_STAFF'], read: vi.fn() }))
vi.mock('../../auth/context/useAuthSession', () => ({ useAuthSession: () => ({ session: { user: { roles: mocks.roles } } }) }))
vi.mock('../../../services/api/student-qualifications.api', () => ({ getPeriodPolicy: mocks.read, setPeriodPolicy: vi.fn() }))
afterEach(() => { cleanup(); vi.clearAllMocks() })
it.each([['DEPARTMENT_STAFF', true], ['ADMIN', false]] as const)('keeps qualification writes separate from scoped period policy for %s', async (role, disabled) => {
  mocks.roles = [role]; mocks.read.mockResolvedValue({ qualificationType: 'CAPSTONE_READINESS', requireStudentQualification: true, requireCertificate: true, checkExpiration: true })
  render(<QualificationPolicyPanel periodId={7} />)
  const button = await screen.findByRole('button', { name: 'Lưu điều kiện' })
  expect((button as HTMLButtonElement).disabled).toBe(disabled)
  expect((screen.getByLabelText('Loại chứng nhận') as HTMLInputElement).disabled).toBe(disabled)
})
