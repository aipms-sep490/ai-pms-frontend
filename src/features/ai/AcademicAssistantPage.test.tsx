import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AcademicAssistantPage } from './AcademicAssistantPage'

const api = vi.hoisted(() => ({
  listAssistantProjects: vi.fn(),
  listAssistantConversations: vi.fn(),
  getAssistantConversation: vi.fn(),
  createAssistantConversation: vi.fn(),
  updateAssistantConversation: vi.fn(),
  deleteAssistantConversation: vi.fn(),
  downloadAssistantConversation: vi.fn(),
  getAssistantCitation: vi.fn(),
  streamAssistant: vi.fn(),
  submitAssistantFeedback: vi.fn(),
  listAssistantRubrics: vi.fn(),
  downloadAssistantAnswer: vi.fn(),
  askAcademicAssistant: vi.fn(),
  askAcademicAssistantWithFiles: vi.fn(),
}))

vi.mock('./academic-ai-api', () => api)
vi.mock('../auth/context/useAuthSession', () => ({
  useAuthSession: () => ({
    session: { user: { id: 10, fullName: 'Nguyễn Minh Khang', roles: ['STUDENT'] } },
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  api.listAssistantProjects.mockResolvedValue([
    { id: 100, code: 'PRJ-100', title: 'AI-PMS Capstone', status: 'ACTIVE', roleLabel: 'Trưởng nhóm' },
  ])
  api.listAssistantConversations.mockResolvedValue([
    { id: 1, title: 'Chuẩn bị bảo vệ', projectId: null, scope: 'ACADEMIC', revision: 1, updatedAt: new Date().toISOString(), isPinned: true, turnCount: 2 },
    { id: 2, title: 'Hỏi về chấm nguội', projectId: null, scope: 'ACADEMIC', revision: 1, updatedAt: new Date().toISOString(), isPinned: false, turnCount: 1 },
  ])
  api.getAssistantConversation.mockResolvedValue({
    conversation: { id: 1, title: 'Chuẩn bị bảo vệ', projectId: null, scope: 'ACADEMIC', revision: 1, updatedAt: new Date().toISOString(), isPinned: true },
    turns: [{
      id: 11,
      query: 'Cách chuẩn bị slide bảo vệ?',
      sentAt: new Date().toISOString(),
      response: {
        answer: 'Xem hướng dẫn tại [DOC-1] để chuẩn bị tốt.',
        answerType: 'GROUNDED',
        citations: [{ documentId: 1, versionId: 1, title: 'Hướng dẫn Bảo vệ', version: '1.0', documentType: 'GUIDELINE', section: 'Mục 2', page: 4, effectiveFrom: null, excerpt: 'Slide tối đa 15 trang.' }],
        projectEvidence: [],
        insufficientEvidence: false,
        limitationNote: null,
        generationStatus: 'COMPLETED',
        generatedAt: new Date().toISOString(),
        runId: 501,
        followUpSuggestions: ['Gợi ý phân bổ thời gian thuyết trình'],
      },
    }],
    hasMore: false,
  })
  api.getAssistantCitation.mockResolvedValue({
    documentId: 1, versionId: 1, title: 'Hướng dẫn Bảo vệ', version: '1.0', documentType: 'GUIDELINE', section: 'Mục 2', page: 4, effectiveFrom: null, excerpt: 'Slide tối đa 15 trang.',
  })
  api.submitAssistantFeedback.mockResolvedValue({ runId: 501, rating: 1, note: null, feedbackAt: new Date().toISOString() })
  api.updateAssistantConversation.mockResolvedValue({ id: 2, title: 'Hỏi về chấm nguội', projectId: null, scope: 'ACADEMIC', revision: 1, updatedAt: new Date().toISOString(), isPinned: true })
})

afterEach(cleanup)

it('renders 3-column workspace, opens inline citation in side-panel inspector, submits feedback and pins conversations', async () => {
  render(
    <MemoryRouter initialEntries={['/academic/assistant']}>
      <AcademicAssistantPage />
    </MemoryRouter>,
  )

  expect(await screen.findByText('Chuẩn bị bảo vệ')).toBeTruthy()
  expect(screen.getByText('Hỏi về chấm nguội')).toBeTruthy()
  expect(screen.getByLabelText('Chọn ngữ cảnh đồ án')).toBeTruthy()

  // Open conversation & click inline citation [DOC-1] -> side panel inspector opens
  fireEvent.click(screen.getByText('Chuẩn bị bảo vệ'))
  expect(await screen.findByText('Gợi ý phân bổ thời gian thuyết trình')).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'DOC-1' }))
  expect(await screen.findByText('Slide tối đa 15 trang.')).toBeTruthy()

  // Submit positive feedback
  fireEvent.click(screen.getByRole('button', { name: 'Câu trả lời hữu ích' }))
  await waitFor(() => expect(api.submitAssistantFeedback).toHaveBeenCalledWith(501, 1, undefined))

  // Pin second conversation
  fireEvent.click(screen.getByRole('button', { name: 'Ghim Hỏi về chấm nguội' }))
  await waitFor(() => expect(api.updateAssistantConversation).toHaveBeenCalledWith(2, { isPinned: true }))
})

it('opens slash command palette when typing / in the composer', async () => {
  render(
    <MemoryRouter initialEntries={['/academic/assistant']}>
      <AcademicAssistantPage />
    </MemoryRouter>,
  )
  await screen.findByText('Chuẩn bị bảo vệ')
  const textarea = screen.getByLabelText('Câu hỏi học vụ')
  fireEvent.change(textarea, { target: { value: '/' } })
  const listbox = await screen.findByRole('listbox', { name: 'Lệnh nhanh trợ lý AI' })
  fireEvent.click(within(listbox).getByRole('option', { name: /Soạn báo cáo tuần/ }))
  expect((textarea as HTMLTextAreaElement).value).toContain('Soạn báo cáo tuần')
})
