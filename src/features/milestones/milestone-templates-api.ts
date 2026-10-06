import { httpDelete, httpGet, httpPost, httpPut } from '../../services/http/http-client'

export interface TemplateItem { id: number; title: string; description: string | null; startOffsetDays: number | null; dueOffsetDays: number | null; sortOrder: number }
export interface TemplateVersion { id: number; versionNumber: number; status: string; items: TemplateItem[] }
export interface MilestoneTemplate { id: number; name: string; description: string | null; status: string; versions: TemplateVersion[] }
export type ItemDraft = Omit<TemplateItem, 'id'>
export const getMilestoneTemplates = () => httpGet<MilestoneTemplate[]>('/milestone-templates')
export const createMilestoneTemplate = (body: { name: string; description: string | null }) => httpPost<MilestoneTemplate>('/milestone-templates', body)
export const updateMilestoneTemplate = (id: number, body: { name: string; description: string | null }) => httpPut<void>(`/milestone-templates/${id}`, body)
export const deleteMilestoneTemplate = (id: number) => httpDelete(`/milestone-templates/${id}`)
export const createTemplateVersion = (id: number) => httpPost<TemplateVersion>(`/milestone-templates/${id}/versions`)
export const publishTemplateVersion = (id: number) => httpPost<void>(`/milestone-templates/versions/${id}/publish`)
export const createTemplateItem = (id: number, body: ItemDraft) => httpPost<TemplateVersion>(`/milestone-templates/versions/${id}/items`, body)
export const updateTemplateItem = (id: number, body: ItemDraft) => httpPut<TemplateVersion>(`/milestone-templates/items/${id}`, body)
export const deleteTemplateItem = (id: number) => httpDelete(`/milestone-templates/items/${id}`)
export const assignMilestoneTemplate = (periodId: number, templateId: number, versionId: number) => httpPost<void>(`/milestone-templates/periods/${periodId}/assign/${templateId}?versionId=${versionId}`)
