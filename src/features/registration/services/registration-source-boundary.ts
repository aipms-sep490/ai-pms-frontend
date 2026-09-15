import { env } from '../../../app/config/env'
import type { RegistrationSourceCapability } from '../types/registration-source.types'

/**
 * Deliberately has no HTTP route. The proposed team registration-source API has
 * not been accepted or implemented by Backend, so API mode must not simulate it.
 */
export interface RegistrationSourceBoundary {
  capability(): RegistrationSourceCapability
}

export const registrationSourceBoundary: RegistrationSourceBoundary = {
  capability: () => env.isMockMode
    ? {
        status: 'MOCK_PREVIEW',
        isPersisted: false,
        message: 'Mock preview only. Registration Source is not persisted or approved.',
      }
    : {
        status: 'BE_NEW_CONTRACT_REQUIRED',
        isPersisted: false,
        message: 'Registration Source is not currently supported by the connected backend.',
      },
}
