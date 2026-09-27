import { httpDelete, httpGet, httpPost, httpPut } from '../../services/http/http-client'
import type { PagedResult } from '../../types/backend'

export interface RubricCriterion {
  id: number; name: string; description: string | null; weightPercent: number; maxScore: number | null
  sortOrder: number; isRequired: boolean; children: RubricCriterion[]
}
export interface Rubric {
  id: number; departmentId: number | null; academicSemesterId: number | null; code: string; name: string
  description: string | null; status: string; version: number; concurrencyToken: string; canEdit: boolean
  criteria: RubricCriterion[]
}
export interface CriterionInput {
  name: string; description: string | null; weightPercent: number; maxScore: number | null
  sortOrder: number; isRequired: boolean; children: CriterionInput[]
}
export interface RubricDraft { name: string; description: string | null; criteria: CriterionInput[] }

export const listRubrics = (page = 1, status?: string) => {
  const query = new URLSearchParams({ page: String(page), pageSize: '20' })
  if (status) query.set('status', status)
  return httpGet<PagedResult<Rubric>>(`/v1/rubrics?${query}`)
}
export const getRubric = (id: number) => httpGet<Rubric>(`/v1/rubrics/${id}`)
export const createRubric = (draft: RubricDraft & { departmentId: number; academicSemesterId: number; code: string }) => httpPost<Rubric>('/v1/rubrics', draft)
export const updateRubric = (id: number, draft: RubricDraft, concurrencyToken: string) => httpPut<Rubric>(`/v1/rubrics/${id}`, { ...draft, concurrencyToken })
export const publishRubric = (id: number, concurrencyToken: string) => httpPost<Rubric>(`/v1/rubrics/${id}/publish`, { concurrencyToken })
export const retireRubric = (id: number, concurrencyToken: string) => httpPost<Rubric>(`/v1/rubrics/${id}/retire`, { concurrencyToken })
export const cloneRubric = (id: number, code: string, concurrencyToken: string) => httpPost<Rubric>(`/v1/rubrics/${id}/versions`, { code, concurrencyToken })
export const deleteRubric = (id: number, concurrencyToken: string) => httpDelete(`/v1/rubrics/${id}?concurrencyToken=${encodeURIComponent(concurrencyToken)}`)
