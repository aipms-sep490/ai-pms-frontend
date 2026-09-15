import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RegistrationSourcePage } from './RegistrationSourcePage'

const auth = vi.hoisted(() => ({ useAuthSession: vi.fn() }))
const workflow = vi.hoisted(() => ({ useAcademicWorkflow: vi.fn() }))
vi.mock('../../auth/context/useAuthSession', () => auth)
vi.mock('../../../app/context/useAcademicWorkflow', () => workflow)

const context = {
  academic: {
    departments: [{ id: 8, code: 'SE', name: 'Software Engineering', isActive: true }],
    majors: [{ id: 12, code: 'SE', name: 'Software Engineering', isActive: true }],
  },
}
function page(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/project/source" element={<RegistrationSourcePage />} /></Routes></MemoryRouter>)
}

describe('RegistrationSourcePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.useAuthSession.mockReturnValue({ session: { accessToken: 'access-token' } })
    workflow.useAcademicWorkflow.mockReturnValue(context)
  })
  afterEach(cleanup)

  it('shows the missing backend contract and keeps Student Proposal outside Project Draft', () => {
    page('/project/source?source=STUDENT_PROPOSAL')
    expect(screen.getByText('BE_NEW_CONTRACT_REQUIRED')).toBeTruthy()
    expect(screen.getByText(/Proposal persistence và approval chưa có/)).toBeTruthy()
    expect(screen.getByText(/ProjectTopic chưa thể trở thành Registration Source/)).toBeTruthy()
  })

  it('does not treat topicId or source query values as registration provenance', () => {
    page('/project/source?topicId=5&source=STUDENT_PROPOSAL&majorId=999')
    expect(screen.getByText(/URL, React state và localStorage không được dùng/)).toBeTruthy()
    expect(screen.queryByText('AI topic')).toBeNull()
  })

  it('does not create a persisted source when users switch preview cards', () => {
    page('/project/source')
    fireEvent.click(screen.getByRole('button', { name: /Đề xuất dự án mới/ }))
    expect(screen.getByText(/Student Proposal chưa thể được persist/)).toBeTruthy()
    expect(screen.getByText(/Proposal persistence và approval chưa có/)).toBeTruthy()
  })
})
