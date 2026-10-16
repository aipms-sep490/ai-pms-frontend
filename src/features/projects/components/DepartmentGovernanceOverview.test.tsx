import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import type { ProjectGovernance } from '../api/project-governance-api'
import { DepartmentGovernanceOverview } from './DepartmentGovernanceOverview'

afterEach(cleanup)
it('groups unfinished evaluations without exposing assignment IDs and resolves the actor department', () => {
  render(<MemoryRouter><DepartmentGovernanceOverview governance={{ ...base, leadDepartment: { departmentId: 2, name: 'Khoa IT' }, blockers: ['EVALUATION_NOT_FINALIZED:37', 'EVALUATION_NOT_FINALIZED:38', 'EVALUATION_NOT_FINALIZED:37', 'DEMO_SCHEME_NOT_OFFICIAL'] }} /></MemoryRouter>)
  expect(screen.getByText(/Còn 2 bài chấm chưa được chốt/)).toBeTruthy()
  expect(screen.queryByText(/EVALUATION_NOT_FINALIZED/)).toBeNull()
  expect(screen.queryByText('Khoa #2')).toBeNull()
  expect(screen.getAllByText('Khoa IT')).toHaveLength(2)
  expect(screen.getByText(/Phương án đang ở chế độ demo/)).toBeTruthy()
})
const base: ProjectGovernance = { projectId: 9, projectStatus: 'ACTIVE', leadDepartment: null, participatingDepartments: [], actorScope: { departmentId: 2, isAdmin: false }, allowedActions: ['READ_GOVERNANCE'], blockers: ['ACADEMIC_SCOPE_UNKNOWN'], academicScopeProvenance: 'UNKNOWN', resultPublicationStatus: 'NOT_PUBLISHED', readiness: { canSubmitFinal: false, canEvaluate: false, canPublishResult: false, isProjectActive: true, hasPrimarySupervisor: true }, evaluators: [] }
it('explains unknown academic scope and directs the user to the same project dossier', () => {
  render(<MemoryRouter><DepartmentGovernanceOverview governance={base} /></MemoryRouter>)
  expect(screen.getByText('Chưa xác minh được phạm vi khoa và ngành của hồ sơ đăng ký.')).toBeTruthy()
  expect(screen.getAllByText('Chưa sẵn sàng')).toHaveLength(3)
  expect(screen.getByText('Chưa công bố')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Đối chiếu hồ sơ thẩm định' }).getAttribute('href')).toBe('/department/projects/review/9')
  expect(screen.queryByRole('button')).toBeNull()
})
it('uses server readiness independently of the viewing actor permission', () => {
  render(<MemoryRouter><DepartmentGovernanceOverview governance={{ ...base, academicScopeProvenance: 'FROZEN_REGISTRATION_SNAPSHOT', leadDepartment: { departmentId: 1, name: 'Khoa chủ trì' }, participatingDepartments: [{ departmentId: 2, name: 'Khoa tham gia' }], blockers: [], readiness: { ...base.readiness!, canPublishResult: true } }} /></MemoryRouter>)
  expect(screen.getByText('Đã khóa theo hồ sơ đăng ký')).toBeTruthy()
  expect(screen.getAllByText('Khoa tham gia', { selector: 'dd' })).toHaveLength(2)
  expect(screen.getByText('Đủ điều kiện theo kiểm tra hiện tại')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Xem preview và kết quả' }).getAttribute('href')).toBe('/department/projects/9/result')
  expect(screen.queryByRole('button', { name: /Công bố/ })).toBeNull()
})
it('does not treat absent readiness as ready and preserves unrecognized blockers', () => {
  render(<MemoryRouter><DepartmentGovernanceOverview governance={{ ...base, readiness: undefined, blockers: ['UNRECOGNIZED_SERVER_REASON'] }} /></MemoryRouter>)
  expect(screen.getAllByText('Chưa có kết luận')).toHaveLength(4)
  expect(screen.getByText('UNRECOGNIZED_SERVER_REASON')).toBeTruthy()
})
