import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const routerDir = path.join(root, 'src/app/router')
const routerSource = fs.readFileSync(path.join(routerDir, 'index.tsx'), 'utf8')
const lazySource = fs.readFileSync(path.join(routerDir, 'lazy-pages.ts'), 'utf8')
const routes = fs.readFileSync(path.join(root, 'docs/uiux/ROUTE_CENSUS.csv'), 'utf8').trim().split(/\r?\n/)

function parseCsv(line) {
  const cells = []
  let value = '', quoted = false
  for (let index = 0; index < line.length; index++) {
    const character = line[index]
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { value += '"'; index++ }
      else quoted = !quoted
    } else if (character === ',' && !quoted) { cells.push(value); value = '' }
    else value += character
  }
  cells.push(value)
  if (quoted) throw new Error('Unclosed CSV quote')
  return cells
}

function csvCell(value) { return `"${String(value).replaceAll('"', '""')}"` }
function resolveModule(base, moduleName) {
  const stem = path.resolve(base, moduleName)
  for (const suffix of ['.tsx', '.ts', '/index.tsx', '/index.ts']) {
    const candidate = stem + suffix
    if (fs.existsSync(candidate)) return path.relative(root, candidate).replaceAll('\\', '/')
  }
  return null
}

const sourceByComponent = new Map()
const routerAst = ts.createSourceFile('index.tsx', routerSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
for (const statement of routerAst.statements) {
  if (!ts.isImportDeclaration(statement) || !statement.importClause?.namedBindings || !ts.isNamedImports(statement.importClause.namedBindings)) continue
  const file = resolveModule(routerDir, statement.moduleSpecifier.text)
  if (file?.endsWith('/lazy-pages.ts')) continue
  for (const entry of statement.importClause.namedBindings.elements) sourceByComponent.set(entry.name.text, file)
}
for (const match of lazySource.matchAll(/export const (\w+) = lazy\(\(\) => import\('([^']+)'\)/g)) {
  sourceByComponent.set(match[1], resolveModule(routerDir, match[2]))
}

const header = ['Route', 'Roles', 'Component', 'SourceFile', 'DirectWorkspacePage', 'DirectLoadingCue', 'DirectEmptyCue', 'DirectFeedbackCue', 'DirectForm', 'DirectDateInput', 'DirectPreviewCue']
const rows = [header.map(csvCell).join(',')]
const missing = []
for (const line of routes.slice(1)) {
  const [, route, , component, roles] = parseCsv(line)
  const file = sourceByComponent.get(component)
  if (!file) missing.push(`${route} (${component})`)
  const content = file ? fs.readFileSync(path.join(root, file), 'utf8') : ''
  const flags = [
    /<WorkspacePage\b/.test(content),
    /PageLoading|WorkspaceLoadingState|ListLoading|<\w*Loading\b|<ExState\b[^>]*\bloading\b|role=["']status["']/.test(content),
    /WorkspaceEmptyState|EmptyState|FilteredEmpty/.test(content),
    /InlineAlert|ActionVerdict|role=["']alert["']/.test(content),
    /<form\b/.test(content),
    /type=["'](?:date|datetime-local)["']/.test(content),
    /DocumentPreviewModal|previewOfficeFile/.test(content),
  ]
  rows.push([route, roles, component, file ?? '', ...flags.map(flag => flag ? 'YES' : 'NO')].map(csvCell).join(','))
}
const output = path.join(root, 'docs/uiux/SCREEN_SOURCE_CUES.generated.csv')
fs.writeFileSync(output, `${rows.join('\n')}\n`)
if (missing.length) console.warn(`No direct component source for ${missing.length} routes: ${missing.join(', ')}`)
console.log(`Inspected ${routes.length - 1} routes. Written ${output}`)
