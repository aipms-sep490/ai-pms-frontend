import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { loadEnv } from 'vite'

// Only public VITE_ settings belong in browser bundles. Secrets stay on the backend.
const defaults = Object.fromEntries(readFileSync('.env.example', 'utf8').split(/\r?\n/)
  .filter(line => /^VITE_[A-Z0-9_]+=/.test(line))
  .map(line => { const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1)] }))
const buildEnv = {
  ...process.env, ...defaults, ...loadEnv('production', process.cwd(), 'VITE_'),
  VITE_API_BASE_URL: 'https://api-staging.khaidz.com/api/v1',
  VITE_DATA_MODE: 'api', VITE_USE_MOCK_REVIEW_GATES: 'false',
  VITE_ENABLE_AI_ACADEMIC_ASSISTANT: 'true', VITE_ENABLE_WORKFLOW_PREVIEW: 'false',
}
for (const script of ['node_modules/typescript/bin/tsc', 'node_modules/vite/bin/vite.js']) {
  const args = script.includes('typescript') ? ['-b'] : ['build']
  const result = spawnSync(process.execPath, [script, ...args], { env: buildEnv, stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
const revision = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' })
if (revision.status !== 0) throw new Error('Cannot identify build revision')
writeFileSync('dist/deployment.json', JSON.stringify({
  revision: revision.stdout.trim(), builtAt: new Date().toISOString(),
  apiBaseUrl: buildEnv.VITE_API_BASE_URL,
  flags: Object.fromEntries(Object.entries(buildEnv).filter(([key]) => key.startsWith('VITE_ENABLE_'))),
}, null, 2))
