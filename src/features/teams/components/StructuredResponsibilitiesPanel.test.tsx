import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { StructuredResponsibilitiesPanel } from './StructuredResponsibilitiesPanel'
import { HttpError } from '../../../services/http/http-client'
import type { TeamAcademicScopeDto } from '../../../types/backend'

const api = vi.hoisted(() => ({ getTeamResponsibilities: vi.fn(), replaceTeamResponsibilities: vi.fn() }))
vi.mock('../../projects/api/discipline-governance-api', () => api)
afterEach(() => { cleanup(); vi.resetAllMocks() })
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
  render(<StructuredResponsibilitiesPanel teamId={7} scope={scope} majorNames={{ 1: 'SE', 2: 'Marketing' }} onSaved={async () => {}} />)
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
  render(<StructuredResponsibilitiesPanel teamId={7} scope={scope} majorNames={{ 1: 'SE', 2: 'Marketing' }} onSaved={async () => {}} />)
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } })
  await screen.findByDisplayValue('MKT responsibility')
  await act(async () => { failOld(new HttpError('Forbidden', 403)) })
  expect(screen.queryByRole('alert')).toBeNull()
  expect(screen.getByDisplayValue('MKT responsibility')).toBeDefined()
})
