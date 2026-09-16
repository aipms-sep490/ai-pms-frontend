import { env } from '../../app/config/env'
import type { ApiProblem } from '../../types/api.types'

export interface HttpRequestOptions {
  signal?: AbortSignal
  accessToken?: string
  /** Auth endpoints and the one retried request must never recurse into refresh. */
  skipAuthRefresh?: boolean
}

export interface HttpAuthenticationBridge {
  /** Returns a fresh access token or rejects when the session cannot be restored. */
  refresh: () => Promise<string>
  /** Clears provider-owned state after the shared refresh attempt fails. */
  onSessionExpired: () => void
}

export class HttpError extends Error {
  readonly status: number
  readonly problem?: ApiProblem

  constructor(
    message: string,
    status: number,
    problem?: ApiProblem,
  ) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.problem = problem
  }
}

let authenticationBridge: HttpAuthenticationBridge | null = null
let refreshInFlight: Promise<string | null> | null = null

/**
 * Connects the shared HTTP client to the existing AuthSessionProvider without creating a
 * second token store. The returned cleanup prevents a stale provider from handling 401s.
 */
export function configureHttpAuthentication(bridge: HttpAuthenticationBridge): () => void {
  authenticationBridge = bridge
  return () => {
    if (authenticationBridge === bridge) authenticationBridge = null
  }
}

function resolveUrl(path: string): string {
  const base = env.apiBaseUrl.replace(/\/$/, '')
  if (base.endsWith('/v1') && path.startsWith('/v1/')) {
    return `${base}${path.slice(3)}`
  }
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export async function httpGet<T>(
  path: string,
  signalOrOptions?: AbortSignal | HttpRequestOptions,
): Promise<T> {
  const options = normalizeOptions(signalOrOptions)
  return send<T>('GET', path, undefined, options)
}

export async function httpPost<TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
  signalOrOptions?: AbortSignal | HttpRequestOptions,
): Promise<TResponse> {
  const options = normalizeOptions(signalOrOptions)
  return send<TResponse>('POST', path, body, options)
}

export async function httpPut<TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
  signalOrOptions?: AbortSignal | HttpRequestOptions,
): Promise<TResponse> {
  const options = normalizeOptions(signalOrOptions)
  return send<TResponse>('PUT', path, body, options)
}

export async function httpPatch<TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
  signalOrOptions?: AbortSignal | HttpRequestOptions,
): Promise<TResponse> {
  const options = normalizeOptions(signalOrOptions)
  return send<TResponse>('PATCH', path, body, options)
}

export async function httpDelete<TResponse = void>(
  path: string,
  signalOrOptions?: AbortSignal | HttpRequestOptions,
): Promise<TResponse> {
  const options = normalizeOptions(signalOrOptions)
  return send<TResponse>('DELETE', path, undefined, options)
}

async function send<TResponse>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body: unknown | undefined,
  options?: HttpRequestOptions,
  hasRetriedAfterRefresh = false,
): Promise<TResponse> {
  const requestInit = createRequestInit(options)
  const response = await fetch(resolveUrl(path), {
    ...requestInit,
    method,
    headers: body === undefined
      ? requestInit.headers
      : { ...requestInit.headers, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (response.status === 401 && !options?.skipAuthRefresh && !hasRetriedAfterRefresh) {
    const refreshedAccessToken = await refreshAccessToken()
    if (refreshedAccessToken) {
      return send<TResponse>(
        method,
        path,
        body,
        { ...options, accessToken: refreshedAccessToken, skipAuthRefresh: true },
        true,
      )
    }
  }

  return readResponse<TResponse>(response)
}

async function refreshAccessToken(): Promise<string | null> {
  const bridge = authenticationBridge
  if (!bridge) return null

  if (!refreshInFlight) {
    refreshInFlight = bridge.refresh()
      .catch(() => {
        bridge.onSessionExpired()
        return null
      })
      .finally(() => {
        refreshInFlight = null
      })
  }

  return refreshInFlight
}

function normalizeOptions(
  signalOrOptions?: AbortSignal | HttpRequestOptions,
): HttpRequestOptions | undefined {
  if (!signalOrOptions || signalOrOptions instanceof AbortSignal) {
    return signalOrOptions ? { signal: signalOrOptions } : undefined
  }

  return signalOrOptions
}

function createRequestInit(options?: HttpRequestOptions): RequestInit {
  const headers: Record<string, string> = { Accept: 'application/json' }

  const token = options?.accessToken ?? (typeof window !== 'undefined' ? localStorage.getItem('token') : null)
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return { headers, signal: options?.signal }
}

async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const problem = await readProblem(response)
    throw new HttpError(
      problem.detail || problem.title || `Request failed with status ${response.status}.`,
      response.status,
      problem,
    )
  }

  if (response.status === 204) {
    return (null as unknown) as T
  }

  return (await response.json()) as T
}

async function readProblem(response: Response): Promise<ApiProblem> {
  try {
    return (await response.json()) as ApiProblem
  } catch {
    return { status: response.status, title: response.statusText }
  }
}
