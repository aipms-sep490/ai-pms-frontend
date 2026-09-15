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
  login: (credentials: LoginCredentials) => Promise<LoginSession>
  logout: () => void
  refreshProfile: () => Promise<void>
}

export const AuthSessionContext = createContext<AuthSessionContextValue | null>(null)
