import { createContext } from 'react'
import type {
  AuthSessionStatus,
  LoginCredentials,
  LoginSession,
} from '../types/auth.types'
import type { EditableProfile } from '../api/auth-api'

export interface AuthSessionContextValue {
  session: LoginSession | null
  status: AuthSessionStatus
  error: Error | null
  login: (credentials: LoginCredentials) => Promise<LoginSession>
  acceptExternalLogin?: (session: LoginSession) => Promise<LoginSession>
  refreshProfile: () => Promise<void>
  updateProfile?: (profile: EditableProfile) => Promise<void>
  logout: () => void | Promise<void>
  restoreSession: () => Promise<void>
}

export const AuthSessionContext = createContext<AuthSessionContextValue | null>(null)
