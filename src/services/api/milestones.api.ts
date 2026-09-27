import type { MilestoneDto, MilestoneProgressDto } from '../../types/backend'
import { httpDelete, httpGet, httpPost, httpPut } from '../http/http-client'

export interface CreateMilestonePayload {
  projectId: number
  title: string
  description?: string | null
  startDate?: string | null
  dueDate?: string | null
  sortOrder: number
}

export interface UpdateMilestonePayload extends Omit<CreateMilestonePayload, 'projectId'> {
  status: string
}

export interface MilestoneReorderItem {
  milestoneId: number
  sortOrder: number
}

export const getMilestone = (id: number, signal?: AbortSignal) => httpGet<MilestoneDto>(`/milestones/${id}`, signal)
export const getProjectMilestones = (projectId: number, signal?: AbortSignal) => httpGet<MilestoneDto[]>(`/milestones/project/${projectId}`, signal)
export const getProjectMilestoneProgress = (projectId: number, signal?: AbortSignal) => httpGet<MilestoneProgressDto[]>(`/milestones/project/${projectId}/progress`, signal)
export const createMilestone = (payload: CreateMilestonePayload) => httpPost<MilestoneDto, CreateMilestonePayload>('/milestones', payload)
export const updateMilestone = (id: number, payload: UpdateMilestonePayload) => httpPut<MilestoneDto, UpdateMilestonePayload>(`/milestones/${id}`, payload)
export const deleteMilestone = async (id: number) => { await httpDelete(`/milestones/${id}`) }
export const reorderMilestones = async (projectId: number, items: MilestoneReorderItem[]) => { await httpPost(`/milestones/project/${projectId}/reorder`, items) }
