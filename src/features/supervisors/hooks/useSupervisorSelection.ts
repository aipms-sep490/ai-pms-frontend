import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getActionReasons, isActionAllowed, type ProjectDto, type ProjectWorkflowActionsDto, type SupervisorAssignmentDto, type SupervisorCandidateDto, type SupervisorRequestDto, type TeamDto, type UserAccountDto } from '../../../types/backend'
import { HttpError } from '../../../services/http/http-client'
import { services } from '../../../services/service-gateway'
import { normalizeProjectStatus } from '../../projects/hooks/useProjectRegistration'
import { getActivePrimaryAssignment } from '../../projects/utils/project-resolution.utils'

export type SupervisorAssignmentType = 'PRIMARY' | 'DISCIPLINE_MENTOR'

export type SupervisionErrorKind = 'authentication' | 'forbidden' | 'not-found' | 'conflict' | 'validation' | 'system'
export interface SupervisionError { kind: SupervisionErrorKind; message: string }

function classify(error: unknown): SupervisionError {
  if (error instanceof HttpError || (typeof error === 'object' && error !== null && 'status' in error)) {
    const response = error as { status: number; message?: string }
    if (response.status === 401) return { kind: 'authentication', message: 'Phiên đăng nhập đã hết hạn.' }
    if (response.status === 403) return { kind: 'forbidden', message: 'Hệ thống từ chối quyền hoặc phạm vi đồ án.' }
    if (response.status === 404) return { kind: 'not-found', message: 'đồ án, request hoặc candidate không còn khả dụng.' }
    if (response.status === 409) return { kind: 'conflict', message: `Trạng thái supervisor vừa thay đổi. ${response.message ?? 'Dữ liệu mới đã được tải; hãy tự chọn lại thao tác.'}` }
    if (response.status === 400 || response.status === 422) return { kind: 'validation', message: response.message || 'Hệ thống từ chối yêu cầu theo quy tắc nghiệp vụ.' }
  }
  return { kind: 'system', message: error instanceof Error ? error.message : 'Không thể tải hoặc xử lý dữ liệu supervisor.' }
}

export function useSupervisorSelection({
  project, team, profile, actions, refreshAll,
}: { project: ProjectDto | null; team: TeamDto | null; profile: UserAccountDto | null; actions: ProjectWorkflowActionsDto | null; refreshAll: () => Promise<void> }) {
  const [candidates, setCandidates] = useState<SupervisorCandidateDto[]>([])
  const [requests, setRequests] = useState<SupervisorRequestDto[]>([])
  const [assignments, setAssignments] = useState<SupervisorAssignmentDto[]>([])
  const [loading, setLoading] = useState(true)
  const [candidateLoading, setCandidateLoading] = useState(false)
  const [sendRequestPending, setSendRequestPending] = useState(false)
  const [cancelPending, setCancelPending] = useState<number | null>(null)
  const [error, setError] = useState<SupervisionError | null>(null)
  const [query, setQuery] = useState({ search: '', expertise: '' })
  const appliedQuery = useRef({ search: '', expertise: '' })
  const readVersion = useRef(0)
  const [selectedSlotKey, setSlotKey] = useState<string | null>(null)

  const isLeader = Boolean(team?.members.some((member) => member.userId === profile?.id && member.isLeader))
  const canSendAction = isActionAllowed(actions?.actions ?? [], 'send_supervisor_request')
  const activeAssignment = useMemo(() => getActivePrimaryAssignment(assignments), [assignments])
  /** Mirrors A1's readiness checklist: the submit/resubmit action's reasons already name
   * exactly which required majors still lack a confirmed Mentor — BE is the source of truth,
   * the FE never re-derives this from assignments itself. */
  const missingMentorMajorIds = useMemo(() => {
    const relevantAction = project?.status && normalizeProjectStatus(project.status) === 'REVISIONREQUIRED' ? 'resubmit_project' : 'submit_project'
    return getActionReasons(actions?.actions ?? [], relevantAction)
      .filter((reason) => reason.startsWith('MENTOR_NOT_CONFIRMED:'))
      .map((reason) => Number(reason.split(':')[1]))
  }, [actions, project])
  const canSendMentor = canSendAction && isLeader && missingMentorMajorIds.length > 0
  const missingMentorKey = missingMentorMajorIds.join(',')
  const resolveSlotKey = useCallback((needsPrimary: boolean) => {
    const slots = [...(needsPrimary ? ['PRIMARY'] : []), ...missingMentorKey.split(',').filter(Boolean).map(id => `MENTOR-${id}`)]
    return selectedSlotKey && slots.includes(selectedSlotKey) ? selectedSlotKey : slots[0] ?? null
  }, [missingMentorKey, selectedSlotKey])
  const slotKey = resolveSlotKey(!activeAssignment)

  const refresh = useCallback(async (refreshCandidates = true, filters = appliedQuery.current) => {
    const version = ++readVersion.current
    if (!project) { setCandidates([]); setRequests([]); setAssignments([]); setLoading(false); return }
    setLoading(true); setError(null); setCandidates([])
    try {
      const [requestResult, assignmentResult] = await Promise.all([
        services.supervisor.getRequests(project.id),
        services.supervisor.getAssignments(project.id),
      ])
      if (version !== readVersion.current) return
      setRequests(requestResult.items)
      setAssignments(assignmentResult.items)
      const stillNeedsPrimary = !getActivePrimaryAssignment(assignmentResult.items)
      const requestedSlot = resolveSlotKey(stillNeedsPrimary)
      if (refreshCandidates && canSendAction && isLeader && requestedSlot) {
        setCandidateLoading(true)
        const candidateResult = await services.supervisor.getCandidates(project.id, {
          search: filters.search.trim() || undefined,
          expertise: filters.expertise.trim() || undefined,
          assignmentType: requestedSlot === 'PRIMARY' ? 'PRIMARY' : 'DISCIPLINE_MENTOR',
          majorId: requestedSlot === 'PRIMARY' ? undefined : Number(requestedSlot.slice('MENTOR-'.length)),
        })
        if (version !== readVersion.current) return
        setCandidates(candidateResult.items)
      } else setCandidates([])
    } catch (nextError) { if (version === readVersion.current) setError(classify(nextError)) }
    finally { if (version === readVersion.current) { setLoading(false); setCandidateLoading(false) } }
  }, [canSendAction, isLeader, resolveSlotKey, project])

  useEffect(() => { void refresh(); return () => { readVersion.current++ } }, [refresh])

  const applyFilters = useCallback(async () => {
    const filters = { search: query.search, expertise: query.expertise }
    appliedQuery.current = filters
    await refresh(true, filters)
  }, [query, refresh])

  const send = useCallback(async (
    candidate: SupervisorCandidateDto, message?: string,
    assignmentType: SupervisorAssignmentType = 'PRIMARY', majorId?: number,
  ) => {
    if (!project || !canSendAction || !isLeader || sendRequestPending) return false
    if (assignmentType === 'PRIMARY' && activeAssignment) return false
    if (assignmentType === 'DISCIPLINE_MENTOR' && (!majorId || !missingMentorMajorIds.includes(majorId))) return false
    setSendRequestPending(true); setError(null)
    try {
      await services.supervisor.sendRequest(project.id, candidate.id, message?.trim() || undefined, assignmentType, majorId)
      await Promise.all([refresh(true), refreshAll()])
      return true
    } catch (nextError) {
      const next = classify(nextError)
      // 409/422 capacity conflicts deliberately refresh candidates; no candidate is selected automatically.
      if (next.kind === 'conflict' || next.kind === 'validation') await refresh(true)
      setError(next)
      return false
    } finally { setSendRequestPending(false) }
  }, [activeAssignment, canSendAction, isLeader, missingMentorMajorIds, project, refresh, refreshAll, sendRequestPending])

  const cancel = useCallback(async (request: SupervisorRequestDto) => {
    if (request.status !== 'PENDING' || !requests.some((item) => item.id === request.id && item.status === 'PENDING') || cancelPending !== null) return false
    setCancelPending(request.id); setError(null)
    try {
      await services.supervisor.cancelRequest(request.id)
      await Promise.all([refresh(true), refreshAll()])
      return true
    } catch (nextError) {
      const next = classify(nextError)
      if (next.kind === 'conflict') await refresh(true)
      setError(next)
      return false
    } finally { setCancelPending(null) }
  }, [cancelPending, refresh, refreshAll, requests])

  return {
    candidates, requests, assignments, activeAssignment, loading, candidateLoading, sendRequestPending, cancelPending,
    error, query, setQuery, applyFilters, refresh, send, cancel, isLeader, missingMentorMajorIds,
    slotKey, setSlotKey,
    canSend: canSendAction && isLeader && !activeAssignment,
    canSendMentor,
  }
}
