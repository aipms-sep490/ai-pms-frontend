import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RegistrationSourcePage } from './RegistrationSourcePage'

const workflow = vi.hoisted(() => ({ useAcademicWorkflow: vi.fn() }))
vi.mock('../../../app/context/useAcademicWorkflow', () => workflow)

const context = {
  academic: {
    departments: [{ id: 8, code: 'SE', name: 'Software Engineering', isActive: true }],
    majors: [{ id: 12, code: 'SE', name: 'Software Engineering', isActive: true }],
  },
}

function page(path = '/project/source') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/project/source" element={<RegistrationSourcePage />} />
        <Route path="/topics" element={<p>Topic catalogue route</p>} />
        <Route path="/project/register" element={<p>Project draft route</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RegistrationSourcePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    workflow.useAcademicWorkflow.mockReturnValue(context)
  })
  afterEach(cleanup)

  it('keeps the missing Registration Source contract visible for Published Topic', () => {
    page()

    expect(screen.getByText('BE_NEW_CONTRACT_REQUIRED')).toBeTruthy()
    expect(screen.getByText(/Published Topic chỉ có thể được đọc từ Topic Catalogue/)).toBeTruthy()
    expect(screen.getByText(/Topic choice vẫn bị chặn khỏi canonical Project creation/)).toBeTruthy()
  })

  it('does not treat topicId or source query values as registration provenance', () => {
    page('/project/source?topicId=5&source=STUDENT_PROPOSAL&majorId=999')

    expect(screen.getByText(/URL, React state và localStorage không được dùng/)).toBeTruthy()
    expect(screen.queryByText('AI topic')).toBeNull()
    expect(screen.queryByText('999')).toBeNull()
  })

  it('navigates Published Topic users to the backend-read Topic Catalogue without creating a Project', () => {
    page()

    fireEvent.click(screen.getByRole('button', { name: 'Mở Topic Catalogue' }))
    expect(screen.getByText('Topic catalogue route')).toBeTruthy()
  })

  it('opens the existing backend-gated Project Draft form for Student Proposal without claiming a persisted source', () => {
    page()

    fireEvent.click(screen.getByRole('button', { name: /Đề xuất dự án mới/ }))
    expect(screen.getByText(/Student Proposal dùng Project Draft hiện có/)).toBeTruthy()
    expect(screen.getByText(/không phải một Proposal aggregate hoặc Registration Source được persist/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Mở Project Draft' }))
    expect(screen.getByText('Project draft route')).toBeTruthy()
  })
})
