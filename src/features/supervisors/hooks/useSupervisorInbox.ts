import { useCallback, useEffect, useState } from 'react'
import type { SupervisorAssignmentDto, SupervisorRequestDto } from '../../../types/backend'
import { HttpError } from '../../../services/http/http-client'
import { services } from '../../../services/service-gateway'

export type InboxErrorKind = 'authentication' | 'forbidden' | 'not-found' | 'conflict' | 'validation' | 'system'
export interface InboxError { kind: InboxErrorKind; message: string }

function classify(error: unknown): InboxError {
  if (error instanceof HttpError || (typeof error === 'object' && error !== null && 'status' in error)) {
    const response = error as { status: number; message?: string }
    if (response.status === 401) return { kind: 'authentication', message: 'Phiên đăng nhập đã hết hạn.' }
    if (response.status === 403) return { kind: 'forbidden', message: 'Backend từ chối quyền Inbox hoặc request scope.' }
    if (response.status === 404) return { kind: 'not-found', message: 'Request không còn khả dụng.' }
    if (response.status === 409) return { kind: 'conflict', message: 'Request đã thay đổi ở phiên khác. Inbox đã được làm mới; hãy kiểm tra trước khi quyết định lại.' }
    if (response.status === 400 || response.status === 422) return { kind: 'validation', message: response.message || 'Backend từ chối quyết định theo quy tắc nghiệp vụ.' }
  }
  return { kind: 'system', message: error instanceof Error ? error.message : 'Không thể tải hoặc xử lý Supervisor Inbox.' }
}

export function useSupervisorInbox() {
  const [requests, setRequests] = useState<SupervisorRequestDto[]>([])
  const [assignments, setAssignments] = useState<SupervisorAssignmentDto[]>([])
  const [loading, setLoading] = useState(true)
  const [acceptPending, setAcceptPending] = useState<number | null>(null)
  const [rejectPending, setRejectPending] = useState<number | null>(null)
  const [error, setError] = useState<InboxError | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [inbox, ownAssignments] = await Promise.all([
        services.supervisor.getSupervisorInbox(),
        services.supervisor.getOwnAssignments(),
      ])
      setRequests(inbox.items)
      setAssignments(ownAssignments.items)
    } catch (nextError) { setError(classify(nextError)) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const respond = useCallback(async (request: SupervisorRequestDto, decision: 'accept' | 'reject', message?: string) => {
    if (request.status !== 'PENDING' || acceptPending !== null || rejectPending !== null) return false
    if (decision === 'accept') setAcceptPending(request.id); else setRejectPending(request.id)
    setError(null)
    try {
      await services.supervisor.respondToSupervisorRequest(request.id, decision, message?.trim() || undefined)
      await refresh()
      return true
    } catch (nextError) {
      const next = classify(nextError)
      // A stale request/capacity conflict is refreshed, but the business action is never replayed.
      if (next.kind === 'conflict') await refresh()
      setError(next)
      return false
    } finally { setAcceptPending(null); setRejectPending(null) }
  }, [acceptPending, refresh, rejectPending])

  return { requests, assignments, loading, acceptPending, rejectPending, error, refresh, respond }
}
