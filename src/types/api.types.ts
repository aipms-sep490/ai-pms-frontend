export interface ApiProblem {
  title?: string
  detail?: string
  status?: number
  traceId?: string
  /** Stable backend business-error identifier when the endpoint provides one. */
  code?: string
  errors?: Record<string, string[]>
  /** BE-05 may include its authoritative upload limit on a 413 response. */
  maxBytes?: number
  maxBytesLabel?: string
}
