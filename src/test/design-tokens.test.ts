// @ts-ignore
import fs from 'node:fs'
// @ts-ignore
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// @ts-ignore
const currentDir: string = typeof __dirname !== 'undefined' ? __dirname : import.meta.dirname
const indexCss: string = fs.readFileSync(path.resolve(currentDir, '../index.css'), 'utf8')

const modules = {
  ...import.meta.glob(['../**/*.{ts,tsx,css}', '!../**/*.test.{ts,tsx}', '!../index.css'], { query: '?raw', import: 'default', eager: true }),
} as Record<string, string>

for (const [relPath, content] of Object.entries(modules)) {
  if (!content) {
    modules[relPath] = fs.readFileSync(path.resolve(currentDir, relPath), 'utf8')
  }
}

const sources = Object.entries(modules)

function parseHex(hex: string): [number, number, number] {
  const match = hex.replace(/^#/, '')
  const r = parseInt(match.substring(0, 2), 16)
  const g = parseInt(match.substring(2, 4), 16)
  const b = parseInt(match.substring(4, 6), 16)
  return [r, g, b]
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [lr, lg, lb] = [r, g, b].map(c => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
}

function contrastRatio(hex1: string, hex2: string): number {
  const [r1, g1, b1] = parseHex(hex1)
  const [r2, g2, b2] = parseHex(hex2)
  const l1 = relativeLuminance(r1, g1, b1)
  const l2 = relativeLuminance(r2, g2, b2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

function extractCssVar(css: string, varName: string): string {
  const match = css.match(new RegExp(`${varName}:\\s*(#[0-9a-fA-F]{6})`))
  if (!match) throw new Error(`Variable ${varName} not found in index.css`)
  return match[1]
}

/** Guards the design-system contract in design-system/ai-pms/MASTER.md against regressions. */
describe('design tokens', () => {
  it('scans the application sources', () => {
    expect(sources.length).toBeGreaterThan(100)
  })

  it('never uses retired moss palette hex codes', () => {
    const retiredPaletteHex = /#(0f5b4e|0a493f|edf3f0|14201d|3d4a46|596863|e5ece8|d7e0dc)(?![0-9a-f])/i
    expect(sources.filter(([, text]) => retiredPaletteHex.test(text)).map(([relPath]) => relPath)).toEqual([])
  })

  it('never hard-codes a colour that already has a canonical semantic token', () => {
    const tokenHex = /#(087d77|06665f|ddf7f4|0f2747|12b3a8|f6b94c|e35d6a|b42318|162033|64748b|d9e1ec|cbd5e1|f6f8fb|0a766f|b45309)(?![0-9a-f])/i
    expect(sources.filter(([, text]) => tokenHex.test(text)).map(([relPath]) => relPath)).toEqual([])
  })

  it('keeps every text size at or above 12px', () => {
    const tiny = /text-\[(?:9|10|10\.5|11|11\.5)px\]|font-size:\s*(?:9|10|10\.5|11|11\.5)px/
    expect(sources.filter(([, text]) => tiny.test(text)).map(([relPath]) => relPath)).toEqual([])
  })

  it('guarantees WCAG 2.1 AA text contrast (>= 4.5:1) for primary and status tokens', () => {
    const primary = extractCssVar(indexCss, '--color-primary')
    const dangerText = extractCssVar(indexCss, '--color-danger-text')
    const statusErrorText = extractCssVar(indexCss, '--color-status-error-text')
    const statusErrorBg = extractCssVar(indexCss, '--color-status-error-bg')
    const statusWarningText = extractCssVar(indexCss, '--color-status-warning-text')
    const statusWarningBg = extractCssVar(indexCss, '--color-status-warning-bg')
    const tagQaText = extractCssVar(indexCss, '--color-tag-qa')
    const tagQaBg = extractCssVar(indexCss, '--color-tag-qa-bg')

    expect(contrastRatio(primary, '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(dangerText, '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(statusErrorText, statusErrorBg)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(statusWarningText, statusWarningBg)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(tagQaText, tagQaBg)).toBeGreaterThanOrEqual(4.5)
  })
})
