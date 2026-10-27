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
  phone?: string | null
  title?: string | null
}

export interface StoredProfile {
  phone: string | null
  title: string | null
}

export async function getMyProfile(signal?: AbortSignal): Promise<StoredProfile> {
  const stored = await httpGet<StoredProfile>('/v1/users/me/profile', { signal })
  if (!stored ||
    (stored.phone !== null && typeof stored.phone !== 'string') ||
    (stored.title !== null && typeof stored.title !== 'string')
  ) {
    throw new Error('The current profile response is incomplete.')
  }
  return stored
}

export async function updateMyProfile(profile: EditableProfile): Promise<AuthUser> {
  // The backend PUT replaces both fields, including keys omitted by older /auth/me deployments.
  // Read the authoritative profile before preserving any untouched field.
  const stored = profile.phone === undefined || profile.title === undefined
    ? await getMyProfile()
    : null
  const updated = await httpPut<AuthUser>('/v1/users/me/profile', {
    fullName: profile.fullName,
    phone: profile.phone === undefined ? stored!.phone : profile.phone,
    title: profile.title === undefined ? stored!.title : profile.title,
  })
  if (updated.phone === undefined || updated.title === undefined) {
    throw new Error('The saved profile response is incomplete.')
  }
  return updated
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
