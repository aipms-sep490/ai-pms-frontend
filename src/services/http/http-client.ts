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

export async function httpGet<T>(
  path: string,
  signalOrOptions?: AbortSignal | HttpRequestOptions,
): Promise<T> {
  const options = normalizeOptions(signalOrOptions)
  const response = await fetch(`${env.apiBaseUrl}${path}`, createRequestInit(options))

  return readResponse<T>(response)
}

export async function httpPost<TResponse>(
  path: string,
  body: unknown,
  options?: HttpRequestOptions,
): Promise<TResponse> {
  return sendJson<TResponse>('POST', path, body, options)
}

export async function httpPut<TResponse>(
  path: string,
  body: unknown,
  options?: HttpRequestOptions,
): Promise<TResponse> {
  return sendJson<TResponse>('PUT', path, body, options)
}

export async function httpPatch<TResponse>(
  path: string,
  body: unknown,
  options?: HttpRequestOptions,
): Promise<TResponse> {
  return sendJson<TResponse>('PATCH', path, body, options)
}

export async function httpDelete<TResponse>(path: string, options?: HttpRequestOptions): Promise<TResponse> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, { ...createRequestInit(options), method: 'DELETE' })
  if (response.status === 204) return undefined as TResponse
  return readResponse<TResponse>(response)
}

async function sendJson<TResponse>(
  method: 'POST' | 'PUT' | 'PATCH',
  path: string,
  body: unknown,
  options?: HttpRequestOptions,
): Promise<TResponse> {
  const requestInit = createRequestInit(options)
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...requestInit,
    method,
    headers: {
      ...requestInit.headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
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

  if (options?.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`
  }

  return { headers, signal: options?.signal }
}

async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const problem = await readProblem(response)
    throw new HttpError(problem.detail || problem.title || 'Request failed.', response.status, problem)
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
