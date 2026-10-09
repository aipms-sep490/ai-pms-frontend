import { httpGetBlob } from '../../../services/http/http-client'

export interface RosterExportFilters {
  semesterId: number
  departmentId?: number
  majorId?: number
}

export const rosterContentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export async function exportTeamRoster(filters: RosterExportFilters, accessToken: string, signal?: AbortSignal) {
  const query = new URLSearchParams({ semesterId: String(filters.semesterId), format: 'xlsx' })
  for (const key of ['departmentId', 'majorId'] as const) {
    if (filters[key] !== undefined) query.set(key, String(filters[key]))
  }
  const blob = await httpGetBlob(`/teams/export?${query}`, { accessToken, signal })
  if (blob.type.split(';')[0].trim().toLowerCase() !== rosterContentType || blob.size === 0) {
    throw new Error('Invalid roster workbook response')
  }
  return blob
}
