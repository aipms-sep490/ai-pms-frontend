import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AssistantStructuredReportView } from './AssistantStructuredReport'
import type { AssistantStructuredReport } from '../academic-ai-api'

afterEach(cleanup)

const report: AssistantStructuredReport = {
  summaryTitle: 'Tình trạng tài liệu & công việc trong đồ án',
  coverage: {
    projectTitle: 'Hệ thống quản lý đồ án AI-PMS',
    projectStage: 'ACTIVE',
    tasksScanned: 12,
    tasksTotal: 15,
    deliverablesCount: 4,
    coldItemsCount: 3,
    reviewGatesCount: 2,
  },
  items: [
    {
      category: 'DOCUMENT',
      title: 'Tài liệu đặc tả SRS',
      location: 'Mốc 1: Phân tích · Hạng mục nộp',
      status: 'NEEDS_REVISION',
      progressText: 'Phiên bản v2 (1 tệp)',
      issueDetail: 'GVHD yêu cầu bổ sung ma trận truy vết và sơ đồ tuần tự.',
      owner: 'Cả nhóm',
      target: 'deliverables',
      resourceId: 5,
    },
    {
      category: 'TASK',
      title: 'Tối ưu truy vấn ngữ cảnh AI',
      location: 'Mốc 2: Triển khai',
      status: 'BLOCKED',
      progressText: 'Tiêu chí 1/3 · 0 tệp',
      issueDetail: 'Bị chặn bởi: Chốt schema task_criteria',
      owner: 'Nguyễn Quang Khải',
      target: 'tasks',
      resourceId: 42,
    },
    {
      category: 'COLD_REPORT',
      title: 'Báo cáo chấm nguội SE',
      location: 'Chấm nguội · SRS',
      status: 'MISSING',
      progressText: 'Chưa tạo bản nháp',
      owner: 'Nhóm đồ án',
      target: 'cold-reports',
    },
    {
      category: 'REVIEW_GATE',
      title: 'G1: Review Gate 1',
      location: 'Tiến trình Review Gates',
      status: 'PENDING_REVIEW',
      progressText: 'Đạt 2/3 yêu cầu',
      target: 'timeline',
    },
  ],
}

it('renders coverage pills, category filters, diagnostic details and deep-link navigation', () => {
  const onOpenTarget = vi.fn()
  render(<AssistantStructuredReportView report={report} onOpenTarget={onOpenTarget} />)

  expect(screen.getByText('Hệ thống quản lý đồ án AI-PMS')).toBeTruthy()
  expect(screen.getByText('Công việc 12/15')).toBeTruthy()
  expect(screen.getByText('Tài liệu 4')).toBeTruthy()
  expect(screen.getByText('Chấm nguội 3')).toBeTruthy()
  expect(screen.getByText('Gates 2')).toBeTruthy()
  expect(screen.getByText(/GVHD yêu cầu bổ sung ma trận truy vết/)).toBeTruthy()
  expect(screen.getByText(/Bị chặn bởi: Chốt schema task_criteria/)).toBeTruthy()

  // Filter to tasks only
  fireEvent.click(screen.getByRole('tab', { name: 'Công việc (1)' }))
  expect(screen.queryByText('Tài liệu đặc tả SRS')).toBeNull()
  expect(screen.getByText('Tối ưu truy vấn ngữ cảnh AI')).toBeTruthy()

  // Click deep-link button
  fireEvent.click(screen.getByRole('button', { name: /Mở đúng vị trí/ }))
  expect(onOpenTarget).toHaveBeenCalledWith('tasks', 42)
})
