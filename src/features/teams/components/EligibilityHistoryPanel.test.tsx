import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { EligibilityHistoryPanel } from './EligibilityHistoryPanel'
const api = vi.hoisted(() => ({ getEligibilityCheck: vi.fn(), getEligibilityHistory: vi.fn(), checkEligibility: vi.fn(), lockEligibility: vi.fn() }))
vi.mock('../team-eligibility-api', () => api)
const check = { checkId: 1, result: 'PASS', freshness: 'FRESH', checkedAt: '2026-10-06T00:00:00Z', policyVersion: '1', issues: [] }
beforeEach(() => { api.getEligibilityCheck.mockResolvedValue(check); api.getEligibilityHistory.mockResolvedValue([check]); api.lockEligibility.mockResolvedValue({}) })
afterEach(() => { cleanup(); vi.clearAllMocks() })
async function open() { const details = screen.getByText('Lịch sử kiểm tra điều kiện nhóm').closest('details')!; details.open = true; fireEvent(details, new Event('toggle')); await screen.findByText('Lần gần nhất:', { exact: false }) }
it('loads checks on demand and requires confirmation before locking a team', async () => {
  render(<EligibilityHistoryPanel teamId={2} canCheck canLock onChanged={vi.fn()} />)
  expect(api.getEligibilityCheck).not.toHaveBeenCalled()
  await open(); fireEvent.click(screen.getByRole('button', { name: 'Chốt nhóm' }))
  expect(api.lockEligibility).not.toHaveBeenCalled()
  fireEvent.click(screen.getAllByRole('button', { name: 'Chốt nhóm' })[0])
  await waitFor(() => expect(api.lockEligibility).toHaveBeenCalledWith(2))
})
it('does not offer leader mutations to a member without permission', async () => {
  render(<EligibilityHistoryPanel teamId={2} canCheck={false} canLock={false} onChanged={vi.fn()} />)
  await open()
  expect(screen.queryByRole('button', { name: 'Kiểm tra điều kiện' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Chốt nhóm' })).toBeNull()
})
