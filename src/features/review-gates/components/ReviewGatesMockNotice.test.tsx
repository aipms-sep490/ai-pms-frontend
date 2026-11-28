import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ReviewGatesMockNotice } from './ReviewGatesMockNotice'

afterEach(() => { cleanup() })

describe('Review Gates sample-data notice (TK-W2-08)', () => {
  it('never renders a mock/sandbox banner now that Review Gates always use the live API', () => {
    render(<ReviewGatesMockNotice />)
    expect(screen.queryByRole('status')).toBeNull()
  })
})
