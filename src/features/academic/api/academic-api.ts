import { endpoints } from '../../../services/api/endpoints'
import { httpGet, httpPatch, httpPost, httpPut } from '../../../services/http/http-client'
import type {
  AcademicEntityKind,
  AcademicFilters,
  AcademicHierarchyOrganization,
  AcademicRecordDraft,
  AcademicWorkflowContext,
  Department,
  Major,
  Organization,
} from '../types/academic.types'

function withQuery(path: string, filters: AcademicFilters): string {
  const query = new URLSearchParams()
  if (filters.search.trim()) query.set('search', filters.search.trim())
  if (filters.organizationId) query.set('organizationId', String(filters.organizationId))
  if (filters.includeInactive) query.set('includeInactive', 'true')
  const suffix = query.toString()
  return suffix ? `${path}?${suffix}` : path
}

export function getAcademicHierarchy(
  accessToken: string,
  filters: AcademicFilters,
  signal?: AbortSignal,
): Promise<AcademicHierarchyOrganization[]> {
  return httpGet<AcademicHierarchyOrganization[]>(withQuery(endpoints.academicHierarchy, filters), {
    accessToken,
    signal,
  })
}

export function getAcademicWorkflowContext(
  accessToken: string,
  signal?: AbortSignal,
): Promise<AcademicWorkflowContext> {
  return httpGet<AcademicWorkflowContext>(endpoints.authWorkflowContext, { accessToken, signal })
}

export function saveAcademicRecord(
  draft: AcademicRecordDraft,
  accessToken: string,
): Promise<Organization | Department | Major> {
  const body = { code: draft.code, name: draft.name, description: draft.description || null }

  if (draft.kind === 'organization') {
    return draft.id
      ? httpPut<Organization>(`${endpoints.academicOrganizations}/${draft.id}`, body, { accessToken })
      : httpPost<Organization>(endpoints.academicOrganizations, body, { accessToken })
  }

  if (draft.kind === 'department') {
    const createBody = { ...body, organizationId: draft.organizationId }
    return draft.id
      ? httpPut<Department>(`${endpoints.academicDepartments}/${draft.id}`, body, { accessToken })
      : httpPost<Department>(endpoints.academicDepartments, createBody, { accessToken })
  }

  const majorBody = { ...body, departmentId: draft.departmentId }
  return draft.id
    ? httpPut<Major>(`${endpoints.academicMajors}/${draft.id}`, majorBody, { accessToken })
    : httpPost<Major>(endpoints.academicMajors, majorBody, { accessToken })
}

export function setAcademicRecordStatus(
  kind: AcademicEntityKind,
  id: number,
  isActive: boolean,
  accessToken: string,
): Promise<Organization | Department | Major> {
  const path = {
    organization: endpoints.academicOrganizations,
    department: endpoints.academicDepartments,
    major: endpoints.academicMajors,
  }[kind]

  return httpPatch(`${path}/${id}/status`, { isActive }, { accessToken })
}
