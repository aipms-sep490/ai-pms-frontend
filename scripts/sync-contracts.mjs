import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve, join, relative } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const backend = resolve(process.env.AI_PMS_BACKEND_DIR ?? join(root, '..', 'ai-pms-backend'))
const ref = process.env.AI_PMS_BACKEND_REF ?? 'origin/develop'
const prefix = 'docs/contracts/cib-v4/examples/'
const destination = join(root, 'src', '__contracts__')
const lockPath = join(root, 'contract-lock.json')
const mode = process.argv[2] === 'check' ? 'check' : 'sync'
const git = (...args) => execFileSync('git', ['-C', backend, ...args], { encoding: 'utf8' }).trim()
const paths = git('ls-tree', '-r', '--name-only', ref, prefix).split(/\r?\n/).filter(path => path.endsWith('.json')).sort()
if (!paths.length) throw new Error(`No BE contract examples at ${ref}:${prefix}`)
const files = Object.fromEntries(paths.map(path => {
  const relativePath = path.slice(prefix.length)
  const content = execFileSync('git', ['-C', backend, 'show', `${ref}:${path}`])
  JSON.parse(content.toString('utf8'))
  return [relativePath, { content, sha256: createHash('sha256').update(content).digest('hex') }]
}))
const lock = { source: prefix, files: Object.fromEntries(Object.entries(files).map(([path, value]) => [path, value.sha256])) }
if (mode === 'sync') {
  mkdirSync(destination, { recursive: true })
  for (const [path, value] of Object.entries(files)) {
    const target = join(destination, path)
    mkdirSync(resolve(target, '..'), { recursive: true })
    writeFileSync(target, value.content)
  }
  for (const path of walk(destination)) if (!(relative(destination, path).replaceAll('\\', '/') in files)) rmSync(path)
  writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n')
  console.log(`Synced ${paths.length} BE examples from ${ref}`)
} else {
  if (!existsSync(lockPath)) throw new Error('contract-lock.json missing; run sync-contracts')
  const saved = JSON.parse(readFileSync(lockPath, 'utf8'))
  if (JSON.stringify(saved) !== JSON.stringify(lock)) throw new Error('BE examples differ from contract-lock.json')
  const vendored = walk(destination).map(path => relative(destination, path).replaceAll('\\', '/')).sort()
  if (JSON.stringify(vendored) !== JSON.stringify(Object.keys(files).sort())) throw new Error('Vendored contract file set differs from BE')
  for (const [path, value] of Object.entries(files)) {
    if (createHash('sha256').update(readFileSync(join(destination, path))).digest('hex') !== value.sha256) throw new Error(`Vendored contract changed: ${path}`)
  }
  console.log(`Checked ${paths.length} BE examples against lock and vendor`)
}
function walk(folder) {
  if (!existsSync(folder)) return []
  return readdirSync(folder, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(folder, entry.name)) : [join(folder, entry.name)])
}
