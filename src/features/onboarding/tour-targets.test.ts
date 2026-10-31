import { describe, expect, it } from 'vitest'
import { getTourScript } from './tour-scripts'

function collectTargets(): Set<string> {
  const targets = new Set<string>()
  const sources = import.meta.glob('../../**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
  for (const [path, source] of Object.entries(sources)) {
    if (path.endsWith('.test.tsx')) continue
    for (const match of source.matchAll(/data-tour\s*=\s*["']([^"']+)["']/g)) targets.add(match[1])
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
})
