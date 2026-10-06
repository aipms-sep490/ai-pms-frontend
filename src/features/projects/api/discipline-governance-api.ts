import { httpGet, httpPut } from '../../../services/http/http-client'

export interface Responsibility { id: number; majorId: number; content: string; sortOrder: number; concurrencyToken: string }
export interface ResponsibilityList { concurrencyToken: string | null; isSnapshot: boolean; isAvailable: boolean; items: Responsibility[] }
export interface TaskDiscipline { majorId: number; role: string }
export interface TaskDisciplines { concurrencyToken: string; classification: 'CLASSIFIED' | 'UNCLASSIFIED' | string; items: TaskDiscipline[] }
export const getTeamResponsibilities = (teamId: number, majorId: number) => httpGet<ResponsibilityList>(`/teams/${teamId}/major-requirements/${majorId}/responsibilities`)
export const getProjectResponsibilities = (projectId: number, majorId: number) => httpGet<ResponsibilityList>(`/projects/${projectId}/major-requirements/${majorId}/responsibilities`)
export const replaceTeamResponsibilities = (teamId: number, majorId: number, concurrencyToken: string, items: Array<{ content: string; sortOrder: number }>) => httpPut<ResponsibilityList>(`/teams/${teamId}/major-requirements/${majorId}/responsibilities`, { concurrencyToken, items })
export const getTaskDisciplines = (taskId: number) => httpGet<TaskDisciplines>(`/tasks/${taskId}/disciplines`)
export const replaceTaskDisciplines = (taskId: number, concurrencyToken: string, items: TaskDiscipline[]) => httpPut<TaskDisciplines>(`/tasks/${taskId}/disciplines`, { concurrencyToken, items })
