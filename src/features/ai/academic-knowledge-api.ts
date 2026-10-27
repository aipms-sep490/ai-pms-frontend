import { httpGet, httpPost, HttpError } from '../../services/http/http-client'
import type { PagedResult } from '../../types/backend'
import type { KnowledgeDocument, KnowledgeDocumentInput, KnowledgeVersion, KnowledgeVersionInput } from '../../types/backend/academic-knowledge.backend.types'
import type { Department } from '../academic/types/academic.types'

const documents = '/academic/knowledge-documents'
export const listKnowledgeDocuments = (page = 1, pageSize = 100) => httpGet<PagedResult<KnowledgeDocument>>(`${documents}?page=${page}&pageSize=${pageSize}`)
export const getKnowledgeHistory = (id: number) => httpGet<KnowledgeVersion[]>(`${documents}/${id}/history`)
export const createKnowledgeDocument = (body: KnowledgeDocumentInput) => httpPost<KnowledgeDocument>(documents, body)
export const createKnowledgeVersion = (id: number, body: KnowledgeVersionInput) => httpPost<KnowledgeVersion>(`${documents}/${id}/versions`, body)
export const publishKnowledgeDocument = (id: number) => httpPost<KnowledgeVersion>(`${documents}/${id}/publish`)
export const retireKnowledgeDocument = (id: number) => httpPost<KnowledgeDocument>(`${documents}/${id}/retire`)
export const reindexKnowledgeDocument = (id: number) => httpPost<KnowledgeVersion>(`${documents}/${id}/reindex`)

// The existing academic API has hierarchy and write helpers, but no flat department reader.
export const listAcademicDepartments = (page = 1) => httpGet<PagedResult<Department>>(`/academic/departments?page=${page}&pageSize=100`)

export interface KnowledgeFailure {
  message: string
  retryable: boolean
  fields?: Partial<Record<'title' | 'version' | 'content' | 'effectiveFrom' | 'effectiveTo', string>>
}

export function knowledgeFailure(reason: unknown, action = 'load'): KnowledgeFailure {
  if (reason instanceof HttpError) {
    if (reason.problem?.code === 'AI_KNOWLEDGE_DISABLED') return { message: 'Trợ lý AI học vụ đang tắt. Liên hệ quản trị viên để kiểm tra cấu hình.', retryable: false }
    if (reason.status === 401) return { message: 'Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục.', retryable: false }
    if (reason.status === 403) return { message: 'Bạn không có quyền quản lý tài liệu này hoặc tài liệu nằm ngoài phạm vi bộ môn của bạn.', retryable: false }
    if (reason.status === 404) return { message: 'Không tìm thấy tài liệu hoặc phiên bản. Tải lại danh sách để kiểm tra dữ liệu hiện tại.', retryable: false }
    if (reason.status === 409) return { message: action === 'publish'
      ? 'Chưa thể công bố ở trạng thái hiện tại. Cần có bản nháp với nội dung hợp lệ; tài liệu đã ngừng sử dụng không thể công bố. Tải lại danh sách để kiểm tra.'
      : 'Trạng thái tài liệu hoặc phiên bản không còn phù hợp. Kiểm tra phiên bản trùng và tình trạng ngừng sử dụng trước khi thao tác lại.', retryable: false }
    if (reason.status === 400 || reason.status === 422) {
      const fields: KnowledgeFailure['fields'] = {}
      const messages = { title: 'Kiểm tra tên tài liệu.', version: 'Kiểm tra phiên bản.', content: 'Kiểm tra nội dung tài liệu.', effectiveFrom: 'Kiểm tra thời điểm bắt đầu hiệu lực.', effectiveTo: 'Kiểm tra thời điểm hết hiệu lực.' }
      for (const key of Object.keys(messages) as (keyof typeof messages)[]) {
        if (Object.keys(reason.problem?.errors ?? {}).some(field => field.split('.').at(-1)?.toLowerCase() === key.toLowerCase())) fields[key] = messages[key]
      }
      return { message: 'Thông tin chưa hợp lệ. Kiểm tra tên, phiên bản, nội dung và khoảng hiệu lực đã nhập.', retryable: false, fields }
    }
    if (reason.status < 500 && reason.status !== 408 && reason.status !== 429) return { message: 'Chưa thể thực hiện thao tác này. Kiểm tra quyền và trạng thái tài liệu.', retryable: false }
  }
  return { message: 'Không kết nối được hoặc chưa xác nhận được kết quả thao tác. Thử tải lại danh sách để kiểm tra trước khi gửi lại.', retryable: true }
}
