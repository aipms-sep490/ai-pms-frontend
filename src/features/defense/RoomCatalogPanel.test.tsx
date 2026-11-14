import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { HttpError } from '../../services/http/http-client'
import { RoomCatalogPanel } from './RoomCatalogPanel'
import * as api from './defense-api'

vi.mock('./defense-api', () => ({ createRoom: vi.fn(), updateRoom: vi.fn(), deactivateRoom: vi.fn(), getRooms: vi.fn() }))
afterEach(() => { cleanup(); vi.clearAllMocks() })

const room: api.RoomDto = { id: 7, code: 'A-201', building: 'A', floor: 2, capacity: 40, status: 'ACTIVE', concurrencyToken: 'old' }

it('saves an edited room with its token and checks the catalog readback', async () => {
  vi.mocked(api.updateRoom).mockResolvedValue({ ...room, capacity: 45, concurrencyToken: 'new' })
  vi.mocked(api.getRooms).mockResolvedValue([{ ...room, capacity: 45, concurrencyToken: 'new' }])
  const changed = vi.fn()
  render(<RoomCatalogPanel rooms={[room]} onChanged={changed} />)
  fireEvent.click(screen.getByRole('button', { name: 'Quản lý phòng' }))
  fireEvent.click(screen.getByRole('button', { name: 'Sửa' }))
  fireEvent.change(screen.getByLabelText('Sức chứa'), { target: { value: '45' } })
  fireEvent.click(screen.getByRole('button', { name: 'Lưu phòng' }))
  await waitFor(() => expect(api.updateRoom).toHaveBeenCalledWith(7, expect.objectContaining({ capacity: 45, concurrencyToken: 'old' })))
  expect(await screen.findByText(/Đã xác minh phòng A-201/)).toBeTruthy()
  expect(changed).toHaveBeenCalledOnce()
})

it('preserves the room draft when the backend rejects a stale token', async () => {
  vi.mocked(api.updateRoom).mockRejectedValue(new HttpError('ROOM_STALE', 409))
  render(<RoomCatalogPanel rooms={[room]} onChanged={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Quản lý phòng' }))
  fireEvent.click(screen.getByRole('button', { name: 'Sửa' }))
  fireEvent.change(screen.getByLabelText('Sức chứa'), { target: { value: '45' } })
  fireEvent.click(screen.getByRole('button', { name: 'Lưu phòng' }))
  expect(await screen.findByText(/Phòng hoặc lịch đã thay đổi/)).toBeTruthy()
  expect((screen.getByLabelText('Sức chứa') as HTMLInputElement).value).toBe('45')
})
