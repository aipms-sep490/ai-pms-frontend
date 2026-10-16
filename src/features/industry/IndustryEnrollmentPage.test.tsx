import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { IndustryEnrollmentPage } from './IndustryEnrollmentPage'
import { HttpError } from '../../services/http/http-client'

const api = vi.hoisted(() => ({
  getIndustryGoogleChallenge: vi.fn(),
  enrollIndustryGoogle: vi.fn(),
}))
vi.mock('./industry-api', () => api)

const challenge = {
  challengeId: '11111111-2222-3333-4444-555555555555',
  nonce: 'nonce-12345',
}

beforeEach(() => {
  vi.resetAllMocks()
  api.getIndustryGoogleChallenge.mockResolvedValue(challenge)
})
afterEach(cleanup)

describe('IndustryEnrollmentPage', () => {
  it('shows alert when URL fragment has no invitation token', async () => {
    window.location.hash = ''
    render(
      <MemoryRouter>
        <IndustryEnrollmentPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/Không tìm thấy mã thư mời/)).toBeTruthy()
  })

  it('securely consumes invitation token from URL fragment and strips it from history', async () => {
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState')
    window.location.hash = '#invitation=abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'

    render(
      <MemoryRouter>
        <IndustryEnrollmentPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/Đã nhận diện mã thư mời bảo mật/)).toBeTruthy()
    expect(replaceStateSpy).toHaveBeenCalled()

    // Test enrollment submission
    api.enrollIndustryGoogle.mockResolvedValue({
      token: 'jwt-expert-token',
      user: { id: 15, email: 'expert@techcorp.com', fullName: 'Nguyen Van A', roles: [] },
    })

    const textarea = await screen.findByPlaceholderText(/Dán Google ID Token/)
    fireEvent.change(textarea, { target: { value: 'google-id-token-xyz' } })

    fireEvent.click(screen.getByRole('button', { name: 'Kích hoạt tài khoản Chuyên gia' }))

    await waitFor(() => {
      expect(api.enrollIndustryGoogle).toHaveBeenCalledWith({
        challengeId: '11111111-2222-3333-4444-555555555555',
        idToken: 'google-id-token-xyz',
        invitationToken: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      })
    })

    expect(await screen.findByText(/Kích hoạt tài khoản chuyên gia thành công cho expert@techcorp.com/)).toBeTruthy()
    replaceStateSpy.mockRestore()
  })

  it('displays user friendly message on 401 unauthorized', async () => {
    window.location.hash = '#invitation=token64chars123456789012345678901234567890123456789012345678901234'
    api.enrollIndustryGoogle.mockRejectedValue(new HttpError('Unauthorized', 401))

    render(
      <MemoryRouter>
        <IndustryEnrollmentPage />
      </MemoryRouter>,
    )

    const textarea = await screen.findByPlaceholderText(/Dán Google ID Token/)
    fireEvent.change(textarea, { target: { value: 'google-id-token-xyz' } })

    fireEvent.click(screen.getByRole('button', { name: 'Kích hoạt tài khoản Chuyên gia' }))

    expect(await screen.findByText(/Thư mời hoặc tài khoản Google không hợp lệ/)).toBeTruthy()
  })
})
