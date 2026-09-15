import { describe, expect, it } from 'vitest'
import { resolveIntendedDestination } from './intended-destination'

describe('resolveIntendedDestination', () => {
  it('keeps an internal return path', () => {
    expect(resolveIntendedDestination({ from: '/project/status/123?tab=history' })).toBe('/project/status/123?tab=history')
  })

  it('rejects external and protocol-relative redirect input', () => {
    expect(resolveIntendedDestination({ from: 'https://evil.example' })).toBe('/project/workspace')
    expect(resolveIntendedDestination({ from: '//evil.example' })).toBe('/project/workspace')
  })
})
