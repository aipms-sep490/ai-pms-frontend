import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RegistrationSourcePage } from './RegistrationSourcePage'

const journey = vi.hoisted(() => ({ useStudentJourney: vi.fn() }))
vi.mock('../../../app/context', () => journey)

const draft = (source = 'STUDENT_PROPOSAL') => ({ id: 9, teamId: 4, teamName: 'Team 4', code: 'P-9', title: 'Draft', status: 'DRAFT', registeredAt: '', createdBy: 1, createdByName: 'Leader', createdAt: '', updatedAt: '', concurrencyToken: 'token', majors: [], tags: [], proposalSource: source, selectedTopic: source === 'PUBLISHED_TOPIC' ? { id: 5, code: 'TOP-5', title: 'AI topic' } : null })
const baseJourney = (project = draft()) => ({ project, team: { members: [{ userId: 1, isLeader: true }] }, profile: { id: 1 }, projectActions: { actions: [{ code: 'edit_project_draft', allowed: true, reasons: [] }] }, isLoading: false, error: null, refreshAll: vi.fn() })

function page(path = '/project/source') { return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/project/source" element={<RegistrationSourcePage />} /><Route path="/topics" element={<p>Topic catalogue route</p>} /><Route path="/project/register" element={<p>Project draft route</p>} /></Routes></MemoryRouter>) }

describe('RegistrationSourcePage', () => {
  beforeEach(() => { vi.clearAllMocks(); journey.useStudentJourney.mockReturnValue(baseJourney()) })
  afterEach(cleanup)

  it('uses only Backend STUDENT_PROPOSAL provenance and ignores query values', () => {
    page('/project/source?topicId=5&source=PUBLISHED_TOPIC')
    expect(screen.getByText(/STUDENT_PROPOSAL · Đề tài do sinh viên đề xuất/)).toBeTruthy()
    expect(screen.queryByText('AI topic')).toBeNull()
    expect(screen.queryByText('5')).toBeNull()
  })

  it('requires a Project Draft before Published Topic selection', () => {
    journey.useStudentJourney.mockReturnValue(baseJourney(null as any))
    page()
    expect(screen.getByText(/Cần Project Draft trước khi chọn đề tài/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Tạo Project Draft trước' }))
    expect(screen.getByText('Project draft route')).toBeTruthy()
  })

  it('opens the selectable catalogue only for an editable Backend draft', () => {
    page()
    fireEvent.click(screen.getByRole('button', { name: 'Mở Topic Catalogue' }))
    expect(screen.getByText('Topic catalogue route')).toBeTruthy()
  })

  it('renders the Backend-selected topic without inventing a clear operation', () => {
    journey.useStudentJourney.mockReturnValue(baseJourney(draft('PUBLISHED_TOPIC')))
    page()
    expect(screen.getByText(/PUBLISHED_TOPIC · TOP-5 · AI topic/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Đề xuất dự án mới/ }))
    expect(screen.getByText(/Frontend không có thao tác xóa hoặc đổi ngược Topic/)).toBeTruthy()
  })
})
