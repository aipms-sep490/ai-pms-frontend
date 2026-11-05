import { describe, expect, it } from 'vitest'
import { getTourScript } from './tour-scripts'
import { TOUR_ANCHOR } from './tour-anchors'

function collectTargets(): Set<string> {
  const targets = new Set<string>()
  const sources = import.meta.glob('../../**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
  for (const [path, source] of Object.entries(sources)) {
    if (path.endsWith('.test.tsx')) continue
    for (const match of source.matchAll(/data-tour\s*=\s*\{[^}]*?TOUR_ANCHOR\.(\w+)[^}]*\}/g)) {
      const key = match[1] as keyof typeof TOUR_ANCHOR
      if (key in TOUR_ANCHOR) targets.add(TOUR_ANCHOR[key])
    }
  }
  return targets
}

describe('tour targets', () => {
  it('anchors every scripted step to a real data-tour value in src', () => {
    const targets = collectTargets()
    const roles = ['student', 'lecturer', 'department', 'admin'] as const
    const missing = roles.flatMap(role => getTourScript(role)?.steps.filter(step => step.target && !targets.has(step.target)).map(step => `${role}:${step.id}:${step.target}`) ?? [])
    expect(missing).toEqual([])
  })
  it('uses distinct sidebar and primary anchors for each role', () => {
    for (const role of ['student', 'lecturer', 'department', 'admin'] as const) {
      const steps = getTourScript(role)?.steps ?? []
      expect(steps.find(step => step.id === 'nav')?.target).toBe(TOUR_ANCHOR.sidebar)
      expect(steps.find(step => step.id === 'primary')?.target).toBe(TOUR_ANCHOR.sidebarPrimary)
      expect(steps.find(step => step.id === 'primary')?.fallbackBody).toBeTruthy()
    }
  })
  it('gives every targeted step a useful fallback when its anchor is absent', () => {
    for (const role of ['student', 'lecturer', 'department', 'admin'] as const) {
      const missing = (getTourScript(role)?.steps ?? [])
        .filter(step => step.target && !step.fallbackBody?.trim())
        .map(step => `${role}:${step.id}`)
      expect(missing).toEqual([])
    }
  })
})
