import { readFileSync } from 'node:fs'
import { expect, type APIRequestContext, type APIResponse, type Locator, type Page, test } from '@playwright/test'

export interface SmokeFixtureActor {
  id: number
  email: string
  fullName: string
  role: string
  departmentId: number | null
  majorId: number | null
}

export interface SmokeFixturePeriod {
  id: number
  code: string
  periodType: string
  status: string
}

export interface SmokeFixtureBlueprint {
  id: number
  trackCode: string
  code: string
  status: string
  rubricId: number | null
}

export interface SmokeSupervisorProfile {
  profileId: number
  userId: number
  email: string
}

export interface SmokeFixture {
  databaseName: string
  organizationId: number
  semesterId: number
  itDepartmentId: number
  mktDepartmentId: number
  seMajorId: number
  mktMajorId: number
  periods: SmokeFixturePeriod[]
  blueprints: SmokeFixtureBlueprint[]
  supervisorProfiles?: SmokeSupervisorProfile[]
  actors: SmokeFixtureActor[]
}

export interface LoginSession {
  user: {
    id: number
    email: string
    fullName: string
    roles: string[]
  }
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresAtUtc: string
  refreshTokenExpiresAtUtc: string
}

export const SMOKE_API_ROOT = (process.env.SMOKE_LIVE_API_BASE_URL ?? 'http://127.0.0.1:5088/api/v1').replace(/\/$/, '')

export function isSmokeLiveConfigured(): boolean {
  return Boolean(process.env.SMOKE_LIVE_FIXTURE && (process.env.SMOKE_LIVE_PASSWORD ?? process.env.AIPMS_E2E_PASSWORD))
}

export function skipIfSmokeUnconfigured(): void {
  test.skip(!isSmokeLiveConfigured(), 'Requires SMOKE_LIVE_FIXTURE and SMOKE_LIVE_PASSWORD/AIPMS_E2E_PASSWORD (live SQL Server + API harness).')
}

export function loadSmokeFixture(): SmokeFixture {
  const path = process.env.SMOKE_LIVE_FIXTURE
  if (!path) {
    throw new Error('SMOKE_LIVE_FIXTURE environment variable is not set.')
  }
  return JSON.parse(readFileSync(path, 'utf8')) as SmokeFixture
}

export function actorByEmail(fixture: SmokeFixture, email: string): SmokeFixtureActor {
  const match = fixture.actors.find(a => a.email.toLowerCase() === email.toLowerCase())
  if (!match) {
    throw new Error(`Missing fixture actor: ${email}`)
  }
  return match
}

export function smokePassword(): string {
  const pw = process.env.SMOKE_LIVE_PASSWORD ?? process.env.AIPMS_E2E_PASSWORD
  if (!pw) {
    throw new Error('SMOKE_LIVE_PASSWORD or AIPMS_E2E_PASSWORD must be provided at runtime.')
  }
  return pw
}

export async function apiLogin(request: APIRequestContext, email: string): Promise<LoginSession> {
  const response = await request.post(`${SMOKE_API_ROOT}/auth/login`, {
    data: { email, password: smokePassword() },
  })
  expect(response.status(), `POST /auth/login for ${email}: ${await response.text()}`).toBe(200)
  return (await response.json()) as LoginSession
}

export async function loginViaUi(page: Page, email: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Mật khẩu', { exact: true }).fill(smokePassword())
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page).not.toHaveURL(/\/login$/)
}

export async function openUiAs(page: Page, session: LoginSession, path: string): Promise<void> {
  await page.addInitScript(value => {
    localStorage.setItem('ai-pms.auth-session', JSON.stringify(value))
    localStorage.setItem('token', value.accessToken)
  }, session)
  await page.goto(path)
}

export async function apiJson<T>(
  request: APIRequestContext,
  session: LoginSession,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const headers: Record<string, string> = { Authorization: `Bearer ${session.accessToken}`, ...extraHeaders }
  const response = await request.fetch(`${SMOKE_API_ROOT}${path}`, {
    method,
    headers,
    data: body,
  })
  const text = await response.text()
  expect(response.ok(), `${method} ${path} failed (${response.status()}): ${text}`).toBe(true)
  return text ? (JSON.parse(text) as T) : (undefined as T)
}

export async function apiRaw(
  request: APIRequestContext,
  session: LoginSession,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<APIResponse> {
  return request.fetch(`${SMOKE_API_ROOT}${path}`, {
    method,
    headers: { Authorization: `Bearer ${session.accessToken}` },
    data: body,
  })
}

export async function expectProblem(
  response: APIResponse,
  expectedStatuses: number[],
  expectedCode?: string,
): Promise<void> {
  const text = await response.text()
  expect(expectedStatuses, `Unexpected status ${response.status()} body=${text}`).toContain(response.status())
  if (expectedCode) {
    const parsed = JSON.parse(text) as { code?: string; errorCode?: string; detail?: string }
    const actualCode = parsed.code ?? parsed.errorCode ?? parsed.detail ?? ''
    expect(actualCode).toContain(expectedCode)
  }
}

export function minimalPdfBytes(marker: string): Buffer {
  const content = `%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Count 0 >> endobj\n% ${marker}\n%%EOF\n`
  return Buffer.from(content, 'utf8')
}

/**
 * Verifies WCAG/ISS-X-92 touch/click tap target height >= 44px when visible.
 */
export async function expectTapTargetAtLeast44(locator: Locator, label = 'control'): Promise<void> {
  await expect(locator, `${label} should be visible`).toBeVisible()
  const box = await locator.boundingBox()
  expect(box, `${label} should have boundingBox`).not.toBeNull()
  expect(box!.height, `${label} height (${box!.height}px) must be >= 44px (ISS-X-92)`).toBeGreaterThanOrEqual(44)
}
