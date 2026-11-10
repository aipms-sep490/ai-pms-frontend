// Browser-only fixture. Vite's production entry does not import this file.
// All HTTP calls are intercepted by department-browser-check.mjs; no real credentials or writes.
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import '../src/index.css'
import { AuthSessionContext, type AuthSessionContextValue } from '../src/features/auth/context/auth-session-context'
import { AcademicWorkflowContext, type AcademicWorkflowContextValue } from '../src/app/context/academic-workflow-context'
import { DepartmentAcademicScopeRoute } from '../src/features/department/components/DepartmentAcademicScopeRoute'
import { DepartmentProjectLayout } from '../src/features/department/components/DepartmentProjectLayout'
import { DepartmentWorkspacePage } from '../src/features/department/pages/DepartmentWorkspacePage'
import { QualificationVerificationPage } from '../src/features/qualifications/pages/QualificationVerificationPage'
import { ResultPublicationPage } from '../src/features/results/ResultPublicationPage'
import { AcademicGovernancePage } from '../src/features/academic/pages/AcademicGovernancePage'

import { PortfolioDashboardPage } from '../src/features/dashboard/pages/PortfolioDashboardPage'
import { AssignmentManagementPanel } from '../src/features/supervisors/components/AssignmentManagementPanel'
import { DepartmentGovernanceOverview } from '../src/features/projects/components/DepartmentGovernanceOverview'
const params = new URLSearchParams(location.search)
const view = params.get('view') ?? 'workspace'
const paths: Record<string, string> = { overview: '/department/projects/9/governance', assignments: '/department/projects/9/governance', portfolio: '/department/portfolio', workspace: '/department/workspace', qualifications: '/department/student-qualifications', result: '/department/projects/9/result', academic: '/academic/governance' }
const user = { id: 2, fullName: 'Cán bộ bộ môn thử nghiệm', email: 'fixture@example.test', roles: ['DEPARTMENT_STAFF'] }
const auth: AuthSessionContextValue = {
  session: { accessToken: 'synthetic-browser-fixture', refreshToken: 'synthetic-browser-fixture', tokenType: 'Bearer', expiresAtUtc: '2099-01-01T00:00:00Z', refreshTokenExpiresAtUtc: '2099-01-01T00:00:00Z', user }, status: 'authenticated', error: null,
  login: async () => { throw new Error('Fixture has no real login') }, refreshProfile: async () => {}, restoreSession: async () => {}, logout: () => {},
}
const academic: AcademicWorkflowContextValue = {
  currentUser: user, workflowContext: null, status: 'ready', error: null, errorKind: null, refresh: async () => {},
  authorization: { roles: ['DEPARTMENT_STAFF'], permissions: [], departmentIds: [2], majorIds: [] },
  academic: { organization: { id: 1, code: 'UNI', name: 'Trường thử nghiệm', isActive: true }, departments: [{ id: 2, code: 'SE', name: 'Bộ môn Kỹ thuật phần mềm', isActive: true }], majors: [], currentSemesters: [], selectedSemester: { id: 3, organizationId: 1, code: 'FA26', name: 'Học kỳ thu 2026', status: 'ACTIVE', startDate: '2026-09-01', endDate: '2026-12-31', isCurrent: true }, periods: [], hasActiveDepartmentScope: params.get('inactive') !== 'true', hasEligibleStudentProfile: false, issues: [] },
}
const overviewFixture = { projectId: 9, projectStatus: 'FINAL_SUBMISSION', leadDepartment: { departmentId: 1, name: 'Khoa chủ trì' }, participatingDepartments: [{ departmentId: 2, name: 'Khoa tham gia' }], actorScope: { departmentId: 2, isAdmin: false, majorIds: [3] }, allowedActions: ['READ_GOVERNANCE'], blockers: ['ADMIN_REQUIRED_FOR_CROSS_DEPARTMENT_PUBLICATION'], academicScopeProvenance: 'FROZEN_REGISTRATION_SNAPSHOT', resultPublicationStatus: 'NOT_PUBLISHED', finalSubmissionStatus: 'SUBMITTED', readiness: { canSubmitFinal: false, canEvaluate: true, canPublishResult: false, isProjectActive: true, hasPrimarySupervisor: true }, evaluators: [{ assignmentId: 21, evaluatorId: 2, evaluationType: 'FINAL', scope: 'COMMON', majorId: null, studentId: null, status: 'ACTIVE' }] }
const fixtureAllowed = (window as Window & { __AIPMS_DEPART_FIXTURE__?: boolean }).__AIPMS_DEPART_FIXTURE__ === true
createRoot(document.getElementById('root')!).render(fixtureAllowed ? <AuthSessionContext.Provider value={auth}><AcademicWorkflowContext.Provider value={academic}><MemoryRouter initialEntries={[paths[view]]}><main className="mx-auto max-w-7xl p-4 sm:p-6"><p role="status" className="mb-4 rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-sm">Dữ liệu mô phỏng DEPART — chỉ dành cho kiểm thử; mọi API trong runner được intercept.</p><Routes><Route element={<DepartmentAcademicScopeRoute />}><Route element={<DepartmentProjectLayout />}><Route path="/department/projects/:projectId/governance" element={view === 'overview' ? <DepartmentGovernanceOverview governance={overviewFixture} /> : <AssignmentManagementPanel projectId={9} projectStatus="ACTIVE" />} /><Route path="/department/portfolio" element={<PortfolioDashboardPage />} /><Route path="/department/workspace" element={<DepartmentWorkspacePage />} /><Route path="/department/student-qualifications" element={<QualificationVerificationPage />} /><Route path="/department/projects/:projectId/result" element={<ResultPublicationPage />} /><Route path="/academic/governance" element={<AcademicGovernancePage />} /></Route></Route></Routes></main></MemoryRouter></AcademicWorkflowContext.Provider></AuthSessionContext.Provider> : <main className="p-6"><h1>Fixture DEPART đã khóa</h1><p>Chạy scripts/department-browser-check.mjs để dùng dữ liệu mô phỏng cách ly. Trang này không gọi API nghiệp vụ khi mở trực tiếp.</p></main>)
