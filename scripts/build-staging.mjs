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
  VITE_ENABLE_AI_ACADEMIC_ASSISTANT: 'true',
  VITE_ENABLE_AI_ADVISORY: 'true',
  VITE_ENABLE_AI_DELIVERABLE_REVIEW: 'true',
  // Keep the deployed assistant's progress/risk tab available. This must be
  // explicit because .env.example intentionally keeps advisory AI opt-in.
  VITE_ENABLE_AI_PROGRESS_RISK: 'true',
  // Staging rollout: expose every registered capability. Backend permissions
  // and endpoint availability still remain the final authorization gate.
  VITE_ENABLE_VIDEO_MEETING: 'true',
  VITE_ENABLE_CHAT: 'true',
  VITE_ENABLE_CHAT_ATTACHMENTS: 'true',
  VITE_ENABLE_JIRA_SPRINT: 'true',
  VITE_ENABLE_MEETING_COLLABORATION: 'true',
  VITE_ENABLE_GATES: 'true',
  VITE_ENABLE_WORKING_AGREEMENT: 'true',
  VITE_ENABLE_UNIFIED_CAPABILITIES: 'true',
  VITE_ENABLE_TASK_MAJOR_FILTER: 'true',
  VITE_ENABLE_AI_RUN_HISTORY: 'true',
  VITE_ENABLE_SUPERVISOR_RECOMMENDATION: 'true',
  VITE_ENABLE_DEFENSE: 'true',
  VITE_ENABLE_ROOM_PLANNER: 'true',
  VITE_ENABLE_COLD_REPORT: 'true',
  VITE_ENABLE_WEEKLY_ASSESSMENT: 'true',
  VITE_ENABLE_PEER_EVAL: 'true',
  VITE_ENABLE_RESULT_CORRECTION: 'true',
  VITE_ENABLE_INDUSTRY: 'true',
  VITE_ENABLE_LEAD_PUBLISH: 'true',
  VITE_ENABLE_RBAC_WRITE: 'true',
  // Workflow preview only applies in mock mode; staging remains API-backed.
  VITE_ENABLE_WORKFLOW_PREVIEW: 'true',
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
