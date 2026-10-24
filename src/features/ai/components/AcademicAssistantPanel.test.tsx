import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AcademicAssistantPanel } from './AcademicAssistantPanel'

afterEach(cleanup)
const ask = vi.hoisted(() => vi.fn())
const askFiles = vi.hoisted(() => vi.fn())
vi.mock('../academic-ai-api', () => ({ askAcademicAssistant: ask, askAcademicAssistantWithFiles: askFiles, downloadAssistantAnswer: vi.fn() }))
beforeEach(() => { ask.mockReset() })
it('sends selected files and labels user-provided evidence separately', async () => {
  askFiles.mockResolvedValue({ answer: 'Summary', answerType: 'ATTACHMENT', generationStatus: 'COMPLETED', citations: [], projectEvidence: [], attachments: [{ fileName: 'notes.txt' }] })
  render(<AcademicAssistantPanel />)
  const file = new File(['meeting notes'], 'notes.txt', { type: 'text/plain' })
  fireEvent.change(screen.getByLabelText('Đính kèm ảnh hoặc tài liệu'), { target: { files: [file] } })
  fireEvent.change(screen.getByLabelText('Câu hỏi học vụ'), { target: { value: 'Tóm tắt' } })
  fireEvent.click(screen.getByRole('button', { name: 'Hỏi trợ lý học vụ' }))
  expect(await screen.findByText('Dựa trên tệp bạn gửi')).toBeTruthy()
  expect(askFiles).toHaveBeenCalledWith('Tóm tắt', [file], undefined, expect.any(AbortSignal))
  expect(screen.queryByText('Tài liệu tham chiếu')).toBeNull()
})
it('rejects unsupported files before submitting', () => {
  render(<AcademicAssistantPanel />)
  fireEvent.change(screen.getByLabelText('Đính kèm ảnh hoặc tài liệu'), { target: { files: [new File(['x'], 'run.exe')] } })
  expect(screen.getByRole('alert').textContent).toContain('Định dạng chưa được hỗ trợ')
  expect(screen.queryByLabelText('Tệp đã chọn')).toBeNull()
})
it('labels general conversation without suggesting it is an official sourced answer', async () => {
  ask.mockResolvedValue({ answer: 'Xin chào!', answerType: 'GENERAL', generationStatus: 'COMPLETED', insufficientEvidence: false, citations: [], projectEvidence: [], limitationNote: 'Thông tin tham khảo từ AI.' })
  render(<AcademicAssistantPanel />)
  fireEvent.change(screen.getByLabelText('Câu hỏi học vụ'), { target: { value: 'Xin chào' } })
  fireEvent.click(screen.getByRole('button', { name: 'Hỏi trợ lý học vụ' }))
  expect(await screen.findByText('Hỏi đáp chung')).toBeTruthy()
  expect(screen.queryByText('Tài liệu tham chiếu')).toBeNull()
  expect(screen.queryByText('Câu trả lời có nguồn')).toBeNull()
})
it('labels fallback and displays exact document and project evidence', async () => {
  ask.mockResolvedValue({ answer: 'Nội dung nguồn', generationStatus: 'FALLBACK', insufficientEvidence: false, citations: [{ documentId: 1, versionId: 1, title: 'Quy trình IT', version: 'v1', excerpt: 'Hướng dẫn nộp', documentType: 'PROCESS' }], projectEvidence: [{ title: 'Task kiểm thử', excerpt: 'Đã hoàn thành' }], limitationNote: null })
  render(<AcademicAssistantPanel projectId={5} />)
  fireEvent.change(screen.getByLabelText('Câu hỏi học vụ'), { target: { value: 'Nộp gì?' } })
  fireEvent.click(screen.getByRole('button', { name: 'Hỏi trợ lý học vụ' }))
  expect(await screen.findByText('Trích đoạn nguồn · fallback')).toBeTruthy()
  expect(screen.getByText('Task kiểm thử')).toBeTruthy()
  expect(ask).toHaveBeenCalledWith('Nộp gì?', 5, expect.any(AbortSignal))
})
it('discards a pending answer when the project changes', async () => {
  let resolve!: (value: unknown) => void
  ask.mockImplementation(() => new Promise(done => { resolve = done }))
  const { rerender } = render(<AcademicAssistantPanel projectId={5} />)
  fireEvent.click(screen.getByRole('button', { name: 'Hạn nộp và biểu mẫu cần dùng là gì?' }))
  rerender(<AcademicAssistantPanel projectId={6} />)
  resolve({ answer: 'Private old project', citations: [], projectEvidence: [] })
  await waitFor(() => expect((screen.getByRole('button', { name: 'Hỏi trợ lý học vụ' }) as HTMLButtonElement).disabled).toBe(false))
  expect(screen.queryByText('Private old project')).toBeNull()
})
