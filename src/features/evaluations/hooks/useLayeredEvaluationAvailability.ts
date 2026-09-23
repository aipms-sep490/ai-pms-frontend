import { pendingLayeredEvaluationCapabilities } from '../types/layered-evaluation'

/** No endpoint is queried until W7-BE-02 publishes a layered contract. */
export function useLayeredEvaluationAvailability() {
  return {
    capabilities: pendingLayeredEvaluationCapabilities,
    backendStatus: 'FE_DONE_BE_PENDING' as const,
    canEnterScores: false,
  }
}
