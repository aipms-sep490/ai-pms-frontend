import type { SupervisorAssignmentDto } from '../../../types/backend'
import { services } from '../../../services/service-gateway'

type AssignmentFilters = { status?: string }

/**
 * The assignment endpoint is paged. Workspace scope must be derived from the
 * complete server-issued list, rather than silently treating its first page as
 * the full set of projects a supervisor can access.
 */
export async function loadOwnSupervisorAssignments(filters: AssignmentFilters = {}): Promise<SupervisorAssignmentDto[]> {
  const pageSize = 100
  const first = await services.supervisor.getOwnAssignments({ ...filters, page: 1, pageSize })
  const totalPages = Math.max(1, first.totalPages ?? 1)
  if (totalPages === 1) return first.items

  const remaining = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => services.supervisor.getOwnAssignments({
      ...filters,
      page: index + 2,
      pageSize,
    })),
  )
  return [...first.items, ...remaining.flatMap((page) => page.items)]
}
