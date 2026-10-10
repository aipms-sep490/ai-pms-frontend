import { describe, expect, it } from 'vitest'

const modules = {
  ...import.meta.glob(['../**/*.{ts,tsx,css}', '!../**/*.test.{ts,tsx}', '!../index.css'], { query: '?raw', import: 'default', eager: true }),
} as Record<string, string>
const sources = Object.entries(modules)

/** Guards the design-system contract in design-system/ai-pms/MASTER.md against regressions. */
describe('design tokens', () => {
  it('scans the application sources', () => {
    expect(sources.length).toBeGreaterThan(100)
  })

  it('never hard-codes a colour that already has a semantic token', () => {
    const tokenHex = /#(0f5b4e|0a493f|edf3f0|14201d|3d4a46|596863|e5ece8|d7e0dc)(?![0-9a-f])/i
    expect(sources.filter(([, text]) => tokenHex.test(text)).map(([path]) => path)).toEqual([])
  })

  it('keeps every text size at or above 12px', () => {
    const tiny = /text-\[(?:9|10|10\.5|11|11\.5)px\]|font-size:\s*(?:9|10|10\.5|11|11\.5)px/
    expect(sources.filter(([, text]) => tiny.test(text)).map(([path]) => path)).toEqual([])
  })
})
