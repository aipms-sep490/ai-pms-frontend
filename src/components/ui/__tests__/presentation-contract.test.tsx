import { describe, it, expect } from 'vitest'
// @ts-expect-error -- node types are intentionally absent from tsconfig.app.json
import { readFileSync, readdirSync, statSync } from 'node:fs'
// @ts-expect-error -- node types are intentionally absent from tsconfig.app.json
import { resolve, dirname } from 'node:path'

const testDir = dirname(decodeURIComponent(new URL(import.meta.url).pathname).replace(/^\/(?=[A-Za-z]:)/, ''))
const featuresDir = resolve(testDir, '../../../features')

function scanFiles(dir: string, ext = '.tsx'): string[] {
  let results: string[] = []
  const list = readdirSync(dir)
  for (const file of list) {
    const fullPath = resolve(dir, file)
    const stat = statSync(fullPath)
    if (stat && stat.isDirectory()) {
      results = results.concat(scanFiles(fullPath, ext))
    } else if (file.endsWith(ext) && !file.endsWith('.test.tsx')) {
      results.push(fullPath)
    }
  }
  return results
}

describe('Presentation Layer Anti-Drift Contract', () => {
  it('forbids raw HTML <table> in src/features (enforces shared Table primitive)', () => {
    const files = scanFiles(featuresDir)
    const violations: { file: string; line: number; match: string }[] = []

    // Exclude workflow-preview mock playground
    const ignored = ['WorkflowPreviewPage.tsx']

    for (const file of files) {
      if (ignored.some(name => file.endsWith(name))) continue
      const content = readFileSync(file, 'utf8')
      const lines = content.split('\n')
      lines.forEach((line: string, index: number) => {
        // Matches <table but NOT <Table or <TableCell or <TableHeaderCell
        if (/<table[\s>]/i.test(line) && !/<Table[\s>]/.test(line)) {
          violations.push({
            file: file.replace(/.*src[\\/]/, 'src/'),
            line: index + 1,
            match: line.trim(),
          })
        }
      })
    }

    expect(
      violations,
      `Found raw <table> elements outside components/ui! Use <Table> instead:\n${JSON.stringify(violations, null, 2)}`
    ).toEqual([])
  })

  it('guarantees presentation primitives are exported and consistent', async () => {
    const tableMod = await import('../Table')
    expect(tableMod.Table).toBeDefined()
    expect(tableMod.TableHead).toBeDefined()
    expect(tableMod.TableBody).toBeDefined()
    expect(tableMod.TableRow).toBeDefined()
    expect(tableMod.TableHeaderCell).toBeDefined()
    expect(tableMod.TableCell).toBeDefined()

    const verdictMod = await import('../ActionVerdict')
    expect(verdictMod.ActionVerdict).toBeDefined()

    const identityMod = await import('../EntityIdentityStrip')
    expect(identityMod.EntityIdentityStrip).toBeDefined()

    const statMod = await import('../StatTileRow')
    expect(statMod.StatTileRow).toBeDefined()

    const configMod = await import('../ConfigModeFrame')
    expect(configMod.ConfigModeFrame).toBeDefined()

    const emptyMod = await import('../WorkspaceState')
    expect(emptyMod.WorkspaceEmptyState).toBeDefined()
    expect(emptyMod.WorkspaceErrorState).toBeDefined()
    expect(emptyMod.WorkspaceForbiddenState).toBeDefined()
    expect(emptyMod.WorkspaceLoadingState).toBeDefined()
  })
})
