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

export async function httpGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    headers: { Accept: 'application/json' },
    signal,
  })

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
