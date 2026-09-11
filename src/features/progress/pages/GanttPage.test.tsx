import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { GanttPage } from './GanttPage'

afterEach(() => {
  cleanup()
})

function renderGanttPage() {
  return render(
    <MemoryRouter>
      <GanttPage />
    </MemoryRouter>
  )
}

describe('GanttPage', () => {
  it('renders Gantt header, compact telemetry strip, and 15-week timeline headers', () => {
    renderGanttPage()

    // Title & badge
    expect(
      screen.getByText('Biểu đồ Gantt Đa ngành & Phân tích Đường găng')
    ).toBeDefined()
    expect(screen.getByText('Dữ liệu mô phỏng')).toBeDefined()

    // Current week & telemetry in compact strip
    expect(screen.getByText(/Tuần T6/)).toBeDefined()
    expect(screen.getByText('28 ngày')).toBeDefined()
    expect(screen.getByText('14')).toBeDefined()
    expect(screen.getByText(/3 tác vụ găng/)).toBeDefined()
    expect(screen.getByText(/5 hoàn thành • 5 đang làm • 4 sắp tới/)).toBeDefined()

    // Bottleneck chain warning callout
    expect(screen.getAllByText(/SEP-105 → SEP-108 → SEP-112/).length).toBeGreaterThanOrEqual(1)

    // Timeline column headers (weeks)
    expect(screen.getAllByText('T1').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('T6').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('T15').length).toBeGreaterThanOrEqual(1)
  })

  it('only expands active milestone M3 by default, and supports collapse/expand controls', () => {
    renderGanttPage()

    // M3 tasks are visible by default
    expect(screen.getAllByText('SEP-109').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('SEP-105').length).toBeGreaterThanOrEqual(1)

    // M1 task is collapsed by default and not visible
    expect(screen.queryByText('SEP-101')).toBeNull()

    // Click "Mở rộng tất cả" button
    const expandAllBtn = screen.getByRole('button', { name: /Mở rộng tất cả/i })
    fireEvent.click(expandAllBtn)

    // M1 task is now revealed
    expect(screen.getAllByText('SEP-101').length).toBeGreaterThanOrEqual(1)

    // Click "Thu gọn tất cả" button
    const collapseAllBtn = screen.getByRole('button', { name: 'Thu gọn tất cả' })
    fireEvent.click(collapseAllBtn)

    // Now even M3 tasks in chart are collapsed
    expect(screen.queryByText('SEP-109')).toBeNull()
  })

  it('filters to only critical path tasks when toggle is checked', () => {
    renderGanttPage()

    // Initially active M3 has non-critical SEP-109 and critical SEP-108
    expect(screen.getAllByText('SEP-109').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('SEP-108').length).toBeGreaterThanOrEqual(1)

    // Check "Chỉ xem đường găng (Critical Path)"
    const toggle = screen.getByLabelText(/Chỉ xem đường găng/i)
    fireEvent.click(toggle)

    // Critical tasks remain visible
    expect(screen.getAllByText('SEP-108').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('SEP-105').length).toBeGreaterThanOrEqual(1)
    // Non-critical task is filtered out
    expect(screen.queryAllByText('SEP-109')).toHaveLength(0)
  })

  it('filters tasks by multidisciplinary major and auto-expands matching groups', () => {
    renderGanttPage()

    // In M3: SEP-109 is SE and SEP-112 is UI/UX
    expect(screen.getAllByText('SEP-109').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('SEP-112').length).toBeGreaterThanOrEqual(1)

    // Filter by UI/UX
    const uiuxBtn = screen.getByRole('button', { name: /Thiết kế UI\/UX \[UI\/UX\]/i })
    fireEvent.click(uiuxBtn)

    // UI/UX task is visible
    expect(screen.getAllByText('SEP-112').length).toBeGreaterThanOrEqual(1)
    // SE task is hidden
    expect(screen.queryAllByText('SEP-109')).toHaveLength(0)
  })

  it('filters tasks by search query input and auto-expands matching group', () => {
    renderGanttPage()

    // Search for Monorepo (which belongs to M1, initially collapsed)
    expect(screen.queryByText('SEP-101')).toBeNull()

    const searchInput = screen.getByPlaceholderText(
      'Tìm theo mã tác vụ, tên hoặc người phụ trách...'
    )
    fireEvent.change(searchInput, { target: { value: 'Monorepo' } })

    // Matching task in M1 is automatically revealed
    expect(screen.getAllByText('SEP-101').length).toBeGreaterThanOrEqual(1)
    // Non-matching M3 task is hidden
    expect(screen.queryAllByText('SEP-109')).toHaveLength(0)
  })

  it('disables "Xuất MS Project / CSV" button with descriptive title', () => {
    renderGanttPage()

    const exportBtn = screen.getByRole('button', { name: /Xuất MS Project \/ CSV/i })
    expect(exportBtn.hasAttribute('disabled')).toBe(true)
  })

  it('toggles view mode from weeks to milestones (M1–M6) and updates headers', () => {
    renderGanttPage()

    // Initially in weeks view: T1 and T15 are visible
    expect(screen.getAllByText('T1').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('T15').length).toBeGreaterThanOrEqual(1)

    // Click "Xem theo mốc (M1–M6)"
    const milestoneModeBtn = screen.getByRole('button', { name: /Xem theo mốc/i })
    fireEvent.click(milestoneModeBtn)

    // Headers now show milestone columns M1 - M6 titles
    expect(screen.getAllByText('M1').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Đề cương & Nhóm')).toBeDefined()
    expect(screen.getByText('Đặc tả SRS & RTM')).toBeDefined()
    expect(screen.getByText('Kiến trúc & Prototype')).toBeDefined()
    expect(screen.getByText('Phát triển MVP v1.0')).toBeDefined()
    expect(screen.getByText('Thử nghiệm & CDIO')).toBeDefined()
    expect(screen.getByText('Nghiệm thu & Bảo vệ')).toBeDefined()

    // Week column headers T1 and T15 are no longer in the header
    expect(screen.queryByText('T1')).toBeNull()
    expect(screen.queryByText('T15')).toBeNull()
  })
})

