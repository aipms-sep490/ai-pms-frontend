import { endpoints } from '../../../services/api/endpoints'
import { httpGet, httpPost } from '../../../services/http/http-client'
import type { AuthUser, LoginCredentials, LoginSession } from '../types/auth.types'

export function login(credentials: LoginCredentials): Promise<LoginSession> {
  return httpPost<LoginSession>(endpoints.authLogin, credentials)
}

export function getCurrentUser(
  accessToken: string,
  signal?: AbortSignal,
): Promise<AuthUser> {
  return httpGet<AuthUser>(endpoints.authCurrentUser, { accessToken, signal })
}
