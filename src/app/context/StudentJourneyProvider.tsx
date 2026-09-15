import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import { services } from '../../services/service-gateway'
import type {
  TeamDto,
  ProjectDto,
  UserAccountDto,
  ProjectPeriodDto,
  SupervisorAssignmentDto,
  TeamWorkflowActionsDto,
  ProjectWorkflowActionsDto,
} from '../../types/backend'
import { env } from '../config/env'
import type { StudentJourneyState } from '../../features/auth/types/student-journey.types'
import { findCurrentTeamProject } from '../../features/projects/utils/project-resolution.utils'
import { StudentJourneyContext } from './StudentJourneyContext'
import { resolveStudentJourneyState } from './resolve-student-journey-state'
import { useAcademicWorkflow } from './useAcademicWorkflow'

function toJourneyProfile(workflow: ReturnType<typeof useAcademicWorkflow>['workflowContext']): UserAccountDto | null {
  if (!workflow) return null
  return {
    id: workflow.user.id,
    departmentId: workflow.academic.department?.id ?? null,
    majorId: workflow.academic.major?.id ?? null,
    email: workflow.user.email,
    fullName: workflow.user.fullName,
    studentCode: workflow.user.studentCode ?? null,
    employeeCode: workflow.user.employeeCode ?? null,
    status: workflow.user.status,
    roles: workflow.user.effectiveRoles,
  }
}
import { useAuthSession } from '../../features/auth/context/useAuthSession'
import { getWorkspaceRole } from '../../features/auth/utils/role-access'

export function StudentJourneyProvider({ children }: { children: ReactNode }) {
  const { workflowContext } = useAcademicWorkflow()
  const { session } = useAuthSession()
  const [journeyState, setJourneyState] = useState<StudentJourneyState>('TEAM_FORMING')
  const [period, setPeriod] = useState<ProjectPeriodDto | null>(null)
  const [team, setTeam] = useState<TeamDto | null>(null)
  const [project, setProject] = useState<ProjectDto | null>(null)
  const [assignments, setAssignments] = useState<SupervisorAssignmentDto[]>([])
  const [teamActions, setTeamActions] = useState<TeamWorkflowActionsDto | null>(null)
  const [projectActions, setProjectActions] = useState<ProjectWorkflowActionsDto | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const refreshSequence = useRef(0)
  const profile = toJourneyProfile(workflowContext)
  const semester = workflowContext?.selectedSemester ?? null

  const refreshAll = useCallback(async () => {
    const requestId = ++refreshSequence.current
    if (!session || getWorkspaceRole(session.user) !== 'student') {
      setPeriod(null)
      setTeam(null)
      setProject(null)
      setAssignments([])
      setTeamActions(null)
      setProjectActions(null)
      setJourneyState('NO_TEAM')
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      // Global context owns identity, authorization and selected semester.
      let nextPeriod: ProjectPeriodDto | null = null
      if (semester) nextPeriod = await services.academic.getRegistrationPeriod(semester.id)

      let nextTeam: TeamDto | null = null
      if (semester) nextTeam = await services.team.getCurrentTeam(semester.id)

      let nextProject: ProjectDto | null = null
      let nextAssignments: SupervisorAssignmentDto[] = []
      if (nextTeam) {
        const projects = await services.project.getProjects({ teamId: nextTeam.id })
        const summary = findCurrentTeamProject(projects.items)
        if (summary) {
          nextProject = await services.project.getProject(summary.id)
          nextAssignments = (await services.supervisor.getAssignments(nextProject.id)).items
        }
      }

      const nextTeamActions = !env.isMockMode && nextTeam
        ? await services.workflow.getTeamActions(nextTeam.id)
        : null
      const nextProjectActions = !env.isMockMode && nextProject
        ? await services.workflow.getProjectActions(nextProject.id)
        : null

      if (requestId !== refreshSequence.current) return
      setPeriod(nextPeriod)
      setTeam(nextTeam)
      setProject(nextProject)
      setAssignments(nextAssignments)
      setTeamActions(nextTeamActions)
      setProjectActions(nextProjectActions)
      setJourneyState(resolveStudentJourneyState(nextTeam, nextProject, nextAssignments, nextTeamActions))
    } catch (reason: unknown) {
      if (requestId !== refreshSequence.current) return
      setError(reason instanceof Error ? reason.message : 'Không thể tải thông tin sinh viên')
    } finally {
      if (requestId === refreshSequence.current) setIsLoading(false)
    }
  }, [semester, session])

  useEffect(() => {
    void refreshAll()
  }, [refreshAll])

  const setSimulatedJourneyState = (state: StudentJourneyState) => {
    setJourneyState(state)
  }

  return (
    <StudentJourneyContext.Provider
      value={{
        journeyState,
        profile,
        semester,
        period,
        team,
        project,
        assignments,
        workflowContext,
        teamActions,
        projectActions,
        isLoading,
        error,
        refreshAll,
        setSimulatedJourneyState,
      }}
    >
      {children}
    </StudentJourneyContext.Provider>
  )
}
