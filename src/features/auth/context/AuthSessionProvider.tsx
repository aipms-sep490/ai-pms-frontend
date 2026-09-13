import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { getCurrentUser, login as requestLogin } from '../api/auth-api'
import { AuthSessionContext } from './auth-session-context'
import type {
  AuthSessionStatus,
  AuthUser,
  LoginCredentials,
  LoginSession,
} from '../types/auth.types'

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<LoginSession | null>(null)
  const [status, setStatus] = useState<AuthSessionStatus>('anonymous')
  const [error, setError] = useState<Error | null>(null)

  const login = useCallback(async (credentials: LoginCredentials) => {
    setStatus('authenticating')
    setError(null)

    try {
      const authenticatedSession = await requestLogin(credentials)
      const user = await getCurrentUser(authenticatedSession.accessToken)

      setSession({ ...authenticatedSession, user })
      setStatus('authenticated')
    } catch (reason: unknown) {
      const authError = reason instanceof Error ? reason : new Error('Authentication request failed.')
      setSession(null)
      setStatus('anonymous')
      setError(authError)
      throw authError
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!session) return

    setStatus('refreshing_profile')
    setError(null)

    try {
      const user: AuthUser = await getCurrentUser(session.accessToken)
      setSession((current) => (current ? { ...current, user } : current))
      setStatus('authenticated')
    } catch (reason: unknown) {
      setStatus('authenticated')
      setError(reason instanceof Error ? reason : new Error('Profile refresh failed.'))
    }
  }, [session])

  const value = useMemo(
    () => ({ session, status, error, login, refreshProfile }),
    [session, status, error, login, refreshProfile],
  )

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
}
