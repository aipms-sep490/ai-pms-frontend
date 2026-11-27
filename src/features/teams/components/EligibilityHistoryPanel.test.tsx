import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { EligibilityHistoryPanel } from './EligibilityHistoryPanel'
const api = vi.hoisted(() => ({ getEligibilityCheck: vi.fn(), getEligibilityHistory: vi.fn(), checkEligibility: vi.fn(), lockEligibility: vi.fn() }))
vi.mock('../team-eligibility-api', () => api)
const check = { checkId: 1, result: 'PASS', freshness: 'FRESH', checkedAt: '2026-10-06T00:00:00Z', policyVersion: '1', issues: [] }
beforeEach(() => { api.getEligibilityCheck.mockResolvedValue(check); api.getEligibilityHistory.mockResolvedValue([check]); api.checkEligibility.mockResolvedValue(check) })
afterEach(() => { cleanup(); vi.clearAllMocks() })
async function open() { const details = screen.getByText('Lịch sử kiểm tra điều kiện nhóm').closest('details')!; details.open = true; fireEvent(details, new Event('toggle')); await screen.findByText('Lần gần nhất:', { exact: false }) }
it('loads checks on demand, hides manual student lock (TK-W1-11), and allows re-checking eligibility', async () => {
  const onChanged = vi.fn()
  render(<EligibilityHistoryPanel teamId={2} canCheck onChanged={onChanged} />)
  expect(api.getEligibilityCheck).not.toHaveBeenCalled()
  await open()
  expect(screen.queryByRole('button', { name: 'Chốt nhóm' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra điều kiện' }))
  await waitFor(() => expect(api.checkEligibility).toHaveBeenCalledWith(2))
  expect(onChanged).toHaveBeenCalled()
})
it('does not offer leader mutations to a member without permission', async () => {
  render(<EligibilityHistoryPanel teamId={2} canCheck={false} onChanged={vi.fn()} />)
  await open()
  expect(screen.queryByRole('button', { name: 'Kiểm tra điều kiện' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Chốt nhóm' })).toBeNull()
})
