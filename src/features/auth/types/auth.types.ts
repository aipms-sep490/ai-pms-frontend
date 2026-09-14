export interface AuthUser {
  id: number
  email: string
  fullName: string
  roles: readonly string[]
}

export interface LoginCredentials {
  email: string
  password: string
}

/** Matches the existing backend LoginResponse contract. */
export interface LoginSession {
  accessToken: string
  tokenType: string
  expiresAtUtc: string
  refreshToken: string
  refreshTokenExpiresAtUtc: string
  user: AuthUser
}

export type AuthSessionStatus =
  | 'anonymous'
  | 'authenticating'
  | 'authenticated'
  | 'refreshing_profile'
