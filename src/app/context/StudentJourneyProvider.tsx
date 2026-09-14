import {
  useState,
  useEffect,
  useCallback,
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
import {
  findCurrentTeamProject,
  getActivePrimaryAssignment,
} from '../../features/projects/utils/project-resolution.utils'
import { StudentJourneyContext } from './StudentJourneyContext'
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

export function StudentJourneyProvider({ children }: { children: ReactNode }) {
  const { workflowContext } = useAcademicWorkflow()
  const [journeyState, setJourneyState] = useState<StudentJourneyState>('TEAM_FORMING')
  const [period, setPeriod] = useState<ProjectPeriodDto | null>(null)
  const [team, setTeam] = useState<TeamDto | null>(null)
  const [project, setProject] = useState<ProjectDto | null>(null)
  const [assignments, setAssignments] = useState<SupervisorAssignmentDto[]>([])
  const [teamActions, setTeamActions] = useState<TeamWorkflowActionsDto | null>(null)
  const [projectActions, setProjectActions] = useState<ProjectWorkflowActionsDto | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const profile = toJourneyProfile(workflowContext)
  const semester = workflowContext?.selectedSemester ?? null

  const refreshAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Global workflow context owns identity and selected semester. This provider only
      // loads feature-specific data that the global contract does not expose.
      let per: ProjectPeriodDto | null = null
      if (semester) {
        per = await services.academic.getRegistrationPeriod(semester.id)
        setPeriod(per)
      } else {
        setPeriod(null)
      }

      // 3. Load Current Team (handles 204 or null cleanly)
      let currentTeam: TeamDto | null = null
      if (semester) {
        currentTeam = await services.team.getCurrentTeam(semester.id)
        setTeam(currentTeam)
      } else {
        setTeam(null)
      }

      // 4. Load Project if team exists - find project deterministically, never guess ID
      let currentProject: ProjectDto | null = null
      let curAssignments: SupervisorAssignmentDto[] = []
      if (currentTeam) {
        const projectsRes = await services.project.getProjects({ teamId: currentTeam.id })
        const currentSummary = findCurrentTeamProject(projectsRes.items)
        if (currentSummary) {
          currentProject = await services.project.getProject(currentSummary.id)
          setProject(currentProject)

          const assignRes = await services.supervisor.getAssignments(currentProject.id)
          curAssignments = assignRes.items
          setAssignments(curAssignments)
        } else {
          setProject(null)
          setAssignments([])
        }
      } else {
        setProject(null)
        setAssignments([])
      }

      let currentTeamActions: TeamWorkflowActionsDto | null = null
      if (!env.isMockMode && currentTeam) {
        currentTeamActions = await services.workflow.getTeamActions(currentTeam.id)
        setTeamActions(currentTeamActions)
      } else {
        setTeamActions(null)
      }
      if (!env.isMockMode && currentProject) {
        setProjectActions(await services.workflow.getProjectActions(currentProject.id))
      } else {
        setProjectActions(null)
      }

      // 5. Determine Student Journey State automatically
      const teamStatus = currentTeam?.status.toUpperCase()
      const projectStatus = currentProject?.status.replaceAll('_', '').toUpperCase()
      if (!currentTeam) {
        setJourneyState('NO_TEAM')
      } else if (teamStatus === 'FORMING' || !(currentTeamActions?.canRegister ?? currentTeam.eligibility?.canRegister)) {
        setJourneyState('TEAM_FORMING')
      } else if (!currentProject || projectStatus === 'DRAFT') {
        setJourneyState('TEAM_ELIGIBLE')
      } else if (projectStatus === 'SUBMITTED' || projectStatus === 'UNDERREVIEW') {
        setJourneyState('PROJECT_PENDING')
      } else if (projectStatus === 'REVISIONREQUIRED') {
        setJourneyState('REVISION_REQUIRED')
      } else if (projectStatus === 'APPROVED' || projectStatus === 'SUPERVISORPENDING') {
        const activeAssignment = getActivePrimaryAssignment(curAssignments)
        if (activeAssignment) {
          setJourneyState('ACTIVE')
        } else {
          setJourneyState('SUPERVISOR_PENDING')
        }
      } else if (projectStatus === 'ACTIVE') {
        setJourneyState('ACTIVE')
      } else {
        setJourneyState('TEAM_ELIGIBLE')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể tải thông tin sinh viên'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [semester])

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
