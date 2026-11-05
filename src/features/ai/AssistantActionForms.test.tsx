import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ReportEditor } from '../reports/ReportEditor'
import { MeetingNotesForm } from '../meetings/MeetingNotesForm'
import { AssistantDraftCard } from './components/AssistantDraftCard'
import { readActionDraft } from './assistant-action-draft'
import type { AssistantDraft } from './academic-ai-api'

afterEach(cleanup)
const report: AssistantDraft = { kind: 'WEEKLY_REPORT', title: 'Week', description: 'Summary', report: { periodStart: '2026-11-02', periodEnd: '2026-11-08', completedWork: 'API done', inProgressWork: 'Tests', blockers: 'Review', risks: 'Delay', nextActions: 'Fix tests', plannedWork: 'Deploy' } }
const cycles = [{ id: 7, reportType: 'WEEKLY', periodStart: '2026-11-02', periodEnd: '2026-11-08', deadline: '2026-11-09T00:00:00Z', latePolicy: 'FLAG' }] as never

it('prefills report sections and an exact unused cycle, but does not save or submit', () => {
  const save = vi.fn()
  render(<ReportEditor projectId={9} initialDraft={report} cycles={cycles} busy={false} onSave={save} onDirtyChange={vi.fn()} />)
  expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('7')
  expect(screen.getByDisplayValue('Summary')).toBeTruthy()
  for (const value of ['API done', 'Tests', 'Review', 'Delay', 'Fix tests', 'Deploy']) expect(screen.getByDisplayValue(value)).toBeTruthy()
  expect(save).not.toHaveBeenCalled()
  fireEvent.submit(screen.getByDisplayValue('Summary').closest('form')!)
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ summary: 'Summary', completedWork: 'API done', progressReportPeriodId: 7, periodStart: '2026-11-02' }))
})

it('does not select a period that already has a report', () => {
  render(<ReportEditor projectId={9} initialDraft={report} cycles={cycles} existingReports={[{ progressReportPeriodId: 7 }] as never} busy={false} onSave={vi.fn()} onDirtyChange={vi.fn()} />)
  expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('')
})

it('prefills minutes but never changes attendance automatically', () => {
  const save = vi.fn()
  render(<MeetingNotesForm initialNotes="Draft decisions" meeting={{ meetingNotes: 'Original', participants: [{ userId: 4, fullName: 'Hung', attendanceStatus: 'INVITED' }] } as never} busy={false} onSave={save} onDirty={vi.fn()} onCancel={vi.fn()} />)
  expect(screen.getByDisplayValue('Draft decisions')).toBeTruthy()
  expect(save).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Lưu biên bản & điểm danh' }))
  expect(save).toHaveBeenCalledWith({ meetingNotes: 'Draft decisions', attendances: [] })
})

it('opens each plan task as its own editable draft rather than creating tasks in bulk', () => {
  const use = vi.fn()
  render(<AssistantDraftCard draft={{ kind: 'WORK_PLAN', title: 'Plan', description: 'Steps', tasks: [{ kind: 'TASK', title: 'Test API', description: 'Check scope' }, { kind: 'TASK', title: 'Document API', description: 'Write docs' }] }} onUse={use} />)
  expect(use).not.toHaveBeenCalled()
  fireEvent.click(screen.getAllByRole('button', { name: 'Dùng bản nháp · mở biểu mẫu' })[1])
  expect(use).toHaveBeenCalledWith(expect.objectContaining({ kind: 'TASK', title: 'Document API' }))
})

it('discards cross-project, malformed and forged entity IDs from draft navigation', () => {
  expect(readActionDraft({ ...report, projectId: 9 }, 10, 'WEEKLY_REPORT')).toBeUndefined()
  const parsed = readActionDraft({ kind: 'TASK', title: 'Task', description: '', projectId: 9, task: { assigneeUserIds: [999], milestoneId: 999, dueAt: 'tomorrow', priority: 'FAKE' } }, 9, 'TASK')!
  expect(parsed.task).toMatchObject({ dueAt: null, priority: null, assigneeNames: [] })
  expect(parsed.task).not.toHaveProperty('milestoneId')
})
