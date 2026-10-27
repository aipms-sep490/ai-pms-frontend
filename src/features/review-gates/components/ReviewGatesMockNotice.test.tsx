import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const runtime = vi.hoisted(() => ({ reviewGatesMockEnabled: false }))
vi.mock('../../../app/config/env', () => ({ env: runtime }))
import { ReviewGatesMockNotice } from './ReviewGatesMockNotice'

afterEach(() => { cleanup(); vi.unstubAllEnvs() })

describe('Review Gates sample-data notice', () => {
  it.each([
    { development: true, mock: true, visible: true },
    { development: true, mock: false, visible: false },
    { development: false, mock: true, visible: false },
    { development: false, mock: false, visible: false },
  ])('shows the notice only for explicit development mocks: %j', ({ development, mock, visible }) => {
    vi.stubEnv('DEV', development)
    runtime.reviewGatesMockEnabled = mock
    render(<ReviewGatesMockNotice />)
    expect(screen.queryByRole('status') !== null).toBe(visible)
    if (visible) expect(screen.getByRole('status').textContent).toContain('DỮ LIỆU MẪU · Review Gates.')
  })
})
