import { endpoints } from '../../../services/api/endpoints'
import { httpGet, httpPost, httpPut } from '../../../services/http/http-client'

export type TopicStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED'
export type ProjectMode = 'SINGLE_MAJOR' | 'INTERDISCIPLINARY'

export interface TopicRequirement { majorId: number; majorCode?: string; majorName?: string; departmentId?: number; departmentName?: string; minMembers: number; maxMembers: number; responsibility: string }
export interface TopicContent { title: string; description: string | null; problemStatement: string | null; objectives: string | null; expectedOutput: string | null; domain: string | null; technologies: string[]; keywords: string[]; projectMode: ProjectMode; primaryMajorId: number | null; requirements: TopicRequirement[] }
export interface Topic extends TopicContent { id: number; code: string; status: TopicStatus; projectPeriodId: number; academicSemesterId: number; leadDepartmentId: number; leadDepartmentName: string; concurrencyToken: string; closeReason: string | null }
export interface TopicPage { items: Topic[]; page: number; pageSize: number; totalCount: number }
export interface TopicFilters { projectPeriodId?: number; departmentId?: number; majorId?: number; projectMode?: ProjectMode; status?: TopicStatus; search?: string; page?: number; pageSize?: number }
export interface CreateTopic { projectPeriodId: number; code: string; leadDepartmentId: number; content: TopicContent }

function query(filters: TopicFilters) { const params = new URLSearchParams(); Object.entries({ ...filters, page: filters.page ?? 1, pageSize: filters.pageSize ?? 20 }).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)) }); return params }
export const listTopics = (token: string, filters: TopicFilters = {}) => httpGet<TopicPage>(`${endpoints.topics}?${query(filters)}`, { accessToken: token })
export const getTopic = (id: number, token: string) => httpGet<Topic>(`${endpoints.topics}/${id}`, { accessToken: token })
export const createTopic = (input: CreateTopic, token: string) => httpPost<Topic>(endpoints.topics, input, { accessToken: token })
export const updateTopic = (id: number, content: TopicContent, concurrencyToken: string, token: string) => httpPut<Topic>(`${endpoints.topics}/${id}`, { concurrencyToken, content }, { accessToken: token })
export const publishTopic = (id: number, concurrencyToken: string, token: string) => httpPost<Topic>(`${endpoints.topics}/${id}/publish`, { concurrencyToken }, { accessToken: token })
export const closeTopic = (id: number, concurrencyToken: string, reason: string, token: string) => httpPost<Topic>(`${endpoints.topics}/${id}/close`, { concurrencyToken, reason }, { accessToken: token })
