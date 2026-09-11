import { env } from '../../app/config/env'
import {
  httpGet,
  httpPost,
} from '../http/http-client'
import type {
  SupervisorCandidateDto,
  SupervisorRequestDto,
  SupervisorAssignmentDto,
  PagedResult,
} from '../../types/backend'

// Mock store for offline/dev testing
const mockCandidates: SupervisorCandidateDto[] = [
  {
    id: 201,
    userId: 21,
    fullName: 'TS. Nguyễn Văn A',
    departmentId: 1,
    departmentName: 'Kỹ thuật Phần mềm',
    bio: 'Tiến sĩ Khoa học Máy tính, 10 năm kinh nghiệm nghiên cứu Machine Learning và Hệ thống phân tán.',
    expertise: [
      { name: 'AI/ML' },
      { name: 'Clean Architecture' },
      { name: 'Software Quality' },
    ],
    activeProjects: 2,
    semesterActiveProjects: 2,
    semesterLimit: 5,
    remainingSlots: 3,
    selectionPeriodId: 1,
  },
  {
    id: 202,
    userId: 22,
    fullName: 'ThS. Trần Thị B',
    departmentId: 1,
    departmentName: 'Kỹ thuật Phần mềm',
    bio: 'Chuyên gia DevOps và Cloud Architecture, cố vấn nhiều dự án khởi nghiệp công nghệ.',
    expertise: [
      { name: 'DevOps' },
      { name: 'Microservices' },
      { name: 'Kubernetes' },
    ],
    activeProjects: 3,
    semesterActiveProjects: 3,
    semesterLimit: 4,
    remainingSlots: 1,
    selectionPeriodId: 1,
  },
  {
    id: 203,
    userId: 23,
    fullName: 'TS. Lê Hoàng C',
    departmentId: 1,
    departmentName: 'An toàn Thông tin',
    bio: 'Nghiên cứu ứng dụng sổ cái phân tán trong chuỗi cung ứng và quản lý danh tính số.',
    expertise: [
      { name: 'Blockchain' },
      { name: 'Web3' },
      { name: 'Cybersecurity' },
    ],
    activeProjects: 0,
    semesterActiveProjects: 0,
    semesterLimit: 5,
    remainingSlots: 5,
    selectionPeriodId: 1,
  },
  {
    id: 204,
    userId: 24,
    fullName: 'PGS.TS. Đỗ Hoàng D',
    departmentId: 2,
    departmentName: 'Trí tuệ Nhân tạo',
    bio: 'Chủ nhiệm nhiều đề tài cấp Bộ về Trí tuệ Nhân tạo ứng dụng trong Y tế.',
    expertise: [
      { name: 'NLP' },
      { name: 'RAG' },
      { name: 'Deep Learning' },
    ],
    activeProjects: 5,
    semesterActiveProjects: 5,
    semesterLimit: 5,
    remainingSlots: 0,
    selectionPeriodId: 1,
  },
]

let mockRequestsStore: SupervisorRequestDto[] = []
let mockAssignmentsStore: SupervisorAssignmentDto[] = []

export async function getCandidates(
  projectId: number,
  params?: {
    search?: string
    expertise?: string
    page?: number
    pageSize?: number
  },
): Promise<PagedResult<SupervisorCandidateDto>> {
  const page = params?.page ?? 1
  const pageSize = params?.pageSize ?? 20
  const searchParams = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (params?.search) searchParams.append('search', params.search)
  if (params?.expertise) searchParams.append('expertise', params.expertise)

  if (env.isMockMode) {
    let filtered = [...mockCandidates]
    if (params?.search) {
      const q = params.search.toLowerCase()
      filtered = filtered.filter(
        (c) => c.fullName.toLowerCase().includes(q) || c.departmentName.toLowerCase().includes(q),
      )
    }
    if (params?.expertise) {
      const q = params.expertise.toLowerCase()
      filtered = filtered.filter((c) => c.expertise.some((e) => e.name.toLowerCase().includes(q)))
    }

    return {
      items: filtered,
      totalCount: filtered.length,
      page,
      pageSize,
      totalPages: 1,
    }
  }

  return await httpGet<PagedResult<SupervisorCandidateDto>>(
    `/projects/${projectId}/supervisor-candidates?${searchParams.toString()}`,
  )
}

export async function getRequests(
  projectId: number,
  params?: {
    status?: string
    page?: number
    pageSize?: number
  },
): Promise<PagedResult<SupervisorRequestDto>> {
  const page = params?.page ?? 1
  const pageSize = params?.pageSize ?? 20
  const searchParams = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (params?.status) searchParams.append('status', params.status)

  if (env.isMockMode) {
    const items = params?.status
      ? mockRequestsStore.filter((r) => r.projectId === projectId && r.status === params.status)
      : mockRequestsStore.filter((r) => r.projectId === projectId)

    return {
      items,
      totalCount: items.length,
      page,
      pageSize,
      totalPages: 1,
    }
  }

  return await httpGet<PagedResult<SupervisorRequestDto>>(
    `/projects/${projectId}/supervisor-requests?${searchParams.toString()}`,
  )
}

export async function sendRequest(
  projectId: number,
  supervisorProfileId: number,
  message?: string,
): Promise<SupervisorRequestDto> {
  if (env.isMockMode) {
    const newReq: SupervisorRequestDto = {
      id: mockRequestsStore.length + 1,
      projectId,
      supervisorProfileId,
      requestedBy: 1,
      status: 'PENDING',
      requestMessage: message ?? null,
      responseMessage: null,
      requestedAt: new Date().toISOString(),
      respondedAt: null,
    }
    mockRequestsStore.push(newReq)
    return newReq
  }

  return await httpPost<SupervisorRequestDto, { supervisorProfileId: number; message?: string }>(
    `/projects/${projectId}/supervisor-requests`,
    { supervisorProfileId, message },
  )
}

export async function cancelRequest(requestId: number): Promise<SupervisorRequestDto> {
  if (env.isMockMode) {
    const req = mockRequestsStore.find((r) => r.id === requestId)
    if (!req) throw new Error(`Request #${requestId} not found.`)
    req.status = 'CANCELLED'
    req.respondedAt = new Date().toISOString()
    return req
  }

  return await httpPost<SupervisorRequestDto>(`/supervisor-requests/${requestId}/cancel`)
}

export async function getAssignments(
  projectId: number,
  params?: {
    status?: string
    page?: number
    pageSize?: number
  },
): Promise<PagedResult<SupervisorAssignmentDto>> {
  const page = params?.page ?? 1
  const pageSize = params?.pageSize ?? 20
  const searchParams = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })

  if (env.isMockMode) {
    const items = mockAssignmentsStore.filter((a) => a.projectId === projectId)
    return {
      items,
      totalCount: items.length,
      page,
      pageSize,
      totalPages: 1,
    }
  }

  return await httpGet<PagedResult<SupervisorAssignmentDto>>(
    `/projects/${projectId}/supervisor-assignments?${searchParams.toString()}`,
  )
}

/**
 * Dev simulation helper for supervisor acceptance/rejection
 */
export function simulateSupervisorResponse(requestId: number, accept: boolean): void {
  const req = mockRequestsStore.find((r) => r.id === requestId)
  if (!req) return
  req.status = accept ? 'ACCEPTED' : 'REJECTED'
  req.respondedAt = new Date().toISOString()

  if (accept) {
    const candidate = mockCandidates.find((c) => c.id === req.supervisorProfileId)
    mockAssignmentsStore.push({
      id: mockAssignmentsStore.length + 1,
      projectId: req.projectId,
      supervisorProfileId: req.supervisorProfileId,
      supervisorUserId: candidate?.userId ?? 20,
      supervisorName: candidate?.fullName ?? `Giảng viên #${req.supervisorProfileId}`,
      supervisorRequestId: req.id,
      isPrimary: true,
      assignedAt: new Date().toISOString(),
    })
  }
}
