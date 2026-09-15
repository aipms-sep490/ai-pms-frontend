import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RegistrationSourcePage } from './RegistrationSourcePage'

const auth = vi.hoisted(() => ({ useAuthSession: vi.fn() }))
const workflow = vi.hoisted(() => ({ useAcademicWorkflow: vi.fn() }))
const topics = vi.hoisted(() => ({ getTopic: vi.fn() }))
vi.mock('../../auth/context/useAuthSession', () => auth)
vi.mock('../../../app/context/useAcademicWorkflow', () => workflow)
vi.mock('../../topics/api/topic-api', () => topics)

const context = {
  academic: {
    departments: [{ id: 8, code: 'SE', name: 'Software Engineering', isActive: true }],
    majors: [{ id: 12, code: 'SE', name: 'Software Engineering', isActive: true }],
  },
}
const topic = {
  id: 5, code: 'TOP-5', status: 'PUBLISHED', projectPeriodId: 9, academicSemesterId: 4,
  leadDepartmentId: 8, leadDepartmentName: 'Software Engineering', title: 'AI topic',
  description: null, problemStatement: null, objectives: null, expectedOutput: null,
  domain: null, technologies: [], keywords: [], projectMode: 'INTERDISCIPLINARY' as const,
  primaryMajorId: null, requirements: [{ majorId: 12, majorName: 'SE', minMembers: 1, maxMembers: 2, responsibility: 'Frontend' }], concurrencyToken: 'token', closeReason: null,
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
    expect(screen.getByText(/F6 vẫn sở hữu Project Draft/)).toBeTruthy()
    expect(topics.getTopic).not.toHaveBeenCalled()
  })

  it('loads a topic source from the real detail adapter while retaining verified context as read-only', async () => {
    topics.getTopic.mockResolvedValue(topic)
    page('/project/source?topicId=5&majorId=999')
    await waitFor(() => expect(screen.getByText('AI topic')).toBeTruthy())
    expect(topics.getTopic).toHaveBeenCalledWith(5, 'access-token')
    expect(screen.getAllByText('Software Engineering')).toHaveLength(3)
    expect(screen.queryByDisplayValue('999')).toBeNull()
  })

  it('does not create a persisted source when users switch preview cards', () => {
    page('/project/source')
    fireEvent.click(screen.getByRole('button', { name: /Đề xuất dự án mới/ }))
    expect(screen.getByText(/Student Proposal chưa thể được persist/)).toBeTruthy()
    expect(topics.getTopic).not.toHaveBeenCalled()
  })
})
