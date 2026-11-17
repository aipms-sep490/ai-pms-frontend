import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { HttpError } from '../../services/http/http-client'
import { PeriodCalendarPanel } from './PeriodCalendarPanel'
import * as api from '../academic/api/period-policy-api'

vi.mock('../academic/api/period-policy-api', () => ({ getPeriodCalendar: vi.fn(), savePeriodCalendar: vi.fn(), loadVietnamHolidays: vi.fn() }))
afterEach(() => { cleanup(); vi.clearAllMocks() })

const calendar: api.PeriodCalendar = { projectPeriodId: 5, workingDaysOfWeek: 62,
  workingDaysDescription: 'Thứ 2 đến Thứ 6', holidays: [], concurrencyToken: 'old' }

it('saves the period calendar with its token and verifies the readback', async () => {
  vi.mocked(api.getPeriodCalendar).mockResolvedValueOnce(calendar).mockResolvedValueOnce({ ...calendar, workingDaysOfWeek: 126, concurrencyToken: 'new' })
  vi.mocked(api.savePeriodCalendar).mockResolvedValue({ ...calendar, workingDaysOfWeek: 126, concurrencyToken: 'new' })
  const changed = vi.fn()
  render(<PeriodCalendarPanel periodId={5} onChanged={changed} />)
  fireEvent.click(screen.getByRole('button', { name: 'Xem & cấu hình' }))
  fireEvent.click(await screen.findByLabelText('Thứ 7'))
  fireEvent.click(screen.getByRole('button', { name: 'Lưu lịch kỳ' }))
  await waitFor(() => expect(api.savePeriodCalendar).toHaveBeenCalledWith(5, {
    workingDaysOfWeek: 126, holidays: [], concurrencyToken: 'old',
  }))
  expect(await screen.findByText(/Đã xác minh lịch làm việc/)).toBeTruthy()
  expect(changed).toHaveBeenCalledOnce()
})

it('preserves edits on a stale calendar conflict and blocks baseline loading', async () => {
  vi.mocked(api.getPeriodCalendar).mockResolvedValue(calendar)
  vi.mocked(api.savePeriodCalendar).mockRejectedValue(new HttpError('PERIOD_CALENDAR_STALE', 409))
  render(<PeriodCalendarPanel periodId={5} onChanged={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Xem & cấu hình' }))
  fireEvent.click(await screen.findByLabelText('Thứ 7'))
  expect(screen.getByRole('button', { name: 'Nạp mốc ngày nghỉ mẫu' }).matches(':disabled')).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Lưu lịch kỳ' }))
  expect(await screen.findByText(/Lịch kỳ đã được người khác sửa/)).toBeTruthy()
  expect((screen.getByLabelText('Thứ 7') as HTMLInputElement).checked).toBe(true)
})
