import { env } from '../../app/config/env'
import type { ApiProblem } from '../../types/api.types'

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

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const problem = await readProblem(response)
    throw new HttpError(
      problem.detail || problem.title || `Request failed with status ${response.status}.`,
      response.status,
      problem,
    )
  }

  if (response.status === 204) {
    return null as unknown as T
  }

  return (await response.json()) as T
}

export async function httpGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method: 'GET',
    headers: getAuthHeaders(),
    signal,
  })
  return handleResponse<T>(response)
}

export async function httpPost<T, B = unknown>(path: string, body?: B, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  })
  return handleResponse<T>(response)
}

export async function httpPut<T, B = unknown>(path: string, body?: B, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  })
  return handleResponse<T>(response)
}

export async function httpPatch<T, B = unknown>(path: string, body?: B, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  })
  return handleResponse<T>(response)
}

export async function httpDelete<T = void>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    signal,
  })
  return handleResponse<T>(response)
}

async function readProblem(response: Response): Promise<ApiProblem> {
  try {
    return (await response.json()) as ApiProblem
  } catch {
    return { status: response.status, title: response.statusText }
  }
}
