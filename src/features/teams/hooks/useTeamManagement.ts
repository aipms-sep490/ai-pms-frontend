import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStudentJourney } from '../../../app/context'
import { env } from '../../../app/config/env'
import { services } from '../../../services/service-gateway'
import { HttpError } from '../../../services/http/http-client'
import { isActionAllowed, type PagedResult, type TeamInvitationCandidateDto, type TeamInvitationDto } from '../../../types/backend'
import type { CreateTeamPayload, UpdateTeamPayload } from '../../../services/api/teams.api'

type TeamErrorKind = 'authentication' | 'forbidden' | 'not-found' | 'conflict' | 'validation' | 'system'

export interface TeamManagementError {
  kind: TeamErrorKind
  message: string
}

export class TeamManagementOperationError extends Error {
  readonly detail: TeamManagementError

  constructor(detail: TeamManagementError) {
    super(detail.message)
    this.name = 'TeamManagementOperationError'
    this.detail = detail
  }
}

const emptyPage = <T,>(page = 1, pageSize = 20): PagedResult<T> => ({
  items: [], page, pageSize, totalCount: 0, totalPages: 0,
})

function classifyError(reason: unknown): TeamManagementError {
  if (reason instanceof HttpError) {
    if (reason.status === 401) return { kind: 'authentication', message: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để tiếp tục.' }
    if (reason.status === 403) return { kind: 'forbidden', message: 'Bạn không có quyền thực hiện thao tác này trong phạm vi nhóm hiện tại.' }
    if (reason.status === 404) return { kind: 'not-found', message: 'Dữ liệu nhóm hoặc lời mời không còn tồn tại hay không còn hiển thị.' }
    if (reason.status === 409) return { kind: 'conflict', message: 'Dữ liệu nhóm vừa thay đổi hoặc thao tác không còn hợp lệ. Đã tải lại trạng thái mới nhất.' }
    if (reason.status === 400 || reason.status === 422) return { kind: 'validation', message: 'Backend không chấp nhận thao tác theo chính sách eligibility hiện tại.' }
  }
  return { kind: 'system', message: 'Không thể kết nối hệ thống để hoàn tất thao tác. Vui lòng thử lại.' }
}

function mutationKey(action: string, id?: number): string {
  return id === undefined ? action : `${action}:${id}`
}

/**
 * Feature-local Team state orchestration. Global academic/auth state continues to be
 * owned by StudentJourneyProvider; this hook only refreshes it after a Team mutation.
 */
export function useTeamManagement() {
  const journey = useStudentJourney()
  const { team, profile, semester, workflowContext, teamActions, refreshAll } = journey
  const [sentInvitations, setSentInvitations] = useState<TeamInvitationDto[]>([])
  const [receivedInvitations, setReceivedInvitations] = useState<TeamInvitationDto[]>([])
  const [candidates, setCandidates] = useState<PagedResult<TeamInvitationCandidateDto>>(emptyPage())
  const [candidateSearch, setCandidateSearchState] = useState('')
  const [candidatePage, setCandidatePageState] = useState(1)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false)
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false)
  const [error, setError] = useState<TeamManagementError | null>(null)
  const [candidateError, setCandidateError] = useState<TeamManagementError | null>(null)
  const [pendingMutations, setPendingMutations] = useState<Set<string>>(() => new Set())
  const pendingMutationRef = useRef(new Set<string>())

  const currentUserId = profile?.id ?? 0
  const isLeader = Boolean(team?.members.some((member) => member.userId === currentUserId && member.isLeader))
  const rosterLocked = team?.eligibility.rosterLocked ?? false
  const actionAllowed = useCallback((code: string, mockFallback: boolean) => (
    env.isMockMode ? mockFallback : isActionAllowed(teamActions?.actions ?? workflowContext?.actions ?? [], code)
  ), [teamActions, workflowContext])

  const permissions = useMemo(() => ({
    canCreateTeam: actionAllowed('create_team', !team),
    canEditTeam: actionAllowed('edit_team', isLeader && !rosterLocked),
    canInvite: actionAllowed('invite_member', isLeader && !rosterLocked),
    canManageRoster: actionAllowed('remove_member', isLeader && !rosterLocked),
    canConfigureScope: actionAllowed('configure_academic_scope', isLeader && !rosterLocked),
    canRefreshEligibility: actionAllowed('refresh_eligibility', isLeader && !rosterLocked),
    canCreateProjectDraft: actionAllowed('create_project_draft', false),
    canLeave: actionAllowed('leave_team', !isLeader && !rosterLocked),
  }), [actionAllowed, isLeader, rosterLocked, team])

  const isMutationPending = useCallback((action: string, id?: number) => (
    pendingMutations.has(mutationKey(action, id))
  ), [pendingMutations])

  const refreshInvitations = useCallback(async () => {
    setIsLoadingInvitations(true)
    try {
      const [sent, received] = await Promise.all([
        team ? services.team.getInvitations(team.id) : Promise.resolve(emptyPage<TeamInvitationDto>()),
        services.team.getInvitations(),
      ])
      setSentInvitations(sent.items)
      // The backend scopes this collection to the authenticated recipient. Do not re-authorize it in the browser.
      setReceivedInvitations(received.items)
    } catch (reason) {
      setError(classifyError(reason))
    } finally {
      setIsLoadingInvitations(false)
    }
  }, [team])

  const refreshCandidates = useCallback(async () => {
    if (!team || !permissions.canInvite) {
      setCandidates(emptyPage(candidatePage))
      setCandidateError(null)
      return
    }
    setIsLoadingCandidates(true)
    try {
      const result = await services.team.getInvitationCandidates(team.id, {
        search: candidateSearch.trim() || undefined,
        page: candidatePage,
        pageSize: 20,
      })
      setCandidates(result)
      setCandidateError(null)
    } catch (reason) {
      setCandidateError(classifyError(reason))
    } finally {
      setIsLoadingCandidates(false)
    }
  }, [candidatePage, candidateSearch, permissions.canInvite, team])

  useEffect(() => {
    void refreshInvitations()
  }, [refreshInvitations])

  useEffect(() => {
    if (!team || !permissions.canInvite) return
    const timer = window.setTimeout(() => void refreshCandidates(), 250)
    return () => window.clearTimeout(timer)
  }, [refreshCandidates, team, permissions.canInvite])

  const setCandidateSearch = useCallback((value: string) => {
    setCandidateSearchState(value)
    setCandidatePageState(1)
  }, [])

  const setCandidatePage = useCallback((page: number) => {
    setCandidatePageState(Math.max(1, page))
  }, [])

  const retryCandidates = useCallback(async () => {
    setCandidateError(null)
    await refreshCandidates()
  }, [refreshCandidates])

  const refreshAuthoritativeState = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await refreshAll()
      await refreshInvitations()
      await refreshCandidates()
    } finally {
      setIsRefreshing(false)
    }
  }, [refreshAll, refreshCandidates, refreshInvitations])

  const retry = useCallback(async () => {
    setError(null)
    await refreshAuthoritativeState()
  }, [refreshAuthoritativeState])

  const runMutation = useCallback(async <T,>(key: string, operation: () => Promise<T>) => {
    if (pendingMutationRef.current.has(key)) return
    pendingMutationRef.current.add(key)
    setPendingMutations((current) => new Set(current).add(key))
    setError(null)
    try {
      await operation()
      await refreshAuthoritativeState()
    } catch (reason) {
      const classified = classifyError(reason)
      setError(classified)
      if (classified.kind === 'conflict') await refreshAuthoritativeState()
      throw new TeamManagementOperationError(classified)
    } finally {
      setPendingMutations((current) => {
        const next = new Set(current)
        next.delete(key)
        return next
      })
      pendingMutationRef.current.delete(key)
    }
  }, [refreshAuthoritativeState])

  const createTeam = useCallback(async (payload: Pick<CreateTeamPayload, 'code' | 'name' | 'description'>) => {
    if (!semester) throw new TeamManagementOperationError({ kind: 'system', message: 'Chưa xác định được học kỳ hiện tại.' })
    await runMutation(mutationKey('create'), () => services.team.createTeam({ ...payload, academicSemesterId: semester.id }))
  }, [runMutation, semester])

  const updateTeam = useCallback(async (payload: UpdateTeamPayload) => {
    if (!team) return
    await runMutation(mutationKey('update', team.id), () => services.team.updateTeam(team.id, payload))
  }, [runMutation, team])

  const inviteMember = useCallback(async (userId: number, message?: string) => {
    if (!team) return
    await runMutation(mutationKey('invite', userId), () => services.team.inviteMember(team.id, { invitedUserId: userId, message }))
  }, [runMutation, team])

  const acceptInvitation = useCallback(async (invitationId: number) => {
    await runMutation(mutationKey('accept', invitationId), () => services.team.acceptInvitation(invitationId))
  }, [runMutation])

  const rejectInvitation = useCallback(async (invitationId: number) => {
    await runMutation(mutationKey('reject', invitationId), () => services.team.rejectInvitation(invitationId))
  }, [runMutation])

  const cancelInvitation = useCallback(async (invitationId: number) => {
    await runMutation(mutationKey('cancel', invitationId), () => services.team.cancelInvitation(invitationId))
  }, [runMutation])

  const removeMember = useCallback(async (userId: number) => {
    if (!team) return
    await runMutation(mutationKey('remove', userId), () => services.team.removeMember(team.id, userId))
  }, [runMutation, team])

  const leaveTeam = useCallback(async () => {
    if (!team) return
    await runMutation(mutationKey('leave', team.id), () => services.team.leaveTeam(team.id))
  }, [runMutation, team])

  const transferLeader = useCallback(async (userId: number) => {
    if (!team) return
    await runMutation(mutationKey('transfer', userId), () => services.team.transferLeader(team.id, userId))
  }, [runMutation, team])

  const refreshEligibility = useCallback(async () => {
    if (!team) return
    await runMutation(mutationKey('refresh-eligibility', team.id), () => services.team.refreshEligibility(team.id))
  }, [runMutation, team])

  return {
    ...journey,
    team,
    currentUserId,
    isLeader,
    rosterLocked,
    permissions,
    sentInvitations,
    receivedInvitations,
    candidates,
    candidateSearch,
    candidatePage,
    setCandidateSearch,
    setCandidatePage,
    retryCandidates,
    error,
    candidateError,
    isRefreshing,
    isLoadingInvitations,
    isLoadingCandidates,
    isMutationPending,
    retry,
    createTeam,
    updateTeam,
    inviteMember,
    acceptInvitation,
    rejectInvitation,
    cancelInvitation,
    removeMember,
    leaveTeam,
    transferLeader,
    refreshEligibility,
  }
}
