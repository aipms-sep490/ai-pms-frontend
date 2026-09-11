import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { MilestoneDetailPage } from './MilestoneDetailPage'

afterEach(() => {
  cleanup()
})

function renderMilestonePage(initialPath = '/project/milestones/M3') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/project/milestones/:milestoneId" element={<MilestoneDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('MilestoneDetailPage', () => {
  it('renders milestone header, progress, and 4 Kanban columns', () => {
    renderMilestonePage()

    // Title and progress
    expect(
      screen.getByText('Cột mốc M3: Kiến trúc hệ thống & UI Prototype')
    ).toBeDefined()
    expect(screen.getByText('67%')).toBeDefined()
    expect(screen.getByText(/Giai đoạn 3 \(Sprint 2\)/)).toBeDefined()

    // 4 Column headers
    expect(screen.getByText('Cần làm')).toBeDefined()
    expect(screen.getAllByText('Đang thực hiện').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Chờ duyệt / QA')).toBeDefined()
    expect(screen.getByText('Đã hoàn thành')).toBeDefined()

    // Critical task highlight
    expect(screen.getByText('SEP-108')).toBeDefined()
    expect(screen.getByText('! Đường găng')).toBeDefined()
  })

  it('filters Kanban tasks by multidisciplinary major', () => {
    renderMilestonePage()

    // Initial has tasks from multiple majors
    expect(screen.getByText('SEP-108')).toBeDefined() // SE
    expect(screen.getByText('SEP-112')).toBeDefined() // UIUX

    // Click SE filter
    const seFilterBtn = screen.getByRole('button', { name: /Kỹ thuật Phần mềm \[SE\]/i })
    fireEvent.click(seFilterBtn)

    // SE task remains
    expect(screen.getByText('SEP-108')).toBeDefined()
    // UIUX task is hidden
    expect(screen.queryByText('SEP-112')).toBeNull()
  })

  it('filters tasks using search input query', () => {
    renderMilestonePage()

    const searchInput = screen.getByPlaceholderText('Tìm theo mã hoặc tên công việc...')
    fireEvent.change(searchInput, { target: { value: 'ONNX' } })

    // Only ONNX task is displayed
    expect(screen.getByText('SEP-116')).toBeDefined()
    expect(screen.queryByText('SEP-108')).toBeNull()
  })

  it('disables "Tạo công việc mới" button with honest tooltip', () => {
    renderMilestonePage()

    const createBtn = screen.getByRole('button', { name: /Tạo công việc mới/i })
    expect(createBtn.hasAttribute('disabled')).toBe(true)
  })

  it('switches milestone from M3 to M1 and updates title, progress, and columns consistently', () => {
    renderMilestonePage('/project/milestones/M3')

    // Click M1 tab
    const m1Btn = screen.getByRole('tab', { name: 'M1' })
    fireEvent.click(m1Btn)

    // Check title updates to M1
    expect(
      screen.getByText('Cột mốc M1: Đề cương & Hồ sơ nhóm')
    ).toBeDefined()
    expect(screen.getByText('100%')).toBeDefined()
    expect(screen.getByText(/12 \/ 12 tác vụ/)).toBeDefined()

    // Completed tasks for M1 are displayed in column 4
    expect(screen.getByText('SEP-101')).toBeDefined()
    expect(screen.getByText('SEP-103')).toBeDefined()
    expect(screen.getByText('SEP-106')).toBeDefined()

    // Columns with 0 tasks display consistent empty message
    const emptyStateTexts = screen.getAllByText('Không có tác vụ trong trạng thái này')
    expect(emptyStateTexts.length).toBe(3) // todo, in_progress, review columns
  })
})
