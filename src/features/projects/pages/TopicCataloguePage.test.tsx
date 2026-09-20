import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { TopicCataloguePage } from './TopicCataloguePage'
import { HttpError } from '../../../services/http/http-client'

const auth = vi.hoisted(() => ({ useAuthSession: vi.fn() }))
const workflow = vi.hoisted(() => ({ useAcademicWorkflow: vi.fn() }))
const journey = vi.hoisted(() => ({ useStudentJourney: vi.fn() }))
const discovery = vi.hoisted(() => ({ useTopicDiscovery: vi.fn() }))
const topics = vi.hoisted(() => ({ getTopic: vi.fn() }))
const api = vi.hoisted(() => ({ selectTopic: vi.fn() }))
vi.mock('../../../features/auth/context/useAuthSession', () => auth)
vi.mock('../../../app/context/useAcademicWorkflow', () => workflow)
vi.mock('../../../app/context/useStudentJourney', () => journey)
vi.mock('../../../services/service-gateway', () => ({ services: { project: { selectTopic: api.selectTopic } } }))
vi.mock('../../registration/hooks/useTopicDiscovery', () => discovery)
vi.mock('../../topics/api/topic-api', () => topics)

const topic = { id: 5, code: 'TOP-5', status: 'PUBLISHED', projectPeriodId: 9, academicSemesterId: 4, leadDepartmentId: 8, leadDepartmentName: 'Software Engineering', title: 'AI topic', description: 'Build a model', problemStatement: null, objectives: 'Objective', expectedOutput: 'Output', domain: null, technologies: [], keywords: [], projectMode: 'SINGLE_MAJOR' as const, primaryMajorId: 12, requirements: [], concurrencyToken: 'token', closeReason: null, matchesMyMajor: false }
const project = { id: 9, teamId: 4, teamName: 'Team 4', code: 'P-9', title: 'Draft', status: 'DRAFT', registeredAt: '', createdBy: 1, createdByName: 'Leader', createdAt: '', updatedAt: '', concurrencyToken: 'current-token', majors: [], tags: [] }
const refreshAll = vi.fn().mockResolvedValue(undefined)
const retry = vi.fn().mockResolvedValue(undefined)
const currentJourney = (overrides = {}) => ({ project, team: { members: [{ userId: 1, isLeader: true }] }, profile: { id: 1 }, projectActions: { actions: [{ code: 'edit_project_draft', allowed: true, reasons: [] }] }, refreshAll, ...overrides })

function page() { return render(<MemoryRouter><TopicCataloguePage /></MemoryRouter>) }
async function openTopic() { fireEvent.click(screen.getByRole('button', { name: 'Xem chi tiết' })); await waitFor(() => expect(topics.getTopic).toHaveBeenCalledWith(5, 'access-token')) }

describe('TopicCataloguePage', () => {
  beforeEach(() => {
    vi.clearAllMocks(); refreshAll.mockResolvedValue(undefined); retry.mockResolvedValue(undefined)
    auth.useAuthSession.mockReturnValue({ session: { accessToken: 'access-token' } })
    workflow.useAcademicWorkflow.mockReturnValue({ academic: { selectedSemester: { id: 4, code: 'FA26', name: 'Fall 2026' }, periods: [{ id: 9, isOpen: true }], majors: [{ id: 12, code: 'SE', name: 'Software Engineering' }] } })
    journey.useStudentJourney.mockReturnValue(currentJourney())
    discovery.useTopicDiscovery.mockReturnValue({ topics: [topic], totalCount: 1, isLoading: false, error: null, errorKind: null, retry })
    topics.getTopic.mockResolvedValue(topic)
  })
  afterEach(cleanup)

  it('renders backend-scoped topic data, ignores URL scope, and does not treat compatibility advice as authority', () => {
    page()
    expect(screen.getByText(/Phạm vi học vụ xác thực: SE · Software Engineering/)).toBeTruthy(); expect(screen.getByText('AI topic')).toBeTruthy(); expect(screen.getByText(/not compatible with your verified major/)).toBeTruthy()
    expect(discovery.useTopicDiscovery.mock.calls[0][1]).toMatchObject({ academicSemesterId: 4, projectPeriodId: 9, status: 'PUBLISHED', page: 1, pageSize: 12 })
  })

  it('sends the latest Project concurrency token and renders Backend provenance after selection', async () => {
    api.selectTopic.mockResolvedValue({ ...project, topicId: 5, proposalSource: 'PUBLISHED_TOPIC', selectedTopic: { id: 5, code: 'TOP-5', title: 'AI topic' }, concurrencyToken: 'fresh-token' })
    page(); await openTopic(); fireEvent.click(screen.getByRole('button', { name: 'Chọn đề tài này' }))
    await waitFor(() => expect(api.selectTopic).toHaveBeenCalledWith(9, { topicId: 5, concurrencyToken: 'current-token' }))
    expect(refreshAll).toHaveBeenCalled(); expect(await screen.findByText(/Đề tài Backend đã chọn: TOP-5 · AI topic/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Chọn đề tài này' }))
    await waitFor(() => expect(api.selectTopic).toHaveBeenLastCalledWith(9, { topicId: 5, concurrencyToken: 'fresh-token' }))
  })

  it('hides selection for a non-editable Project Draft', async () => {
    journey.useStudentJourney.mockReturnValue(currentJourney({ project: { ...project, status: 'SUBMITTED' } }))
    page(); await openTopic()
    expect(screen.queryByRole('button', { name: 'Chọn đề tài này' })).toBeNull(); expect(screen.getByText(/Cần bản nháp có thể chỉnh sửa/)).toBeTruthy()
  })

  it.each([[403, /Backend từ chối quyền/], [404, /Project hoặc đề tài không còn/], [409, /Dữ liệu Project và Topic đã được tải lại/] as const])('surfaces Backend %s selection errors without retrying the mutation', async (status, message) => {
    api.selectTopic.mockRejectedValue(new HttpError('Backend detail', status))
    page(); await openTopic(); fireEvent.click(screen.getByRole('button', { name: 'Chọn đề tài này' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(message)
    expect(api.selectTopic).toHaveBeenCalledTimes(1)
    if (status === 409) { expect(refreshAll).toHaveBeenCalled(); expect(retry).toHaveBeenCalled() }
  })
})
