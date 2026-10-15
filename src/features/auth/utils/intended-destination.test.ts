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

  it('refuses to loop back to the login page itself', () => {
    expect(resolveIntendedDestination({ from: '/login' })).toBe('/project/workspace')
    expect(resolveIntendedDestination({ from: '/login?next=/x' })).toBe('/project/workspace')
  })

  it('uses a custom fallback when supplied', () => {
    expect(resolveIntendedDestination(null, '/admin/access')).toBe('/admin/access')
  })
})
