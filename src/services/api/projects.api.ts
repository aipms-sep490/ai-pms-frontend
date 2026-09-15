import { env } from '../../app/config/env'
import {
  httpGet,
  httpPost,
  httpPut,
} from '../http/http-client'
import type {
  ProjectDto,
  ProjectSummaryDto,
  ProjectStatusHistoryDto,
  PagedResult,
} from '../../types/backend'

export interface CreateProjectDraftPayload {
  title: string
  description?: string | null
  objectives?: string | null
  problemStatement?: string | null
  expectedOutput?: string | null
  requiredMajorIds: number[]
  domain: string
  technologies: string[]
  keywords: string[]
}

export interface UpdateProjectDraftPayload extends CreateProjectDraftPayload {
  concurrencyToken: string
}

// In-memory fallback project store for offline / dev demo
let mockProjectStore: ProjectDto | null = {
  id: 50,
  teamId: 28,
  teamName: 'SE28',
  code: 'CP_FA26_SE28',
  title: 'Hệ thống Quản trị Vòng đời Đồ án Tốt nghiệp Ứng dụng AI Hỗ trợ Phân rã Công việc WBS',
  description: 'Nghiên cứu và xây dựng nền tảng quản lý đồ án tốt nghiệp tích hợp AI Agent hỗ trợ sinh viên phân rã mục tiêu thành Work Breakdown Structure (WBS).',
  objectives: '1. Tối ưu hóa quy trình theo dõi tiến độ đồ án giữa Khoa - Giảng viên - Sinh viên.\n2. Tích hợp AI Agent gợi ý phân bổ task và ước lượng thời lượng sprint.\n3. Cung cấp bảng điều khiển trực quan hóa Gantt Chart và Kanban.',
  problemStatement: 'Hiện nay quy trình quản lý đồ án tốt nghiệp còn thủ công, thiếu công cụ giám sát tiến độ thời gian thực và việc phân bổ task cho sinh viên chưa có sự hỗ trợ của trí tuệ nhân tạo.',
  expectedOutput: 'Hệ thống Web Platform hoàn chỉnh, tài liệu kiến trúc Clean Architecture, bộ kiểm thử tự động đạt độ bao phủ > 80%, mô hình đánh giá rủi ro trễ hạn.',
  status: 'Draft',
  registeredAt: '2026-09-05T09:00:00Z',
  submittedAt: null,
  approvedAt: null,
  createdBy: 1,
  createdByName: 'Phạm Ngọc Hoàng Anh',
  createdAt: '2026-09-05T09:00:00Z',
  updatedAt: '2026-09-05T09:00:00Z',
  concurrencyToken: 'token_v1',
  majors: [
    {
      id: 1,
      majorId: 101,
      majorCode: 'SE',
      majorName: 'Kỹ thuật Phần mềm',
    },
  ],
  tags: [
    { id: 1, name: 'AI', tagType: 'KEYWORD' },
    { id: 2, name: 'Clean Architecture', tagType: 'KEYWORD' },
    { id: 3, name: 'WBS', tagType: 'KEYWORD' },
  ],
}

let mockHistoryStore: ProjectStatusHistoryDto[] = [
  {
    id: 1,
    projectId: 50,
    oldStatus: null,
    newStatus: 'Draft',
    changedBy: 1,
    changedByName: 'Phạm Ngọc Hoàng Anh',
    reason: 'Khởi tạo bản nháp đề cương đề tài đồ án',
    changedAt: '2026-09-05T09:00:00Z',
  },
]

export async function getProjects(params?: {
  teamId?: number
  page?: number
  pageSize?: number
}): Promise<PagedResult<ProjectSummaryDto>> {
  const page = params?.page ?? 1
  const pageSize = params?.pageSize ?? 10
  const searchParams = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  })
  if (params?.teamId) {
    searchParams.append('teamId', String(params.teamId))
  }

  if (env.isMockMode) {
    const items: ProjectSummaryDto[] = mockProjectStore
      ? [
          {
            id: mockProjectStore.id,
            code: mockProjectStore.code,
            title: mockProjectStore.title,
            teamId: mockProjectStore.teamId,
            teamName: mockProjectStore.teamName,
            status: mockProjectStore.status,
            majors: mockProjectStore.majors,
            createdAt: mockProjectStore.createdAt,
            submittedAt: mockProjectStore.submittedAt,
            tags: mockProjectStore.tags,
          },
        ]
      : []

    return {
      items,
      totalCount: items.length,
      page,
      pageSize,
      totalPages: 1,
    }
  }

  return await httpGet<PagedResult<ProjectSummaryDto>>(`/projects?${searchParams.toString()}`)
}

export async function getProject(id: number): Promise<ProjectDto> {
  if (env.isMockMode) {
    if (mockProjectStore && mockProjectStore.id === id) {
      return mockProjectStore
    }
    throw new Error(`Project #${id} not found.`)
  }
  return await httpGet<ProjectDto>(`/projects/${id}`)
}

export async function createDraft(payload: CreateProjectDraftPayload): Promise<ProjectDto> {
  if (env.isMockMode) {
    const now = new Date().toISOString()
    mockProjectStore = {
      id: 50,
      teamId: 28,
      teamName: 'SE28',
      code: 'CP_FA26_SE28',
      title: payload.title,
      description: payload.description ?? null,
      objectives: payload.objectives ?? null,
      problemStatement: payload.problemStatement ?? null,
      expectedOutput: payload.expectedOutput ?? null,
      status: 'Draft',
      registeredAt: now,
      submittedAt: null,
      approvedAt: null,
      createdBy: 1,
      createdByName: 'Phạm Ngọc Hoàng Anh',
      createdAt: now,
      updatedAt: now,
      concurrencyToken: 'token_v1',
      majors: [
        {
          id: 1,
          majorId: 101,
          majorCode: 'SE',
          majorName: 'Kỹ thuật Phần mềm',
        },
      ],
      tags: payload.keywords.map((kw, i) => ({ id: i + 1, name: kw, tagType: 'KEYWORD' })),
    }

    mockHistoryStore = [
      {
        id: 1,
        projectId: 50,
        oldStatus: null,
        newStatus: 'Draft',
        changedBy: 1,
        changedByName: 'Phạm Ngọc Hoàng Anh',
        reason: 'Khởi tạo bản nháp đề cương đề tài đồ án',
        changedAt: now,
      },
    ]

    return mockProjectStore
  }

  return await httpPost<ProjectDto, CreateProjectDraftPayload>('/projects', payload)
}

export async function updateDraft(id: number, payload: UpdateProjectDraftPayload): Promise<ProjectDto> {
  if (env.isMockMode) {
    if (!mockProjectStore || mockProjectStore.id !== id) {
      throw new Error(`Project #${id} not found.`)
    }
    const now = new Date().toISOString()
    mockProjectStore = {
      ...mockProjectStore,
      title: payload.title,
      description: payload.description ?? null,
      objectives: payload.objectives ?? null,
      problemStatement: payload.problemStatement ?? null,
      expectedOutput: payload.expectedOutput ?? null,
      updatedAt: now,
      concurrencyToken: `token_v${Date.now()}`,
    }
    return mockProjectStore
  }
  return await httpPut<ProjectDto, UpdateProjectDraftPayload>(`/projects/${id}`, payload)
}

export async function setMajors(
  id: number,
  concurrencyToken: string,
  requiredMajorIds: number[],
): Promise<ProjectDto> {
  if (env.isMockMode) {
    if (mockProjectStore && mockProjectStore.id === id) {
      mockProjectStore = {
        ...mockProjectStore,
        concurrencyToken: `token_v${Date.now()}`,
      }
      return mockProjectStore
    }
    throw new Error(`Project #${id} not found.`)
  }
  return await httpPut<ProjectDto, { concurrencyToken: string; requiredMajorIds: number[] }>(
    `/projects/${id}/majors`,
    { concurrencyToken, requiredMajorIds },
  )
}

export async function submitProject(id: number, concurrencyToken: string): Promise<ProjectDto> {
  if (env.isMockMode) {
    if (!mockProjectStore || mockProjectStore.id !== id) {
      throw new Error(`Project #${id} not found.`)
    }
    const now = new Date().toISOString()
    const oldStatus = mockProjectStore.status
    mockProjectStore = {
      ...mockProjectStore,
      status: 'Submitted',
      submittedAt: now,
      updatedAt: now,
      concurrencyToken: `token_v${Date.now()}`,
    }
    mockHistoryStore.push({
      id: mockHistoryStore.length + 1,
      projectId: id,
      oldStatus,
      newStatus: 'Submitted',
      changedBy: 1,
      changedByName: 'Phạm Ngọc Hoàng Anh',
      reason: 'Nộp đề cương sơ bộ lên Bộ môn xét duyệt',
      changedAt: now,
    })
    return mockProjectStore
  }
  return await httpPost<ProjectDto, { concurrencyToken: string }>(`/projects/${id}/submit`, {
    concurrencyToken,
  })
}

export async function resubmitProject(id: number, concurrencyToken: string): Promise<ProjectDto> {
  if (env.isMockMode) {
    if (!mockProjectStore || mockProjectStore.id !== id) {
      throw new Error(`Project #${id} not found.`)
    }
    const now = new Date().toISOString()
    const oldStatus = mockProjectStore.status
    mockProjectStore = {
      ...mockProjectStore,
      status: 'Submitted',
      submittedAt: now,
      updatedAt: now,
      concurrencyToken: `token_v${Date.now()}`,
    }
    mockHistoryStore.push({
      id: mockHistoryStore.length + 1,
      projectId: id,
      oldStatus,
      newStatus: 'Submitted',
      changedBy: 1,
      changedByName: 'Phạm Ngọc Hoàng Anh',
      reason: 'Đã hoàn thiện chỉnh sửa theo ý kiến thẩm định và nộp lại',
      changedAt: now,
    })
    return mockProjectStore
  }
  return await httpPost<ProjectDto, { concurrencyToken: string }>(`/projects/${id}/resubmit`, {
    concurrencyToken,
  })
}

export async function getProjectHistory(id: number): Promise<ProjectStatusHistoryDto[]> {
  if (env.isMockMode) {
    return mockHistoryStore.filter((h) => h.projectId === id)
  }
  return await httpGet<ProjectStatusHistoryDto[]>(`/projects/${id}/history`)
}

export const submit = submitProject
export const resubmit = resubmitProject
export const getHistory = getProjectHistory
export const createProjectDraft = createDraft
