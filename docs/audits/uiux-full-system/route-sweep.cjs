/* Read-only local browser route sweep. Credentials stay in the caller's file. */
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('@playwright/test')

const auditDir = __dirname
const outputDir = process.env.AIPMS_AUDIT_OUTPUT_DIR || path.resolve(auditDir, '../../../../artifacts/uiux-audit-local-20261115')
const browserUrl = process.env.AIPMS_AUDIT_BASE_URL || 'http://127.0.0.1:5173'
const accountFile = process.env.AIPMS_AUDIT_ACCOUNT_FILE
const role = process.env.AIPMS_AUDIT_ROLE
const runName = process.env.AIPMS_AUDIT_RUN_NAME || 'static'
const routePrefix = process.env.AIPMS_AUDIT_ROUTE_PREFIX || ''
const dynamicOnly = process.env.AIPMS_AUDIT_DYNAMIC_ONLY === 'true'
const replacements = JSON.parse(process.env.AIPMS_AUDIT_REPLACEMENTS_JSON || '{}')
const accountLine = Number(process.env.AIPMS_AUDIT_ACCOUNT_LINE)
const passwordLine = Number(process.env.AIPMS_AUDIT_PASSWORD_LINE || 1)
if (!accountFile || !role || !accountLine || !passwordLine) {
  console.error('Set AIPMS_AUDIT_ACCOUNT_FILE, AIPMS_AUDIT_ROLE and one-based ACCOUNT_LINE/PASSWORD_LINE.')
  process.exit(2)
}

function csvLine(source) {
  const result = []
  let value = ''
  let quoted = false
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    if (char === '"') {
      if (quoted && source[index + 1] === '"') { value += '"'; index += 1 }
      else quoted = !quoted
    } else if (char === ',' && !quoted) { result.push(value); value = '' }
    else value += char
  }
  result.push(value)
  return result
}

const lines = fs.readFileSync(accountFile, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)
const email = (lines[accountLine - 1]?.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/) || [])[0]
const password = lines[passwordLine - 1]?.split(/[:：]/).slice(1).join(':').trim()
if (!email || !password) { console.error('Account or password line does not match the supplied fixture format.'); process.exit(2) }

const inventory = fs.readFileSync(path.join(auditDir, '02-SCREEN-INVENTORY.csv'), 'utf8')
  .replace(/^\uFEFF/, '').trim().split(/\r?\n/)
const columns = csvLine(inventory.shift())
const rows = inventory.map(line => Object.fromEntries(csvLine(line).map((value, index) => [columns[index], value])))
const routes = rows.filter(row => {
  if (dynamicOnly && !row.Route.includes(':')) return false
  if (routePrefix && !row.Route.startsWith(routePrefix)) return false
  if ([...row.Route.matchAll(/:([A-Za-z][A-Za-z0-9]*)\??/g)].some(match => !replacements[match[1]])) return false
  if (row.RouterRoleLabel !== role && !(role === 'shared' && row.RouterRoleLabel === 'Public / Authenticated')) return false
  if (row.Route === '/project/ai' || row.Route === '/academic/assistant' || row.Route === '/project/peer-evaluation') return false
  return true
}).map(row => ({ template: row.Route, route: row.Route.replace(/:([A-Za-z][A-Za-z0-9]*)\??/g, (_, key) => replacements[key]) }))

async function run() {
  const browser = await chromium.launch({ headless: true })
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    await page.goto(`${browserUrl}/login`)
    await page.locator('input[type=email]').fill(email)
    await page.locator('input[type=password]').fill(password)
    await page.locator('button[type=submit]').click()
    await page.waitForURL(url => new URL(url).pathname !== '/login', { timeout: 10000 })
    const results = []
    for (const { template, route } of routes) {
      const pageErrors = []
      const apiErrors = []
      const onError = error => pageErrors.push(error.message.slice(0, 130))
      const onResponse = response => {
        if (response.url().includes('/api/v1/') && response.status() >= 400) {
          apiErrors.push({ path: new URL(response.url()).pathname, status: response.status() })
        }
      }
      page.on('pageerror', onError)
      page.on('response', onResponse)
      let navigationError = ''
      try {
        await page.goto(`${browserUrl}${route}`, { timeout: 12000 })
        await page.waitForTimeout(550)
      } catch (error) { navigationError = error.message.slice(0, 100) }
      const visible = await page.evaluate(() => ({
        path: location.pathname,
        main: Boolean(document.querySelector('main')),
        heading: Boolean(document.querySelector('h1')),
        notFound: Boolean(document.body.textContent?.includes('Đường dẫn không tồn tại')),
        overflow: document.documentElement.scrollWidth > innerWidth,
      }))
      results.push({ template, route, ...visible, navigationError, pageErrors, apiErrors })
      page.off('pageerror', onError)
      page.off('response', onResponse)
    }
    const safeRole = role.replace(/[^a-z0-9-]/gi, '-')
    const safeRun = runName.replace(/[^a-z0-9-]/gi, '-')
    fs.mkdirSync(outputDir, { recursive: true })
    const target = path.join(outputDir, `runtime-${safeRole}-${safeRun}-route-sweep.json`)
    fs.writeFileSync(target, JSON.stringify({ role, viewport: '1440x900', source: 'local FE/BE + configured UAT DB', results }, null, 2))
    console.log(JSON.stringify({ role, visited: results.length,
      redirected: results.filter(row => row.path !== row.route).length,
      notFound: results.filter(row => row.notFound).length,
      pageErrorRoutes: results.filter(row => row.pageErrors.length).length,
      apiErrorRoutes: results.filter(row => row.apiErrors.length).length,
      overflowRoutes: results.filter(row => row.overflow).length,
      navigationErrors: results.filter(row => row.navigationError).length }))
  } finally { await browser.close() }
}

run().catch(error => { console.error(error.message); process.exitCode = 1 })
