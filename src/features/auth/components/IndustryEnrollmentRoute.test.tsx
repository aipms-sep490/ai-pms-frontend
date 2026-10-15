import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
const button = vi.hoisted(() => vi.fn((_props: { purpose: string; invitationToken: string }) => <p>Google enrollment</p>))
vi.mock('./GoogleLoginButton', () => ({ GoogleLoginButton: button }))
import { IndustryEnrollmentRoute } from './IndustryEnrollmentRoute'
afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); vi.clearAllMocks() })
it('passes the fragment secret only in memory and removes it from the current URL', () => {
  const secret = 'x'.repeat(64)
  window.history.replaceState(null, '', '/industry/enroll#invitation=' + secret)
  const local = vi.spyOn(Storage.prototype, 'setItem')
  render(<IndustryEnrollmentRoute />)
  expect(window.location.hash).toBe('')
  expect(button.mock.calls[0][0]).toEqual({ purpose: 'INDUSTRY_ENROLL', invitationToken: secret })
  expect(local).not.toHaveBeenCalled(); local.mockRestore()
})
it('does not initialize Google for a missing invitation', () => {
  render(<IndustryEnrollmentRoute />)
  expect(screen.getByRole('alert').textContent).toContain('Liên kết mời không hợp lệ')
  expect(button).not.toHaveBeenCalled()
})
