import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isActionAllowed, type ProjectDto, type ProjectWorkflowActionsDto, type SupervisorAssignmentDto, type SupervisorCandidateDto, type SupervisorRequestDto, type TeamDto, type UserAccountDto } from '../../../types/backend'
import { HttpError } from '../../../services/http/http-client'
import { services } from '../../../services/service-gateway'
import { getActivePrimaryAssignment } from '../../projects/utils/project-resolution.utils'

export type SupervisionErrorKind = 'authentication' | 'forbidden' | 'not-found' | 'conflict' | 'validation' | 'system'
export interface SupervisionError { kind: SupervisionErrorKind; message: string }

function classify(error: unknown): SupervisionError {
  if (error instanceof HttpError || (typeof error === 'object' && error !== null && 'status' in error)) {
    const response = error as { status: number; message?: string }
    if (response.status === 401) return { kind: 'authentication', message: 'Phiên đăng nhập đã hết hạn.' }
    if (response.status === 403) return { kind: 'forbidden', message: 'Backend từ chối quyền hoặc phạm vi Project.' }
    if (response.status === 404) return { kind: 'not-found', message: 'Project, request hoặc candidate không còn khả dụng.' }
    if (response.status === 409) return { kind: 'conflict', message: `Trạng thái supervisor vừa thay đổi. ${response.message ?? 'Dữ liệu mới đã được tải; hãy tự chọn lại thao tác.'}` }
    if (response.status === 400 || response.status === 422) return { kind: 'validation', message: response.message || 'Backend từ chối yêu cầu theo quy tắc nghiệp vụ.' }
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

  const isLeader = Boolean(team?.members.some((member) => member.userId === profile?.id && member.isLeader))
  const canSend = isActionAllowed(actions?.actions ?? [], 'send_supervisor_request')
  const activeAssignment = useMemo(() => getActivePrimaryAssignment(assignments), [assignments])

  const refresh = useCallback(async (refreshCandidates = true, filters = appliedQuery.current) => {
    if (!project) { setCandidates([]); setRequests([]); setAssignments([]); setLoading(false); return }
    setLoading(true); setError(null)
    try {
      const [requestResult, assignmentResult] = await Promise.all([
        services.supervisor.getRequests(project.id),
        services.supervisor.getAssignments(project.id),
      ])
      setRequests(requestResult.items)
      setAssignments(assignmentResult.items)
      if (refreshCandidates && canSend && isLeader && !getActivePrimaryAssignment(assignmentResult.items)) {
        setCandidateLoading(true)
        const candidateResult = await services.supervisor.getCandidates(project.id, {
          search: filters.search.trim() || undefined,
          expertise: filters.expertise.trim() || undefined,
        })
        setCandidates(candidateResult.items)
      } else setCandidates([])
    } catch (nextError) { setError(classify(nextError)) }
    finally { setLoading(false); setCandidateLoading(false) }
  }, [canSend, isLeader, project])

  useEffect(() => { void refresh() }, [refresh])

  const applyFilters = useCallback(async () => {
    const filters = { search: query.search, expertise: query.expertise }
    appliedQuery.current = filters
    await refresh(true, filters)
  }, [query, refresh])

  const send = useCallback(async (candidate: SupervisorCandidateDto, message?: string) => {
    if (!project || !canSend || !isLeader || activeAssignment || sendRequestPending) return false
    setSendRequestPending(true); setError(null)
    try {
      await services.supervisor.sendRequest(project.id, candidate.id, message?.trim() || undefined)
      await Promise.all([refresh(true), refreshAll()])
      return true
    } catch (nextError) {
      const next = classify(nextError)
      // 409/422 capacity conflicts deliberately refresh candidates; no candidate is selected automatically.
      if (next.kind === 'conflict' || next.kind === 'validation') await refresh(true)
      setError(next)
      return false
    } finally { setSendRequestPending(false) }
  }, [activeAssignment, canSend, isLeader, project, refresh, refreshAll, sendRequestPending])

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

  return { candidates, requests, assignments, activeAssignment, loading, candidateLoading, sendRequestPending, cancelPending, error, query, setQuery, applyFilters, refresh, send, cancel, canSend: canSend && isLeader && !activeAssignment, isLeader }
}
