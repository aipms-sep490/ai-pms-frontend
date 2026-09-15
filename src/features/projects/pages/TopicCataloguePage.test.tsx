import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { TopicCataloguePage } from './TopicCataloguePage'

const auth = vi.hoisted(() => ({ useAuthSession: vi.fn() }))
const workflow = vi.hoisted(() => ({ useAcademicWorkflow: vi.fn() }))
const discovery = vi.hoisted(() => ({ useTopicDiscovery: vi.fn() }))
const topics = vi.hoisted(() => ({ getTopic: vi.fn() }))
vi.mock('../../../features/auth/context/useAuthSession', () => auth)
vi.mock('../../../app/context/useAcademicWorkflow', () => workflow)
vi.mock('../../registration/hooks/useTopicDiscovery', () => discovery)
vi.mock('../../topics/api/topic-api', () => topics)

const topic = {
  id: 5, code: 'TOP-5', status: 'PUBLISHED', projectPeriodId: 9, academicSemesterId: 4,
  leadDepartmentId: 8, leadDepartmentName: 'Software Engineering', title: 'AI topic',
  description: 'Build a model', problemStatement: null, objectives: 'Objective', expectedOutput: 'Output',
  domain: null, technologies: [], keywords: [], projectMode: 'SINGLE_MAJOR' as const,
  primaryMajorId: 12, requirements: [], concurrencyToken: 'token', closeReason: null, matchesMyMajor: false,
}

function page(path = '/topics?majorId=999') {
  return render(<MemoryRouter initialEntries={[path]}><TopicCataloguePage /></MemoryRouter>)
}

describe('TopicCataloguePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.useAuthSession.mockReturnValue({ session: { accessToken: 'access-token' } })
    workflow.useAcademicWorkflow.mockReturnValue({ academic: {
      selectedSemester: { id: 4, code: 'FA26', name: 'Fall 2026' },
      periods: [{ id: 9, isOpen: true }],
      majors: [{ id: 12, code: 'SE', name: 'Software Engineering' }],
    } })
    discovery.useTopicDiscovery.mockReturnValue({
      topics: [topic], totalCount: 1, isLoading: false, error: null, errorKind: null, retry: vi.fn(),
    })
  })
  afterEach(cleanup)

  it('renders backend-scoped topic data, does not use URL majorId as scope, and preserves compatibility advice', () => {
    page()
    expect(screen.getByText(/Phạm vi học vụ xác thực: SE · Software Engineering/)).toBeTruthy()
    expect(screen.queryByText('999')).toBeNull()
    expect(screen.getByText('AI topic')).toBeTruthy()
    expect(screen.getByText(/Bộ môn chủ trì: Software Engineering/)).toBeTruthy()
    expect(screen.getByText('This topic is not compatible with your verified major or the current project policy.')).toBeTruthy()
    expect(discovery.useTopicDiscovery.mock.calls[0][1]).toMatchObject({
      academicSemesterId: 4, projectPeriodId: 9, status: 'PUBLISHED', page: 1, pageSize: 12,
    })
  })

  it('opens the real topic detail adapter instead of constructing a Project Draft', async () => {
    topics.getTopic.mockResolvedValue(topic)
    page()
    fireEvent.click(screen.getByRole('button', { name: 'Xem chi tiết' }))
    await waitFor(() => expect(topics.getTopic).toHaveBeenCalledWith(5, 'access-token'))
    expect(screen.getByLabelText('Chi tiết đề tài')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Bắt đầu từ đề tài này' })).toBeTruthy()
  })
})
