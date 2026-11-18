import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AiTopicSimilarityCheck } from './AiTopicSimilarityCheck'
import type { AiTopicSimilarityResultDto } from '../../../types/backend'

const check = vi.hoisted(() => vi.fn())
vi.mock('../../../services/service-gateway', () => ({ services: { topic: { checkTopicSimilarityWithAi: check } } }))
afterEach(() => { cleanup(); vi.resetAllMocks() })
const input = { teamId: 1, title: 'Cổng bán hàng', keywords: ['shop'] }
const result: AiTopicSimilarityResultDto = { exactMatch: null, similar: [], generationStatus: 'COMPLETED', matches: [], summary: 'Đã so sánh ý tưởng.', limitationNote: 'Trong ba kỳ gần nhất.', candidateCount: 2, reviewedCount: 2, truncated: false, generatedAt: '2026-11-19T00:00:00Z', modelVersion: 'model-test' }

it('runs only on explicit click and shows grounded paraphrase comparison', async () => {
  check.mockResolvedValue({ ...result, matches: [{ id: 9, sourceType: 'TOPIC', title: 'Nền tảng thương mại', semesterCode: 'FA26', similarityLevel: 'HIGH', reason: 'Cùng giải quyết bán hàng địa phương.', sharedAspects: ['Quản lý đơn hàng'], differences: ['Khác đối tượng'], proposalExcerpt: 'Cổng bán hàng', candidateExcerpt: 'Nền tảng thương mại' }] })
  render(<AiTopicSimilarityCheck input={input} />)
  expect(check).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra ý tưởng bằng AI' }))
  expect(await screen.findByText('Cùng giải quyết bán hàng địa phương.')).toBeTruthy()
  expect(screen.getByText('Quản lý đơn hàng')).toBeTruthy()
  expect(screen.getByText('Khác đối tượng')).toBeTruthy()
  expect(screen.getByText(/Đã đối chiếu 2\/2/)).toBeTruthy()
  expect(check).toHaveBeenCalledWith(input, expect.any(AbortSignal))
})

it.each(['FALLBACK', 'INSUFFICIENT_DATA'] as const)('does not claim uniqueness for %s', async generationStatus => {
  check.mockResolvedValue({ ...result, generationStatus, reviewedCount: 0 })
  render(<AiTopicSimilarityCheck input={input} />)
  fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra ý tưởng bằng AI' }))
  expect(await screen.findByText(/Không thể kết luận ý tưởng không trùng/)).toBeTruthy()
  expect(screen.queryByText(/Chưa phát hiện ý tưởng tương đồng/)).toBeNull()
})

it('shows a bounded empty result only after successful analysis', async () => {
  check.mockResolvedValue(result)
  render(<AiTopicSimilarityCheck input={input} />)
  fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra ý tưởng bằng AI' }))
  expect(await screen.findByText(/Đây không phải xác nhận đề tài hoàn toàn mới/)).toBeTruthy()
})

it('shows error and permits explicit retry without changing form input', async () => {
  check.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(result)
  render(<AiTopicSimilarityCheck input={input} />)
  fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra ý tưởng bằng AI' }))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Nội dung đề cương được giữ nguyên'))
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại kiểm tra AI' }))
  expect(await screen.findByText('Đã so sánh ý tưởng.')).toBeTruthy()
  expect(check).toHaveBeenCalledTimes(2)
})

it('locks duplicate clicks and aborts/ignores old results when scope or input key changes', async () => {
  let resolve!: (value: AiTopicSimilarityResultDto) => void
  check.mockImplementationOnce(() => new Promise<AiTopicSimilarityResultDto>(done => { resolve = done })).mockResolvedValueOnce({ ...result, summary: 'Kết quả mới' })
  const view = render(<AiTopicSimilarityCheck key="one" input={input} />)
  const button = screen.getByRole('button', { name: 'Kiểm tra ý tưởng bằng AI' })
  fireEvent.click(button); fireEvent.click(button)
  expect(check).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('status').textContent).toContain('Đang đọc')
  const signal = check.mock.calls[0][1] as AbortSignal
  view.rerender(<AiTopicSimilarityCheck key="two" input={{ ...input, teamId: 2 }} />)
  expect(signal.aborted).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra ý tưởng bằng AI' }))
  expect(await screen.findByText('Kết quả mới')).toBeTruthy()
  resolve(result)
  await waitFor(() => expect(screen.queryByText('Đã so sánh ý tưởng.')).toBeNull())
})
