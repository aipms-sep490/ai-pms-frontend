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
  SemesterDto,
  ProjectPeriodDto,
  SupervisorAssignmentDto,
  UserWorkflowContextDto,
  TeamWorkflowActionsDto,
  ProjectWorkflowActionsDto,
} from '../../types/backend'
import { env } from '../config/env'
import type { StudentJourneyState } from '../../features/auth/types/student-journey.types'
import { findCurrentTeamProject } from '../../features/projects/utils/project-resolution.utils'
import { StudentJourneyContext } from './StudentJourneyContext'
import { resolveStudentJourneyState } from './resolve-student-journey-state'
import { useAuthSession } from '../../features/auth/context/useAuthSession'

export function StudentJourneyProvider({ children }: { children: ReactNode }) {
  const { session, status: authStatus } = useAuthSession()
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
  const refreshSequence = useRef(0)

  const refreshAll = useCallback(async () => {
    const requestId = ++refreshSequence.current
    if (!session) {
      setProfile(null)
      setSemester(null)
      setPeriod(null)
      setTeam(null)
      setProject(null)
      setAssignments([])
      setWorkflowContext(null)
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
      const workflow = env.isMockMode ? null : await services.workflow.getCurrentContext()

      // 1. Load User Profile
      const prof = await services.auth.getMyProfile()

      // 2. Load Academic Semester & Period
      const sem = await services.academic.getActiveSemester()

      let per: ProjectPeriodDto | null = null
      if (sem) {
        per = await services.academic.getRegistrationPeriod(sem.id)
      }

      // 3. Load Current Team (handles 204 or null cleanly)
      let currentTeam: TeamDto | null = null
      if (sem) {
        currentTeam = await services.team.getCurrentTeam(sem.id)
      }

      // 4. Load Project if team exists - find project deterministically, never guess ID
      let currentProject: ProjectDto | null = null
      let curAssignments: SupervisorAssignmentDto[] = []
      if (currentTeam) {
        const projectsRes = await services.project.getProjects({ teamId: currentTeam.id })
        const currentSummary = findCurrentTeamProject(projectsRes.items)
        if (currentSummary) {
          currentProject = await services.project.getProject(currentSummary.id)

          const assignRes = await services.supervisor.getAssignments(currentProject.id)
          curAssignments = assignRes.items
        }
      }

      let currentTeamActions: TeamWorkflowActionsDto | null = null
      if (!env.isMockMode && currentTeam) {
        currentTeamActions = await services.workflow.getTeamActions(currentTeam.id)
      }
      let currentProjectActions: ProjectWorkflowActionsDto | null = null
      if (!env.isMockMode && currentProject) {
        currentProjectActions = await services.workflow.getProjectActions(currentProject.id)
      }

      if (requestId !== refreshSequence.current) return
      setWorkflowContext(workflow)
      setProfile(prof)
      setSemester(sem)
      setPeriod(per)
      setTeam(currentTeam)
      setProject(currentProject)
      setAssignments(curAssignments)
      setTeamActions(currentTeamActions)
      setProjectActions(currentProjectActions)
      setJourneyState(resolveStudentJourneyState(currentTeam, currentProject, curAssignments, currentTeamActions))
    } catch (err) {
      if (requestId !== refreshSequence.current) return
      const msg = err instanceof Error ? err.message : 'Không thể tải thông tin sinh viên'
      setError(msg)
    } finally {
      if (requestId === refreshSequence.current) setIsLoading(false)
    }
  }, [session])

  useEffect(() => {
    if (authStatus !== 'authenticating') void refreshAll()
  }, [authStatus, refreshAll])

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
