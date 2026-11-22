import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { DefenseRoomSchedulerV4Panel } from './DefenseRoomSchedulerV4Panel'

afterEach(cleanup)

it('toggles optional defense room scheduling, previews 45m/60m slots, and triggers standby swap', async () => {
  const onSaveConfig = vi.fn().mockResolvedValue(undefined)
  const onStandbySwap = vi.fn().mockResolvedValue(undefined)
  render(
    <DefenseRoomSchedulerV4Panel
      config={{ periodId: 10, enableDefenseRoomScheduling: false, coldWindowEndAt: null, defenseBufferHours: 12 }}
      standbyPool={[{ id: 1, projectPeriodId: 10, userId: 77, fullName: 'TS. Nguyễn Dự Phòng', majorId: 1, departmentId: 1, isAvailable: true }]}
      onSaveConfig={onSaveConfig}
      onStandbySwap={onStandbySwap}
    />,
  )

  expect(screen.getByText(/Đang tắt \(Non-blocking\)/)).toBeTruthy()
  fireEvent.click(screen.getByLabelText('Bật module chia phòng Defense'))
  fireEvent.click(screen.getByRole('button', { name: 'Đơn ngành (45p · 8 ca/ngày)' }))
  expect(screen.getByText(/08:00–08:45/)).toBeTruthy()
  expect(screen.getByText(/16:00–16:45/)).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Lưu cấu hình phòng' }))
  await waitFor(() => expect(onSaveConfig).toHaveBeenCalledWith({
    enableDefenseRoomScheduling: true,
    coldWindowEndAt: null,
    defenseBufferHours: 12,
  }))

  fireEvent.change(screen.getByLabelText('ID giám khảo bị thay'), { target: { value: '55' } })
  fireEvent.change(screen.getByLabelText('Chọn giám khảo Standby'), { target: { value: '77' } })
  fireEvent.change(screen.getByLabelText('Lý do thay thế giám khảo'), { target: { value: 'Nghỉ ốm đột xuất' } })
  fireEvent.click(screen.getByRole('button', { name: /Thay thế & thu hồi quyền chấm cũ/ }))
  await waitFor(() => expect(onStandbySwap).toHaveBeenCalledWith({
    replacedUserId: 55,
    replacementUserId: 77,
    reason: 'Nghỉ ốm đột xuất',
  }))
})
