export interface ApiProblem {
  title?: string
  detail?: string
  status?: number
  traceId?: string
  /** Stable backend business-error identifier when the endpoint provides one. */
  code?: string
}
