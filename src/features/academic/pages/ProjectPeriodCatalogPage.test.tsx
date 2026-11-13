import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProjectPeriodCatalogPage } from './ProjectPeriodCatalogPage'
import { getProjectPeriods, getSemesters } from '../api/governance-api'

vi.mock('../api/governance-api', () => ({ getProjectPeriods: vi.fn(), getSemesters: vi.fn() }))
vi.mock('../../../app/context', () => ({ useStudentJourney: () => ({ semester: { id: 1 } }) }))
vi.mock('../../auth/context/useAuthSession', () => ({ useAuthSession: () => ({ session: { accessToken: 'test-token' } }) }))

const period = { id: 12, academicSemesterId: 1, semesterCode: 'FA26', semesterName: 'Fall 2026', code: 'REG-26', name: 'Đăng ký đồ án', periodType: 'REGISTRATION', status: 'ACTIVE', startAt: '2026-11-01T00:00:00Z', endAt: '2026-12-01T00:00:00Z' }

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('ProjectPeriodCatalogPage', () => {
  it('shows real registration periods and leads to the current semester team workflow', async () => {
    vi.mocked(getSemesters).mockResolvedValue({ items: [], page: 1, pageSize: 100, totalCount: 0 })
    vi.mocked(getProjectPeriods).mockResolvedValue({ items: [period], page: 1, pageSize: 6, totalCount: 1 } as Awaited<ReturnType<typeof getProjectPeriods>>)
    render(<MemoryRouter><ProjectPeriodCatalogPage /></MemoryRouter>)
    expect(await screen.findByText('Đăng ký đồ án')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Xem nhóm và điều kiện/ }).getAttribute('href')).toBe('/team')
    expect(screen.getByText(/SCOPE-01: Public Directory/)).toBeTruthy()
    expect(getProjectPeriods).toHaveBeenCalledWith('test-token', { search: '', semesterId: undefined, status: 'ACTIVE', periodType: 'REGISTRATION' }, expect.any(AbortSignal), 1, 6)
  })

  it('searches and paginates on the server', async () => {
    vi.mocked(getSemesters).mockResolvedValue({ items: [], page: 1, pageSize: 100, totalCount: 0 })
    vi.mocked(getProjectPeriods).mockImplementation(async (_token, _filters, _signal, page) => ({ items: [period], page, pageSize: 6, totalCount: 12 }) as Awaited<ReturnType<typeof getProjectPeriods>>)
    render(<MemoryRouter><ProjectPeriodCatalogPage /></MemoryRouter>)
    fireEvent.change(screen.getByRole('textbox', { name: /Tìm theo mã/ }), { target: { value: 'AI' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tìm kiếm' }))
    await waitFor(() => expect(getProjectPeriods).toHaveBeenLastCalledWith('test-token', expect.objectContaining({ search: 'AI' }), expect.any(AbortSignal), 1, 6))
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
    await waitFor(() => expect(getProjectPeriods).toHaveBeenLastCalledWith('test-token', expect.objectContaining({ search: 'AI' }), expect.any(AbortSignal), 2, 6))
  })

  it('correctly displays period timing window badges based on start and end dates', async () => {
    const expiredPeriod = { ...period, id: 13, code: 'REG-PAST', name: 'Kỳ đã qua', startAt: '2025-01-01T00:00:00Z', endAt: '2025-02-01T00:00:00Z' }
    const futurePeriod = { ...period, id: 14, code: 'REG-FUT', name: 'Kỳ tương lai', startAt: '2030-01-01T00:00:00Z', endAt: '2030-02-01T00:00:00Z' }

    vi.mocked(getSemesters).mockResolvedValue({ items: [], page: 1, pageSize: 100, totalCount: 0 })
    vi.mocked(getProjectPeriods).mockResolvedValue({ items: [expiredPeriod, futurePeriod], page: 1, pageSize: 6, totalCount: 2 } as Awaited<ReturnType<typeof getProjectPeriods>>)

    render(<MemoryRouter><ProjectPeriodCatalogPage /></MemoryRouter>)
    expect(await screen.findByText('Kỳ đã qua')).toBeTruthy()
    expect(screen.getByText('Đã hết hạn nhận hồ sơ')).toBeTruthy()
    expect(screen.getByText('Kỳ tương lai')).toBeTruthy()
    expect(screen.getByText('Chưa mở nhận hồ sơ')).toBeTruthy()
  })
})
