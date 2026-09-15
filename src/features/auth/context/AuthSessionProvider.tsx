import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  getCurrentUser,
  login as requestLogin,
  logout as requestLogout,
  refresh as requestRefresh,
} from '../api/auth-api'
import { AuthSessionContext } from './auth-session-context'
import type {
  AuthSessionStatus,
  AuthUser,
  LoginCredentials,
  LoginSession,
} from '../types/auth.types'
import { HttpError, configureHttpAuthentication } from '../../../services/http/http-client'

const SESSION_STORAGE_KEY = 'ai-pms.auth-session'

function readStoredSession(): LoginSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<LoginSession>
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.expiresAtUtc || !parsed.refreshTokenExpiresAtUtc) return null
    return parsed as LoginSession
  } catch {
    return null
  }
}

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<LoginSession | null>(null)
  const [status, setStatus] = useState<AuthSessionStatus>('restoring')
  const [error, setError] = useState<Error | null>(null)
  const sessionRef = useRef<LoginSession | null>(null)

  const persistSession = useCallback((nextSession: LoginSession) => {
    sessionRef.current = nextSession
    setSession(nextSession)
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', nextSession.accessToken)
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession))
    }
  }, [])

  const clearSession = useCallback((nextStatus: AuthSessionStatus = 'unauthenticated') => {
    sessionRef.current = null
    setSession(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
      localStorage.removeItem(SESSION_STORAGE_KEY)
    }
    setStatus(nextStatus)
  }, [])

  const refreshSession = useCallback(async (): Promise<string> => {
    const current = sessionRef.current ?? readStoredSession()
    if (!current?.refreshToken) throw new HttpError('No refresh session is available.', 401)

    setStatus('refreshing')
    setError(null)
    const refreshed = await requestRefresh(current.refreshToken)
    const user = await getCurrentUser(refreshed.accessToken, undefined, true)
    const nextSession = { ...refreshed, user }
    persistSession(nextSession)
    setStatus('authenticated')
    return nextSession.accessToken
  }, [persistSession])

  const restoreSession = useCallback(async () => {
    setStatus('restoring')
    setError(null)
    const stored = readStoredSession()
    if (!stored) {
      clearSession('unauthenticated')
      return
    }

    sessionRef.current = stored
    try {
      const user = await getCurrentUser(stored.accessToken, undefined, true)
      persistSession({ ...stored, user })
      setStatus('authenticated')
    } catch (reason: unknown) {
      if (!(reason instanceof HttpError) || reason.status !== 401) {
        setSession(null)
        setStatus('auth_error')
        setError(reason instanceof Error ? reason : new Error('Session restoration failed.'))
        return
      }

      try {
        await refreshSession()
      } catch (refreshReason: unknown) {
        clearSession('session_expired')
        setError(refreshReason instanceof Error ? refreshReason : new Error('Session refresh failed.'))
      }
    }
  }, [clearSession, persistSession, refreshSession])

  useEffect(() => configureHttpAuthentication({
    refresh: refreshSession,
    onSessionExpired: () => clearSession('session_expired'),
  }), [clearSession, refreshSession])

  useEffect(() => {
    void restoreSession()
  }, [restoreSession])

  const login = useCallback(async (credentials: LoginCredentials) => {
    setStatus('authenticating')
    setError(null)
    try {
      const authenticatedSession = await requestLogin(credentials)
      const user = await getCurrentUser(authenticatedSession.accessToken, undefined, true)
      persistSession({ ...authenticatedSession, user })
      setStatus('authenticated')
    } catch (reason: unknown) {
      const authError = reason instanceof Error ? reason : new Error('Authentication request failed.')
      clearSession('unauthenticated')
      setError(authError)
      throw authError
    }
  }, [clearSession, persistSession])

  const logout = useCallback(async () => {
    const refreshToken = sessionRef.current?.refreshToken ?? readStoredSession()?.refreshToken
    try {
      if (refreshToken) await requestLogout(refreshToken)
    } finally {
      clearSession('unauthenticated')
    }
  }, [clearSession])

  const refreshProfile = useCallback(async () => {
    if (!session) return
    setStatus('refreshing')
    setError(null)
    try {
      const user: AuthUser = await getCurrentUser(session.accessToken)
      persistSession({ ...session, user })
      setStatus('authenticated')
    } catch (reason: unknown) {
      setStatus('authenticated')
      setError(reason instanceof Error ? reason : new Error('Profile refresh failed.'))
    }
  }, [persistSession, session])

  const value = useMemo(
    () => ({ session, status, error, login, refreshProfile, logout, restoreSession }),
    [session, status, error, login, refreshProfile, logout, restoreSession],
  )

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
}
