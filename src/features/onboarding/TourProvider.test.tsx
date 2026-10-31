import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthSessionContext, type AuthSessionContextValue } from '../auth/context/auth-session-context'
import type { LoginSession } from '../auth/types/auth.types'
import { TourProvider } from './TourProvider'
import { TourLauncher } from './TourLauncher'
import { getSeenTourVersion, getTourProgress } from './tour-persistence'

const makeSession = (roles: string[]): LoginSession => ({
  accessToken: 'a', tokenType: 'Bearer', expiresAtUtc: '2027-01-01T00:00:00Z',
  refreshToken: 'r', refreshTokenExpiresAtUtc: '2027-01-08T00:00:00Z',
  user: { id: 101, email: 'u@fpt.edu.vn', fullName: 'Nguyen Van A', roles },
})

const authValue = (session: LoginSession | null): AuthSessionContextValue => ({
  session, status: session ? 'authenticated' : 'unauthenticated', error: null,
  login: vi.fn(), refreshProfile: vi.fn(), logout: vi.fn(), restoreSession: vi.fn(),
})

const renderShell = (session: LoginSession | null) => render(
  <AuthSessionContext.Provider value={authValue(session)}>
    <div data-tour="sidebar">rail</div>
    <TourProvider><TourLauncher /></TourProvider>
  </AuthSessionContext.Provider>,
)

beforeEach(() => {
  try { window.localStorage.clear() } catch { /* ignore */ }
  vi.useFakeTimers()
  // jsdom has no layout; make shell anchors count as visible for the tour engine.
  Element.prototype.getClientRects = () => ([{ width: 10, height: 10 } as DOMRect] as unknown as DOMRectList)
  Element.prototype.getBoundingClientRect = () => ({ top: 10, left: 10, right: 20, bottom: 20, width: 10, height: 10, x: 10, y: 10, toJSON: () => ({}) } as DOMRect)
})

afterEach(() => {
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
  cleanup()
})

describe('TourProvider', () => {
  it('auto-starts once for a new student and marks the tour seen when finished', async () => {
    renderShell(makeSession(['STUDENT']))
    await act(async () => { await vi.advanceTimersByTimeAsync(800) })

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeTruthy()
    expect(screen.getByText('Chào mừng đến AI-PMS')).toBeTruthy()
    // Missing anchors remain visible as centred fallback steps.
    expect(screen.getByText('1/8')).toBeTruthy()

    act(() => { screen.getByRole('button', { name: 'Tiếp theo' }).click() })
    expect(screen.getByText('Thanh điều hướng đồ án')).toBeTruthy()

    // Advance through any remaining steps until the final one, then finish.
    while (screen.queryByRole('button', { name: 'Tiếp theo' })) {
      act(() => { screen.getByRole('button', { name: 'Tiếp theo' }).click() })
    }
    act(() => { screen.getByRole('button', { name: 'Xong' }).click() })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(getSeenTourVersion(101, 'student')).toBeGreaterThan(0)
    expect(getTourProgress(101, 'student', 1).status).toBe('COMPLETED')
  })

  it('does not auto-start again once the student has seen it', async () => {
    renderShell(makeSession(['STUDENT']))
    await act(async () => { await vi.advanceTimersByTimeAsync(800) })
    act(() => { screen.getByRole('button', { name: 'Bỏ qua' }).click() })
    expect(screen.queryByRole('dialog')).toBeNull()
    cleanup()

    renderShell(makeSession(['STUDENT']))
    await act(async () => { await vi.advanceTimersByTimeAsync(800) })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('lets a returning student replay the tour from the Help button', async () => {
    renderShell(makeSession(['STUDENT']))
    await act(async () => { await vi.advanceTimersByTimeAsync(800) })
    act(() => { screen.getByRole('button', { name: 'Bỏ qua' }).click() })
    expect(screen.queryByRole('dialog')).toBeNull()

    act(() => { screen.getByRole('button', { name: /hướng dẫn/i }).click() })
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('resumes from the dismissed step without auto-opening and keeps fallback content visible', async () => {
    renderShell(makeSession(['STUDENT']))
    await act(async () => { await vi.advanceTimersByTimeAsync(800) })
    act(() => { screen.getByRole('button', { name: 'Tiếp theo' }).click() })
    act(() => { screen.getByRole('button', { name: 'Tiếp theo' }).click() })
    expect(screen.getByText('Bắt đầu từ Tổng quan lộ trình')).toBeTruthy()
    act(() => { screen.getByRole('button', { name: 'Bỏ qua' }).click() })
    expect(getTourProgress(101, 'student', 1)).toMatchObject({ status: 'DISMISSED', lastStepId: 'primary' })
    cleanup()

    renderShell(makeSession(['STUDENT']))
    await act(async () => { await vi.advanceTimersByTimeAsync(800) })
    expect(screen.queryByRole('dialog')).toBeNull()
    act(() => { screen.getByRole('button', { name: /hướng dẫn/i }).click() })
    expect(screen.getByText('Bắt đầu từ Tổng quan lộ trình')).toBeTruthy()
    act(() => { screen.getByRole('button', { name: 'Tiếp theo' }).click() })
    expect(screen.getByText('Tìm nhanh mọi chức năng')).toBeTruthy()
    expect(screen.getByText('Nút tìm nhanh không hiển thị tại đây. Dùng Ctrl + K để tìm chức năng.')).toBeTruthy()
  })

  it('offers no tour and no Help button for an unknown role', async () => {
    renderShell(makeSession([]))
    await act(async () => { await vi.advanceTimersByTimeAsync(800) })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('button', { name: /hướng dẫn/i })).toBeNull()
  })
})
