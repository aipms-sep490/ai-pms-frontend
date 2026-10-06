import { endpoints } from '../../../services/api/endpoints'
import { httpGet, httpPost, httpPut } from '../../../services/http/http-client'
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

export function requestPasswordReset(email: string): Promise<{ message: string }> {
  return httpPost('/v1/auth/forgot-password', { email }, { skipAuthRefresh: true })
}

export function resetPassword(token: string, newPassword: string): Promise<void> {
  return httpPost('/v1/auth/reset-password', { token, newPassword }, { skipAuthRefresh: true })
}

export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return httpPost('/v1/auth/change-password', { currentPassword, newPassword })
}

export interface EditableProfile {
  fullName: string
  phone: string | null
  title: string | null
}

export function updateMyProfile(profile: EditableProfile): Promise<AuthUser> {
  return httpPut('/v1/users/me/profile', profile)
}

export interface GoogleChallenge { challengeId: string; clientId: string; nonce: string; expiresAtUtc: string }
export function getGoogleChallenge(purpose: 'LOGIN' | 'LINK' = 'LOGIN'): Promise<GoogleChallenge> { return httpPost('/v1/auth/google/challenge', { purpose }, { skipAuthRefresh: true }) }
export interface ExternalLogin { provider: string; email: string; linkedAtUtc: string }
export const getExternalLogins = () => httpGet<ExternalLogin[]>('/v1/auth/external-logins')
export const linkGoogle = (challengeId: string, idToken: string, currentPassword: string) => httpPost<void>('/v1/auth/google/link', { challengeId, idToken, currentPassword })
export const unlinkGoogle = (currentPassword: string) => httpPost<void>('/v1/auth/google/unlink', { currentPassword })
export function loginWithGoogle(challengeId: string, idToken: string): Promise<LoginSession> {
  return httpPost('/v1/auth/google/login', { challengeId, idToken }, { skipAuthRefresh: true })
}
