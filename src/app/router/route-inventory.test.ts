// @ts-expect-error -- node types are intentionally absent from tsconfig.app.json
import { readFileSync, existsSync } from 'node:fs'
// @ts-expect-error -- node types are intentionally absent from tsconfig.app.json
import { dirname, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

describe('Route Census & Inventory Integrity (Q-01 / F-ROUTE-01)', () => {
  const currentDir = dirname(decodeURIComponent(new URL(import.meta.url).pathname).replace(/^\/(?=[A-Za-z]:)/, ''))
  const rootDir = resolve(currentDir, '../../..')
  const csvPath = resolve(rootDir, 'docs/uiux/ROUTE_CENSUS.csv')
  const mdPath = resolve(rootDir, 'docs/uiux/ROUTE_INVENTORY.generated.md')
  const matrixPath = resolve(rootDir, 'docs/uiux/ROUTE_TEST_MATRIX.md')

  it('generates all 3 route artifacts', () => {
    expect(existsSync(csvPath)).toBe(true)
    expect(existsSync(mdPath)).toBe(true)
    expect(existsSync(matrixPath)).toBe(true)
  })

  it('correctly maps /admin/access without false feature flag (fixes F-ROUTE-01)', () => {
    const csvContent = readFileSync(csvPath, 'utf8')
    const lines = csvContent.split('\n')
    const adminAccessLine = lines.find((l: string) => l.includes('"/admin/access"'))
    expect(adminAccessLine).toBeDefined()
    // Row format: Index,ResolvedPath,RawPath,Component,AllowedRoles,Guard,FeatureFlag,SourceLine
    // Expected: ...,"AdminWorkspacePage","admin","None","None",...
    expect(adminAccessLine).toContain('"admin"')
    expect(adminAccessLine).toContain('"None"')
    expect(adminAccessLine).not.toContain('"env.coldReportEnabled"')
  })

  it('correctly scopes env.industryEnabled to /admin/industry', () => {
    const csvContent = readFileSync(csvPath, 'utf8')
    const lines = csvContent.split('\n')
    const industryLine = lines.find((l: string) => l.includes('"/admin/industry"'))
    expect(industryLine).toBeDefined()
    expect(industryLine).toContain('"admin"')
    expect(industryLine).toContain('"env.industryEnabled"')
  })

  it('correctly isolates env.coldReportEnabled to cold-templates without leaking', () => {
    const csvContent = readFileSync(csvPath, 'utf8')
    const lines = csvContent.split('\n')
    const coldLine = lines.find((l: string) => l.includes('"/department/cold-templates"'))
    expect(coldLine).toBeDefined()
    expect(coldLine).toContain('"env.coldReportEnabled"')

    const topicDetailLine = lines.find((l: string) => l.includes('"/department/topics/:id"'))
    expect(topicDetailLine).toBeDefined()
    expect(topicDetailLine).toContain('"None"')
  })

  it('resolves full nested URL paths for layout children', () => {
    const csvContent = readFileSync(csvPath, 'utf8')
    expect(csvContent).toContain('"/admin/projects/:projectId/result"')
    expect(csvContent).toContain('"/admin/projects/:projectId/evaluators"')
  })

  it('has comprehensive Route x Role x State x API test matrix', () => {
    const matrixContent = readFileSync(matrixPath, 'utf8')
    expect(matrixContent).toContain('/admin/access')
    expect(matrixContent).toContain('AccessEventsController')
    expect(matrixContent).toContain('Loading, Empty/Filtered, Blocked, 401, 403, 404, 409, 5xx/Retry, Success')
  })
})
