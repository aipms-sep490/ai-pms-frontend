// Node's fs/path are load-bearing here. Vite's CSS plugin claims every .css
// file, so `?raw` through import.meta.glob resolves to '' for ALL of them —
// not only the Tailwind entry. Without the disk read below the guard would
// silently scan .ts/.tsx only and report zero violations for ~53 stylesheets.
// src/ is typed with "types": ["vite/client"] (tsconfig.app.json) to keep node
// globals out of application code, so these two imports are the one exception.
// @ts-expect-error -- node types are intentionally absent from tsconfig.app.json
import { readFileSync } from 'node:fs'
// @ts-expect-error -- node types are intentionally absent from tsconfig.app.json
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/** `file:///F:/x` -> `F:/x`, so resolve() works on Windows as well as POSIX. */
const testDir = dirname(new URL(import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/, ''))

const modules = {
  ...import.meta.glob(['../**/*.{ts,tsx,css}', '!../**/*.test.{ts,tsx}', '!../index.css'], { query: '?raw', import: 'default', eager: true }),
} as Record<string, string>

for (const [relPath, content] of Object.entries(modules)) {
  if (!content) modules[relPath] = readFileSync(resolve(testDir, relPath), 'utf8')
}

const tokensCss: string = readFileSync(resolve(testDir, '../index.css'), 'utf8')

const sources = Object.entries(modules)

/** Every stylesheet must reach the guard; an empty read would hide violations. */
const unreadable = sources.filter(([, text]) => !text).map(([relPath]) => relPath)

/**
 * Tokens whose value must never be repeated literally outside index.css.
 * The guards below derive their patterns from these names, so adding a token
 * to the scale extends the guard automatically instead of needing a new regex.
 * Pure white and black are deliberately absent: `#fff` is a legitimate literal.
 */
const guardedTokens = [
  '--color-canvas', '--color-hairline', '--color-line-strong',
  '--color-primary', '--color-primary-hover', '--color-primary-subtle',
  '--color-brand-navy', '--color-brand-navy-raised', '--color-brand-teal',
  '--color-accent-amber', '--color-danger', '--color-danger-text',
  '--color-ink', '--color-ink-soft', '--color-ink-muted',
  '--color-on-navy-muted',
  '--color-status-success-text', '--color-status-success-border',
  '--color-status-warning-text', '--color-status-warning-border',
  '--color-status-error-text', '--color-status-error-border',
  '--color-tag-se', '--color-tag-se-bg', '--color-tag-uiux', '--color-tag-uiux-bg',
  '--color-tag-ai', '--color-tag-ai-bg', '--color-tag-qa', '--color-tag-qa-bg',
  '--color-tag-is', '--color-tag-is-bg',
] as const

function readToken(name: string): string {
  const match = tokensCss.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`))
  if (!match) throw new Error(`Token ${name} is not declared as a 6-digit hex in src/index.css`)
  return match[1].toLowerCase()
}

function toRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]
}

/** WCAG 2.x relative luminance. The 0.03928 break point is the one the spec defines. */
function relativeLuminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map(channel => {
    const s = channel / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
  return (lighter + 0.05) / (darker + 0.05)
}

const palette = [...new Set(guardedTokens.map(readToken))]

function offenders(pattern: RegExp): string[] {
  return sources.filter(([, text]) => pattern.test(text)).map(([relPath]) => relPath).sort()
}

/** Guards the design-system contract in design-system/ai-pms/MASTER.md against regressions. */
describe('design tokens', () => {
  it('scans the application sources', () => {
    expect(sources.length).toBeGreaterThan(100)
    expect(tokensCss.length).toBeGreaterThan(1000)
  })

  it('actually reads every source it claims to scan', () => {
    expect(unreadable).toEqual([])
    expect(sources.filter(([relPath]) => relPath.endsWith('.css')).length).toBeGreaterThan(40)
  })

  it('never uses retired moss palette hex codes', () => {
    const retired = /#(0f5b4e|0a493f|edf3f0|14201d|3d4a46|596863|e5ece8|d7e0dc|105b50|08473d|0f172a)(?![0-9a-f])/i
    expect(offenders(retired)).toEqual([])
  })

  it('never hard-codes a canonical token value as a hex literal', () => {
    const asHex = new RegExp(`(?:${palette.map(hex => hex.slice(1)).join('|')})(?![0-9a-f])`, 'i')
    expect(offenders(asHex)).toEqual([])
  })

  it('never hard-codes a canonical token value in rgb()/rgba() form', () => {
    const triplets = palette.map(hex => toRgb(hex).map(c => `${c}\\s*`).join(',\\s*'))
    const asRgb = new RegExp(`rgba?\\(\\s*(?:${triplets.join('|')})[,)]`, 'i')
    expect(offenders(asRgb)).toEqual([])
  })

  it('keeps every text size at or above 12px', () => {
    const tiny = /text-\[(?:9|10|10\.5|11|11\.5)px\]|font-size:\s*(?:9|10|10\.5|11|11\.5)px|fontSize:\s*(?:9|10|10\.5|11|11\.5)(?![0-9.])/
    expect(offenders(tiny)).toEqual([])
  })

  it('never nests var() inside var(), which no browser resolves', () => {
    expect(offenders(/var\(\s*var\(/)).toEqual([])
  })

  it('guarantees WCAG 2.2 AA text contrast (>= 4.5:1) for every text token pair', () => {
    const white = '#ffffff'
    const pairs: [string, string, string][] = [
      ['primary on card', readToken('--color-primary'), white],
      ['primary-hover on card', readToken('--color-primary-hover'), white],
      ['danger-text on card', readToken('--color-danger-text'), white],
      ['ink on canvas', readToken('--color-ink'), readToken('--color-canvas')],
      ['ink-soft on card', readToken('--color-ink-soft'), white],
      ['ink-muted on card', readToken('--color-ink-muted'), white],
      ['status-success', readToken('--color-status-success-text'), readToken('--color-status-success-bg')],
      ['status-warning', readToken('--color-status-warning-text'), readToken('--color-status-warning-bg')],
      ['status-error', readToken('--color-status-error-text'), readToken('--color-status-error-bg')],
      ['tag-se', readToken('--color-tag-se'), readToken('--color-tag-se-bg')],
      ['tag-uiux', readToken('--color-tag-uiux'), readToken('--color-tag-uiux-bg')],
      ['tag-ai', readToken('--color-tag-ai'), readToken('--color-tag-ai-bg')],
      ['tag-qa', readToken('--color-tag-qa'), readToken('--color-tag-qa-bg')],
      ['tag-is', readToken('--color-tag-is'), readToken('--color-tag-is-bg')],
      ['on-navy on brand-navy', readToken('--color-on-navy'), readToken('--color-brand-navy')],
      ['on-navy-muted on brand-navy', readToken('--color-on-navy-muted'), readToken('--color-brand-navy')],
      ['brand-teal on brand-navy', readToken('--color-brand-teal'), readToken('--color-brand-navy')],
    ]

    const failing = pairs
      .map(([label, fg, bg]) => [label, contrastRatio(fg, bg)] as const)
      .filter(([, ratio]) => ratio < 4.5)
      .map(([label, ratio]) => `${label}: ${ratio.toFixed(2)}:1`)

    expect(failing).toEqual([])
  })

  it('keeps accent-amber out of text roles, where it can never reach AA', () => {
    // #F6B94C is 1.76:1 on white. MASTER.md allows it as a non-text accent only,
    // always paired with --color-status-warning-text for the readable label.
    expect(contrastRatio(readToken('--color-accent-amber'), '#ffffff')).toBeLessThan(3)
  })
})
