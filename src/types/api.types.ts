export interface ApiProblemBlocker {
  code: string
  message: string
  target?: string | null
}

export interface ApiProblem {
  type?: string
  title?: string
  detail?: string
  message?: string
  status?: number
  instance?: string
  traceId?: string
  correlationId?: string
  /** Stable backend business-error identifier when the endpoint provides one. */
  code?: string
  /** Legacy alias of code retained for backward compatibility. */
  errorCode?: string
  errors?: Record<string, string[]>
  fieldErrors?: Record<string, string[]>
  blockingRequirements?: ApiProblemBlocker[]
  currentState?: string
  expectedState?: string
  policyVersion?: string
  retryable?: boolean
  /** BE-05 may include its authoritative upload limit on a 413 response. */
  maxBytes?: number
  maxBytesLabel?: string
}
