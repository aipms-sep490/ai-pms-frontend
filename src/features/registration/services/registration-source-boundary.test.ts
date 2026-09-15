import { describe, expect, it, vi } from 'vitest'

const runtime = vi.hoisted(() => ({ isMockMode: false }))
vi.mock('../../../app/config/env', () => ({ env: runtime }))

import { registrationSourceBoundary } from './registration-source-boundary'

describe('registrationSourceBoundary', () => {
  it('makes the missing API contract explicit without exposing a fake persistence operation', () => {
    runtime.isMockMode = false
    expect(registrationSourceBoundary.capability()).toMatchObject({
      status: 'BE_NEW_CONTRACT_REQUIRED', isPersisted: false,
    })
    expect(Object.keys(registrationSourceBoundary)).toEqual(['capability'])
  })

  it('marks mock mode as a non-persisted preview rather than an API fallback', () => {
    runtime.isMockMode = true
    expect(registrationSourceBoundary.capability()).toMatchObject({
      status: 'MOCK_PREVIEW', isPersisted: false,
    })
    runtime.isMockMode = false
  })
})
