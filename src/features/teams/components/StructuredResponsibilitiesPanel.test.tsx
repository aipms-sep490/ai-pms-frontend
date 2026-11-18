import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { StructuredResponsibilitiesPanel } from './StructuredResponsibilitiesPanel'
import { HttpError } from '../../../services/http/http-client'
import type { TeamAcademicScopeDto } from '../../../types/backend'

const api = vi.hoisted(() => ({ getTeamResponsibilities: vi.fn(), replaceTeamResponsibilities: vi.fn() }))
vi.mock('../../projects/api/discipline-governance-api', () => api)
afterEach(() => { cleanup(); vi.resetAllMocks() })

it('performs one successful readback when saving also refreshes the scope token', async () => {
  api.getTeamResponsibilities.mockResolvedValueOnce(response(1, 'Original', 'token'))
    .mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(response(1, 'Saved work', 'saved-token')), 10)))
  api.replaceTeamResponsibilities.mockResolvedValue(response(1, 'Saved work', 'saved-token'))
  function ScopeOwner() {
    const [currentScope, setScope] = useState(scope)
    return <StructuredResponsibilitiesPanel teamId={7} scope={currentScope} majorNames={{ 1: 'SE' }} canEdit
      onSaved={async () => { setScope({ ...scope, concurrencyToken: 'saved-scope' }) }} />
  }
  render(<ScopeOwner />)
  await screen.findByDisplayValue('Original')
  fireEvent.change(screen.getByLabelText('Trách nhiệm 1'), { target: { value: 'Saved work' } })
  fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  await screen.findByText('Đã lưu phân công và cập nhật điều kiện của nhóm.')
  expect(api.getTeamResponsibilities).toHaveBeenCalledTimes(2)
  expect(screen.getByDisplayValue('Saved work')).toBeDefined()
  expect(screen.queryByText('Phân công đã được lưu. Cần tải lại để kiểm tra dữ liệu mới nhất.')).toBeNull()
})
const scope: TeamAcademicScopeDto = {
  projectMode: 'INTERDISCIPLINARY', primaryMajorId: null, leadDepartmentId: 1, concurrencyToken: 'scope',
  requirements: [1, 2].map(majorId => ({ majorId, minMembers: 1, maxMembers: 5, responsibility: 'QA' })),
}
const response = (majorId: number, content: string, token: string) => ({ concurrencyToken: token, isSnapshot: false, isAvailable: true, items: [{ id: majorId, majorId, content, sortOrder: 0, concurrencyToken: token }] })

it('keeps the selected major content and token when the previous read arrives late', async () => {
  let finishOld!: (value: ReturnType<typeof response>) => void
  api.getTeamResponsibilities.mockReturnValueOnce(new Promise(resolve => { finishOld = resolve }))
    .mockResolvedValue(response(2, 'MKT responsibility', 'mkt-token'))
  api.replaceTeamResponsibilities.mockResolvedValue(response(2, 'MKT edited', 'mkt-new'))
  render(<StructuredResponsibilitiesPanel teamId={7} scope={scope} majorNames={{ 1: 'SE', 2: 'Marketing' }} canEdit onSaved={async () => {}} />)
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } })
  await screen.findByDisplayValue('MKT responsibility')
  await act(async () => { finishOld(response(1, 'SE stale', 'se-token')) })
  expect(screen.queryByDisplayValue('SE stale')).toBeNull()
  fireEvent.change(screen.getByLabelText('Trách nhiệm 1'), { target: { value: 'MKT edited' } })
  fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(api.replaceTeamResponsibilities).toHaveBeenCalledExactlyOnceWith(7, 2, 'mkt-token', [{ content: 'MKT edited', sortOrder: 0 }]))
  await screen.findByText('Đã lưu phân công và cập nhật điều kiện của nhóm.')
})

it('ignores a late failure from the previous major after the current read succeeds', async () => {
  let failOld!: (reason: Error) => void
  api.getTeamResponsibilities.mockReturnValueOnce(new Promise((_resolve, reject) => { failOld = reject }))
    .mockResolvedValue(response(2, 'MKT responsibility', 'mkt-token'))
  render(<StructuredResponsibilitiesPanel teamId={7} scope={scope} majorNames={{ 1: 'SE', 2: 'Marketing' }} canEdit onSaved={async () => {}} />)
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } })
  await screen.findByDisplayValue('MKT responsibility')
  await act(async () => { failOld(new HttpError('Forbidden', 403)) })
  expect(screen.queryByRole('alert')).toBeNull()
  expect(screen.getByDisplayValue('MKT responsibility')).toBeDefined()
})

it('keeps responsibilities readable without offering writes when editing is not allowed', async () => {
  api.getTeamResponsibilities.mockResolvedValue(response(1, 'SE responsibility', 'se-token'))
  render(<StructuredResponsibilitiesPanel teamId={7} scope={scope} majorNames={{ 1: 'SE', 2: 'Marketing' }} canEdit={false} onSaved={async () => {}} />)
  expect(await screen.findByDisplayValue('SE responsibility')).toHaveProperty('disabled', true)
  expect(screen.getByText('Bạn đang ở chế độ chỉ xem phân công.')).toBeDefined()
  expect(screen.queryByRole('button', { name: 'Lưu' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Thêm trách nhiệm' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Xóa' })).toBeNull()
  expect(api.replaceTeamResponsibilities).not.toHaveBeenCalled()
})

it('refreshes the responsibility token after academic scope changes without discarding the draft', async () => {
  api.getTeamResponsibilities.mockResolvedValueOnce(response(1, 'Original', 'old-token'))
    .mockResolvedValue(response(1, 'Original', 'new-token'))
  api.replaceTeamResponsibilities.mockResolvedValue(response(1, 'Draft responsibility', 'saved-token'))
  const props = { teamId: 7, scope, majorNames: { 1: 'SE', 2: 'Marketing' }, canEdit: true, onSaved: async () => {} }
  const view = render(<StructuredResponsibilitiesPanel {...props} />)
  await screen.findByDisplayValue('Original')
  fireEvent.change(screen.getByLabelText('Trách nhiệm 1'), { target: { value: 'Draft responsibility' } })
  view.rerender(<StructuredResponsibilitiesPanel {...props} scope={{ ...scope, concurrencyToken: 'updated-scope' }} />)
  await waitFor(() => expect(api.getTeamResponsibilities).toHaveBeenCalledTimes(2))
  expect(screen.getByDisplayValue('Draft responsibility')).toBeDefined()
  fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(api.replaceTeamResponsibilities).toHaveBeenCalledExactlyOnceWith(7, 1, 'new-token', [{ content: 'Draft responsibility', sortOrder: 0 }]))
})

it('keeps typed rows on a conflict and uses the refreshed token only after another save', async () => {
  api.getTeamResponsibilities.mockResolvedValueOnce(response(1, 'Original', 'old-token'))
    .mockResolvedValue(response(1, 'Other editor content', 'fresh-token'))
  api.replaceTeamResponsibilities.mockRejectedValueOnce(new HttpError('Conflict', 409))
    .mockResolvedValue(response(1, 'My responsibility', 'saved-token'))
  render(<StructuredResponsibilitiesPanel teamId={7} scope={scope} majorNames={{ 1: 'SE', 2: 'Marketing' }} canEdit onSaved={async () => {}} />)
  await screen.findByDisplayValue('Original')
  fireEvent.change(screen.getByLabelText('Trách nhiệm 1'), { target: { value: 'My responsibility' } })
  fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  await screen.findByRole('alert')
  expect(screen.getByDisplayValue('My responsibility')).toBeDefined()
  expect(api.replaceTeamResponsibilities).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(api.replaceTeamResponsibilities).toHaveBeenLastCalledWith(7, 1, 'fresh-token', [{ content: 'My responsibility', sortOrder: 0 }]))
})

it('selects the first available major when scope is configured after mounting', async () => {
  api.getTeamResponsibilities.mockResolvedValue(response(2, 'Marketing work', 'mkt-token'))
  const props = { teamId: 7, scope: { ...scope, requirements: [] }, majorNames: { 1: 'SE', 2: 'Marketing' }, canEdit: true, onSaved: async () => {} }
  const view = render(<StructuredResponsibilitiesPanel {...props} />)
  expect(api.getTeamResponsibilities).not.toHaveBeenCalled()
  view.rerender(<StructuredResponsibilitiesPanel {...props} scope={{ ...scope, requirements: [scope.requirements[1]] }} />)
  await screen.findByDisplayValue('Marketing work')
  expect(api.getTeamResponsibilities).toHaveBeenCalledExactlyOnceWith(7, 2)
  expect(screen.getByRole('combobox')).toHaveProperty('value', '2')
})

it('does not silently drop an empty responsibility on save', async () => {
  api.getTeamResponsibilities.mockResolvedValue(response(1, 'Original', 'token'))
  render(<StructuredResponsibilitiesPanel teamId={7} scope={scope} majorNames={{ 1: 'SE' }} canEdit onSaved={async () => {}} />)
  await screen.findByDisplayValue('Original')
  fireEvent.click(screen.getByRole('button', { name: 'Thêm trách nhiệm' }))
  fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Nhập nội dung cho từng trách nhiệm hoặc xóa dòng đang để trống.')
  expect(screen.getAllByRole('textbox')).toHaveLength(2)
  expect(api.replaceTeamResponsibilities).not.toHaveBeenCalled()
})

it('retains the draft when conflict refresh fails and recovers through an explicit reload', async () => {
  api.getTeamResponsibilities.mockResolvedValueOnce(response(1, 'Original', 'old-token'))
    .mockRejectedValueOnce(new HttpError('Unavailable', 503))
    .mockResolvedValue(response(1, 'Latest server content', 'new-token'))
  api.replaceTeamResponsibilities.mockRejectedValueOnce(new HttpError('Conflict', 409))
    .mockResolvedValue(response(1, 'Unsaved work', 'saved-token'))
  render(<StructuredResponsibilitiesPanel teamId={7} scope={scope} majorNames={{ 1: 'SE' }} canEdit onSaved={async () => {}} />)
  await screen.findByDisplayValue('Original')
  fireEvent.change(screen.getByLabelText('Trách nhiệm 1'), { target: { value: 'Unsaved work' } })
  fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  await screen.findByRole('button', { name: 'Thử tải lại' })
  expect(screen.getByDisplayValue('Unsaved work')).toHaveProperty('disabled', true)
  expect(screen.queryByRole('button', { name: 'Lưu' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Thử tải lại' }))
  await waitFor(() => expect(screen.getByDisplayValue('Unsaved work')).toHaveProperty('disabled', false))
  expect(screen.getByText('Latest server content')).toBeDefined()
  fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(api.replaceTeamResponsibilities).toHaveBeenLastCalledWith(7, 1, 'new-token', [{ content: 'Unsaved work', sortOrder: 0 }]))
})

it('reads the replacement major after the selected major is removed from scope', async () => {
  api.getTeamResponsibilities.mockImplementation((_teamId, majorId) => Promise.resolve(response(majorId, `Major ${majorId}`, `token-${majorId}`)))
  const props = { teamId: 7, scope, majorNames: { 1: 'SE', 2: 'Marketing' }, canEdit: true, onSaved: async () => {} }
  const view = render(<StructuredResponsibilitiesPanel {...props} />)
  await screen.findByDisplayValue('Major 1')
  view.rerender(<StructuredResponsibilitiesPanel {...props} scope={{ ...scope, concurrencyToken: 'new-scope', requirements: [scope.requirements[1]] }} />)
  await screen.findByDisplayValue('Major 2')
  expect(screen.queryByDisplayValue('Major 1')).toBeNull()
  expect(screen.getByRole('combobox')).toHaveProperty('value', '2')
  expect(api.getTeamResponsibilities).toHaveBeenLastCalledWith(7, 2)
})

it('resets the selected major and rows when moving to another team', async () => {
  api.getTeamResponsibilities.mockImplementation((teamId, majorId) => Promise.resolve(response(majorId, `Team ${teamId} major ${majorId}`, `token-${teamId}-${majorId}`)))
  const props = { teamId: 7, scope, majorNames: { 1: 'SE', 2: 'Marketing' }, canEdit: true, onSaved: async () => {} }
  const view = render(<StructuredResponsibilitiesPanel {...props} />)
  await screen.findByDisplayValue('Team 7 major 1')
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } })
  await screen.findByDisplayValue('Team 7 major 2')
  view.rerender(<StructuredResponsibilitiesPanel {...props} teamId={8} />)
  await screen.findByDisplayValue('Team 8 major 1')
  expect(screen.queryByDisplayValue('Team 7 major 2')).toBeNull()
  expect(api.getTeamResponsibilities).toHaveBeenLastCalledWith(8, 1)
})

it('distinguishes a successful save from a failed follow-up refresh', async () => {
  api.getTeamResponsibilities.mockResolvedValue(response(1, 'Original', 'token'))
  api.replaceTeamResponsibilities.mockResolvedValue(response(1, 'Saved work', 'saved-token'))
  const onSaved = vi.fn().mockRejectedValue(new Error('Context unavailable'))
  render(<StructuredResponsibilitiesPanel teamId={7} scope={scope} majorNames={{ 1: 'SE' }} canEdit onSaved={onSaved} />)
  await screen.findByDisplayValue('Original')
  fireEvent.change(screen.getByLabelText('Trách nhiệm 1'), { target: { value: 'Saved work' } })
  fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  await screen.findByText('Phân công đã được lưu.')
  expect(screen.getByDisplayValue('Saved work')).toBeDefined()
  expect(screen.getByRole('alert').textContent).toContain('Chưa tải lại được điều kiện của nhóm')
  expect(api.replaceTeamResponsibilities).toHaveBeenCalledTimes(1)
})

it('keeps a published snapshot read-only and limits editable responsibility input length', async () => {
  api.getTeamResponsibilities.mockResolvedValueOnce({ ...response(1, 'Frozen work', 'token'), isSnapshot: true })
  const view = render(<StructuredResponsibilitiesPanel teamId={7} scope={scope} majorNames={{ 1: 'SE' }} canEdit onSaved={async () => {}} />)
  expect(await screen.findByDisplayValue('Frozen work')).toHaveProperty('disabled', true)
  expect(screen.queryByRole('button', { name: 'Thêm trách nhiệm' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Lưu' })).toBeNull()
  view.unmount()
  api.getTeamResponsibilities.mockResolvedValue(response(1, 'Editable work', 'token'))
  render(<StructuredResponsibilitiesPanel teamId={7} scope={scope} majorNames={{ 1: 'SE' }} canEdit onSaved={async () => {}} />)
  expect(await screen.findByDisplayValue('Editable work')).toHaveProperty('maxLength', 2000)
})
