import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ProjectLifecyclePage } from './ProjectLifecyclePage'
import { projectDossierPreview } from '../fixtures/project-dossier-preview'

const lifecycleHook = vi.hoisted(() => ({
  useProjectLifecycle: vi.fn(),
}))

vi.mock('../hooks/useProjectLifecycle', () => lifecycleHook)

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  lifecycleHook.useProjectLifecycle.mockReturnValue({
    data: null,
    error: null,
    isLoading: false,
    isForbidden: false,
    isEmpty: false,
    retry: vi.fn(),
  })
})

describe('ProjectLifecyclePage', () => {
  it('renders simulation banner and project dossier metadata', () => {
    render(<ProjectLifecyclePage />)

    // Simulation banner
    expect(screen.getByText(/Chế độ xem trước hồ sơ đề tài & nhóm/i)).toBeDefined()

    // Title
    expect(
      screen.getByText('Hệ thống Quản lý Tiến trình Thực hiện Đồ án Đa ngành Tích hợp AI')
    ).toBeDefined()
    expect(screen.getByText(/CP_SEP490 • SE28/i)).toBeDefined()
    expect(screen.getByText(/Điểm CDIO: 98\/100/i)).toBeDefined()

    // Supervisor info
    expect(screen.getAllByText('TS. Giảng viên Hướng dẫn A (Demo)').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Chữ ký số mô phỏng \(Demo\)/i)).toBeDefined()

    // Reviewer info
    expect(screen.getByText('ThS. Giảng viên Phản biện B (Demo)')).toBeDefined()
  })

  it('ensures team multidisciplinary breakdown has sum of percent === 100 and count === members.length', () => {
    const totalPercent = projectDossierPreview.majorBreakdown.reduce((sum, m) => sum + m.percent, 0)
    const totalCount = projectDossierPreview.majorBreakdown.reduce((sum, m) => sum + m.count, 0)

    expect(totalPercent).toBe(100)
    expect(totalCount).toBe(projectDossierPreview.members.length)
  })

  it('renders multidisciplinary team members and roles', () => {
    render(<ProjectLifecyclePage />)

    expect(screen.getByText('Cơ cấu Nhóm Đa ngành (5 Thành viên)')).toBeDefined()
    expect(screen.getByText('Nguyễn Văn A')).toBeDefined()
    expect(screen.getByText('Trần Thị B')).toBeDefined()
    expect(screen.getByText('Lê Văn C')).toBeDefined()
    expect(screen.getByText('Phạm Minh D')).toBeDefined()
    expect(screen.getByText('Hoàng Quang E')).toBeDefined()

    // Story points
    expect(screen.getAllByText(/0 SP/).length).toBeGreaterThan(0)
  })

  it('renders approval timeline stages', () => {
    render(<ProjectLifecyclePage />)

    expect(
      screen.getByText('Tiến trình Thẩm định & Phê duyệt Hồ sơ Đề tài')
    ).toBeDefined()
    expect(screen.getByText('1. Đăng ký nhóm & Đề xuất đề tài')).toBeDefined()
    expect(screen.getByText('2. GVHD thẩm định & Đồng ý hướng dẫn')).toBeDefined()
    expect(screen.getByText('3. Hội đồng Bộ môn Phê duyệt đề tài')).toBeDefined()
    expect(screen.getByText('4. Khởi động & Thực hiện Cột mốc (M1 – M6)')).toBeDefined()
  })

  it('disables pending action buttons with honest tooltips', () => {
    render(<ProjectLifecyclePage />)

    const editBtn = screen.getByRole('button', { name: /Chỉnh sửa hồ sơ/i })
    expect(editBtn.hasAttribute('disabled')).toBe(true)

    const pdfBtn = screen.getByRole('button', { name: /Xuất hồ sơ PDF/i })
    expect(pdfBtn.hasAttribute('disabled')).toBe(true)
  })

  it('renders domain workflow engine section', () => {
    render(<ProjectLifecyclePage />)

    expect(
      screen.getByText('Quy trình Chuyển đổi Trạng thái Đồ án (State Machine)')
    ).toBeDefined()
    expect(screen.getByText('GET /api/projects/lifecycle')).toBeDefined()
  })

  it('renders a distinct forbidden state when the backend returns 403', () => {
    lifecycleHook.useProjectLifecycle.mockReturnValue({
      data: null,
      error: new Error('Forbidden'),
      isLoading: false,
      isForbidden: true,
      isEmpty: false,
      retry: vi.fn(),
    })

    render(<ProjectLifecyclePage />)

    expect(screen.getByRole('alert').textContent).toContain('Không có quyền xem lifecycle đồ án')
    expect(screen.queryByRole('button', { name: /Thử lại/i })).toBeNull()
  })

  it('renders an explicit empty state for an empty lifecycle response', () => {
    lifecycleHook.useProjectLifecycle.mockReturnValue({
      data: { states: [] },
      error: null,
      isLoading: false,
      isForbidden: false,
      isEmpty: true,
      retry: vi.fn(),
    })

    render(<ProjectLifecyclePage />)

    expect(screen.getByText('Chưa có trạng thái lifecycle nào được trả về cho đồ án này.')).toBeDefined()
  })
})
