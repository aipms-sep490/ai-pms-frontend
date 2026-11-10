// Test-only entry. This does not mount the application router or grant runtime permissions.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '../../src/index.css'
import '../../src/features/projects/pages/collaboration-workspace.css'
import { StudentQualificationCard } from '../../src/features/qualifications/components/StudentQualificationCard'
import { WorkspaceTaskForm } from '../../src/features/projects/components/WorkspaceTaskForm'
import { ProjectEvidenceLedgerPage } from '../../src/features/evidence/ProjectEvidenceLedger'
import { StudentProjectResultPage } from '../../src/features/results/StudentProjectResultPage'
import { StudentJourneyContext, type StudentJourneyContextValue } from '../../src/app/context/StudentJourneyContext'
import { ExecutionAccessContext } from '../../src/features/execution/context/ExecutionAccessContext'
import type { ProjectDto } from '../../src/types/backend'

const query = new URLSearchParams(location.search)
const single = query.get('mode') === 'single'
const project = { id: 9, teamId: 2, code: 'PRJ-9', title: 'Đồ án thử nghiệm', status: 'ACTIVE', concurrencyToken: 'project-token',
  academicScopeProvenance: 'FROZEN_REGISTRATION_SNAPSHOT',
  academicScope: { projectMode: single ? 'SINGLE_MAJOR' : 'INTERDISCIPLINARY', leadDepartmentId: 2, concurrencyToken: 'scope-token', requirements: (single ? [3] : [3, 12]).map(majorId => ({ majorId, minMembers: 1, maxMembers: 5, responsibility: 'Phát triển' })) },
  majors: [{ id: 1, majorId: 3, majorCode: 'SE', majorName: 'Kỹ thuật phần mềm' }, ...(!single ? [{ id: 2, majorId: 12, majorCode: 'GD', majorName: 'Thiết kế đồ họa' }] : [])], tags: [],
} as ProjectDto

export function Fixture() {
  const [refreshes, setRefreshes] = useState(0)
  const [created, setCreated] = useState(false)
  const [studentId, setStudentId] = useState(7)
  const [currentProject, setCurrentProject] = useState<ProjectDto | null>(project)
  const journey = { project: currentProject, profile: { id: studentId }, isLoading: false, error: null } as StudentJourneyContextValue
  const view = query.get('view')
  return <BrowserRouter><div className="mx-auto max-w-6xl p-4 sm:p-8">
    <p className="mb-4 text-xs text-slate-600">API fixture · FE1 components · Không phải nghiệm thu BE thật</p>
    {view === 'qualification' && <><StudentQualificationCard onSubmitted={async () => { setRefreshes(value => value + 1) }} /><p data-testid="refresh-count">Cập nhật điều kiện nhóm: {refreshes}</p></>}
    {view === 'task' && <div className="collaboration-workspace">{created ? <p role="status">Đã tạo công việc.</p> : <WorkspaceTaskForm project={project} milestones={[{ id: 2, title: 'Phát triển' }]} members={[{ userId: 7, fullName: 'Mai Anh', isLeader: true, isEligibleStudent: true }]} onCancel={() => setCreated(false)} onCreated={() => setCreated(true)} />}</div>}
    {view === 'evidence' && <ExecutionAccessContext.Provider value={{ project, actor: query.get('actor') === 'mentor' ? 'mentor' : 'student', canManageStructure: false, routeBase: '/project', supervisor: { id: 1, projectId: 9, supervisorProfileId: 2, supervisorUserId: 4, supervisorName: 'Mentor fixture', supervisorRequestId: 1, isPrimary: false, assignedAt: '2026-09-01', assignmentType: 'DISCIPLINE_MENTOR', majorId: 3 } }}><ProjectEvidenceLedgerPage /></ExecutionAccessContext.Provider>}
    {view === 'result' && <><div className="mb-4 flex flex-wrap gap-3"><button onClick={() => setStudentId(value => value === 7 ? 8 : 7)}>Đổi sinh viên fixture</button><button onClick={() => setCurrentProject(null)}>Bỏ context fixture</button></div><StudentJourneyContext.Provider value={journey}><StudentProjectResultPage /></StudentJourneyContext.Provider></>}
  </div></BrowserRouter>
}
createRoot(document.getElementById('root')!).render(<Fixture />)
