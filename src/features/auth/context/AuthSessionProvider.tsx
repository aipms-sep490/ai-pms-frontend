import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getCurrentUser, login as requestLogin } from '../api/auth-api'
import { AuthSessionContext } from './auth-session-context'
import type {
  AuthSessionStatus,
  AuthUser,
  LoginCredentials,
  LoginSession,
} from '../types/auth.types'

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const [session, setSession] = useState<LoginSession | null>(null)
  const [status, setStatus] = useState<AuthSessionStatus>(storedToken ? 'authenticating' : 'anonymous')
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!storedToken) return
    let cancelled = false

    getCurrentUser(storedToken)
      .then((user) => {
        if (cancelled) return
        setSession({
          accessToken: storedToken,
          tokenType: 'Bearer',
          expiresAtUtc: '',
          refreshToken: '',
          refreshTokenExpiresAtUtc: '',
          user,
        })
        setStatus('authenticated')
      })
      .catch((reason: unknown) => {
        if (cancelled) return
        localStorage.removeItem('token')
        setSession(null)
        setStatus('anonymous')
        setError(reason instanceof Error ? reason : new Error('Session restoration failed.'))
      })

    return () => {
      cancelled = true
    }
  }, [storedToken])

  const login = useCallback(async (credentials: LoginCredentials) => {
    setStatus('authenticating')
    setError(null)

    try {
      const authenticatedSession = await requestLogin(credentials)
      if (typeof window !== 'undefined' && authenticatedSession.accessToken) {
        localStorage.setItem('token', authenticatedSession.accessToken)
      }
      const user = await getCurrentUser(authenticatedSession.accessToken)

      setSession({ ...authenticatedSession, user })
      setStatus('authenticated')
      return { ...authenticatedSession, user }
    } catch (reason: unknown) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
      }
      const authError = reason instanceof Error ? reason : new Error('Authentication request failed.')
      setSession(null)
      setStatus('anonymous')
      setError(authError)
      throw authError
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setSession(null)
    setStatus('anonymous')
    setError(null)
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
    () => ({ session, status, error, login, logout, refreshProfile }),
    [session, status, error, login, logout, refreshProfile],
  )

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
}
