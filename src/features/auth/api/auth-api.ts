import { endpoints } from '../../../services/api/endpoints'
import { httpGet, httpPost } from '../../../services/http/http-client'
import type { AuthUser, LoginCredentials, LoginSession } from '../types/auth.types'

export function login(credentials: LoginCredentials): Promise<LoginSession> {
  return httpPost<LoginSession>(endpoints.authLogin, credentials, { skipAuthRefresh: true })
}

export function refresh(refreshToken: string): Promise<LoginSession> {
  return httpPost<LoginSession, { refreshToken: string }>(
    endpoints.authRefresh,
    { refreshToken },
    { skipAuthRefresh: true },
  )
}

export function logout(refreshToken: string): Promise<void> {
  return httpPost<void, { refreshToken: string }>(
    endpoints.authLogout,
    { refreshToken },
    { skipAuthRefresh: true },
  )
}

export function getCurrentUser(
  accessToken: string,
  signal?: AbortSignal,
  skipAuthRefresh = false,
): Promise<AuthUser> {
  return httpGet<AuthUser>(endpoints.authCurrentUser, { accessToken, signal, skipAuthRefresh })
}
