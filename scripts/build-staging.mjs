import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'

const defaultApiBaseUrl = 'https://api-staging.khaidz.com/api/v1'
const requestedApiBaseUrl = process.env.VITE_API_BASE_URL?.trim()
  || process.env.VITE_STAGING_API_BASE_URL?.trim()
  || defaultApiBaseUrl

let apiUrl
try {
  apiUrl = new URL(requestedApiBaseUrl)
} catch {
  throw new Error(`VITE_API_BASE_URL must be an absolute URL for staging builds; received: ${requestedApiBaseUrl}`)
}

if (!['http:', 'https:'].includes(apiUrl.protocol) || !apiUrl.hostname
  || apiUrl.pathname.replace(/\/$/, '') !== '/api/v1') {
  throw new Error(
    `VITE_API_BASE_URL must end with /api/v1 and include an origin; received: ${requestedApiBaseUrl}`,
  )
}

const buildEnv = {
  ...process.env,
  VITE_API_BASE_URL: apiUrl.toString().replace(/\/$/, ''),
  VITE_DATA_MODE: 'api',
  VITE_USE_MOCK_REVIEW_GATES: 'false',
}

for (const [script, args] of [
  ['node_modules/typescript/bin/tsc', ['-b']],
  ['node_modules/vite/bin/vite.js', ['build']],
]) {
  const result = spawnSync(process.execPath, [script, ...args], {
    env: buildEnv,
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

mkdirSync('dist', { recursive: true })
writeFileSync('dist/deployment.json', `${JSON.stringify({
  apiBaseUrl: buildEnv.VITE_API_BASE_URL,
  builtAt: new Date().toISOString(),
}, null, 2)}\n`)

console.log(`Staging build completed with API base ${buildEnv.VITE_API_BASE_URL}`)
