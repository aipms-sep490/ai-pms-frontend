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
  SemesterDto,
  ProjectPeriodDto,
  SupervisorAssignmentDto,
  UserWorkflowContextDto,
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

export function StudentJourneyProvider({ children }: { children: ReactNode }) {
  const [journeyState, setJourneyState] = useState<StudentJourneyState>('TEAM_FORMING')
  const [profile, setProfile] = useState<UserAccountDto | null>(null)
  const [semester, setSemester] = useState<SemesterDto | null>(null)
  const [period, setPeriod] = useState<ProjectPeriodDto | null>(null)
  const [team, setTeam] = useState<TeamDto | null>(null)
  const [project, setProject] = useState<ProjectDto | null>(null)
  const [assignments, setAssignments] = useState<SupervisorAssignmentDto[]>([])
  const [workflowContext, setWorkflowContext] = useState<UserWorkflowContextDto | null>(null)
  const [teamActions, setTeamActions] = useState<TeamWorkflowActionsDto | null>(null)
  const [projectActions, setProjectActions] = useState<ProjectWorkflowActionsDto | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const refreshAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const workflow = env.isMockMode ? null : await services.workflow.getCurrentContext()
      setWorkflowContext(workflow)

      // 1. Load User Profile
      const prof = await services.auth.getMyProfile()
      setProfile(prof)

      // 2. Load Academic Semester & Period
      const sem = await services.academic.getActiveSemester()
      setSemester(sem)

      let per: ProjectPeriodDto | null = null
      if (sem) {
        per = await services.academic.getRegistrationPeriod(sem.id)
        setPeriod(per)
      } else {
        setPeriod(null)
      }

      // 3. Load Current Team (handles 204 or null cleanly)
      let currentTeam: TeamDto | null = null
      if (sem) {
        currentTeam = await services.team.getCurrentTeam(sem.id)
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
  }, [])

  useEffect(() => {
    refreshAll()
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
