import { afterEach, describe, expect, it } from 'vitest'
import { getSeenTourVersion, markTourSeen } from './tour-persistence'
import { getTourScript } from './tour-scripts'
import { TOUR_VERSION } from './tour-types'

afterEach(() => {
  try { window.localStorage.clear() } catch { /* ignore */ }
})

describe('tour persistence', () => {
  it('reports an unseen tour as version 0', () => {
    expect(getSeenTourVersion(1, 'student')).toBe(0)
  })

  it('round-trips the seen version per user and role', () => {
    markTourSeen(42, 'student', TOUR_VERSION)
    expect(getSeenTourVersion(42, 'student')).toBe(TOUR_VERSION)
    // A different role for the same user is tracked independently.
    expect(getSeenTourVersion(42, 'lecturer')).toBe(0)
    // A different user does not inherit the flag.
    expect(getSeenTourVersion(7, 'student')).toBe(0)
  })

  it('treats malformed stored values as unseen', () => {
    window.localStorage.setItem('ai-pms:tour:9:student', 'not-a-number')
    expect(getSeenTourVersion(9, 'student')).toBe(0)
  })
})

describe('tour scripts', () => {
  it('provides a script for each workspace role but not for unknown', () => {
    for (const role of ['student', 'lecturer', 'department', 'admin'] as const) {
      const script = getTourScript(role)
      expect(script, role).not.toBeNull()
      expect(script!.steps.length).toBeGreaterThan(0)
    }
    expect(getTourScript('unknown')).toBeNull()
  })

  it('opens the student and lecturer tours with a centred welcome', () => {
    for (const role of ['student', 'lecturer'] as const) {
      const [first] = getTourScript(role)!.steps
      expect(first.placement).toBe('center')
      expect(first.target).toBeUndefined()
    }
  })

  it('gives every step a unique id and non-empty copy', () => {
    for (const role of ['student', 'lecturer', 'department', 'admin'] as const) {
      const steps = getTourScript(role)!.steps
      const ids = steps.map((step) => step.id)
      expect(new Set(ids).size, role).toBe(ids.length)
      for (const step of steps) {
        expect(step.title.length).toBeGreaterThan(0)
        expect(step.body.length).toBeGreaterThan(0)
      }
    }
  })
})
