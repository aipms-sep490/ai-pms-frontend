import { createContext } from 'react'
import type {
  AuthSessionStatus,
  LoginCredentials,
  LoginSession,
} from '../types/auth.types'

export interface AuthSessionContextValue {
  session: LoginSession | null
  status: AuthSessionStatus
  error: Error | null
  login: (credentials: LoginCredentials) => Promise<void>
  refreshProfile: () => Promise<void>
  logout: () => Promise<void>
  restoreSession: () => Promise<void>
}

export const AuthSessionContext = createContext<AuthSessionContextValue | null>(null)
