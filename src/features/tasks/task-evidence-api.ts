import { httpGet, httpPost } from '../../services/http/http-client'
import type { PagedResult } from '../../types/backend'
import { deleteProjectFile, downloadProjectFile, saveProjectFile, uploadProjectFile, type ProjectFile } from '../files/project-files-api'
import type { ProjectFileUploadOptions } from '../files/project-file-uploads'

export type TaskFile = ProjectFile
export interface TaskComment { id: number; taskId: number; authorId: number; authorName: string; content: string; createdAt: string; updatedAt: string }

export const getTaskEvidence = (taskId: number, page = 1) => httpGet<PagedResult<TaskFile>>(`/v1/tasks/${taskId}/evidence?page=${page}&pageSize=20`)
export const getTaskComments = (taskId: number, page = 1) => httpGet<PagedResult<TaskComment>>(`/v1/tasks/${taskId}/comments?page=${page}&pageSize=20`)
export const addTaskComment = (taskId: number, content: string) => httpPost<TaskComment>(`/v1/tasks/${taskId}/comments`, { content })
export const uploadTaskEvidence = (taskId: number, file: File, options?: ProjectFileUploadOptions) => uploadProjectFile('TASK', taskId, file, options)
export const deleteTaskEvidence = deleteProjectFile
export const downloadTaskEvidence = downloadProjectFile
export const saveTaskEvidence = saveProjectFile
