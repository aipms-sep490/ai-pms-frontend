import { env } from '../../app/config/env'
import type { ApiProblem } from '../../types/api.types'

export interface HttpRequestOptions {
  signal?: AbortSignal
  accessToken?: string
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
  const response = await fetch(resolveUrl(path), {
    ...createRequestInit(options),
    method: 'GET',
  })

  return readResponse<T>(response)
}

export async function httpPost<TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
  signalOrOptions?: AbortSignal | HttpRequestOptions,
): Promise<TResponse> {
  const options = normalizeOptions(signalOrOptions)
  return sendJson<TResponse>('POST', path, body, options)
}

export async function httpPut<TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
  signalOrOptions?: AbortSignal | HttpRequestOptions,
): Promise<TResponse> {
  const options = normalizeOptions(signalOrOptions)
  return sendJson<TResponse>('PUT', path, body, options)
}

export async function httpPatch<TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
  signalOrOptions?: AbortSignal | HttpRequestOptions,
): Promise<TResponse> {
  const options = normalizeOptions(signalOrOptions)
  return sendJson<TResponse>('PATCH', path, body, options)
}

export async function httpDelete<TResponse = void>(
  path: string,
  signalOrOptions?: AbortSignal | HttpRequestOptions,
): Promise<TResponse> {
  const options = normalizeOptions(signalOrOptions)
  const response = await fetch(resolveUrl(path), {
    ...createRequestInit(options),
    method: 'DELETE',
  })
  return readResponse<TResponse>(response)
}

async function sendJson<TResponse>(
  method: 'POST' | 'PUT' | 'PATCH',
  path: string,
  body: unknown,
  options?: HttpRequestOptions,
): Promise<TResponse> {
  const requestInit = createRequestInit(options)
  const response = await fetch(resolveUrl(path), {
    ...requestInit,
    method,
    headers: {
      ...requestInit.headers,
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  return readResponse<TResponse>(response)
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
