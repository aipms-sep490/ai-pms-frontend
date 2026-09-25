/**
 * Frontend view-model vocabulary for the future W7-BE-02 contract.
 * These are not raw API unions and must not be treated as server support.
 */
export const futureCriterionScopes = ['COMMON', 'MAJOR_SPECIFIC', 'INDIVIDUAL'] as const
export type FutureCriterionScope = (typeof futureCriterionScopes)[number]

export interface FutureLayeredEvaluationCapability {
  scope: FutureCriterionScope
  supportedByBackend: false
  requiredTarget: 'PROJECT' | 'MAJOR' | 'STUDENT'
}

export const pendingLayeredEvaluationCapabilities: readonly FutureLayeredEvaluationCapability[] = [
  { scope: 'COMMON', supportedByBackend: false, requiredTarget: 'PROJECT' },
  { scope: 'MAJOR_SPECIFIC', supportedByBackend: false, requiredTarget: 'MAJOR' },
  { scope: 'INDIVIDUAL', supportedByBackend: false, requiredTarget: 'STUDENT' },
]
