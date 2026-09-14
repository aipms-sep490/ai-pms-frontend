import { env } from '../../app/config/env'
import { httpGet, httpPost } from '../http/http-client'
import type { AuthUserDto, UserAccountDto, LoginRequest, LoginResponseDto } from '../../types/backend'

const mockAuthUser: AuthUserDto = {
  id: 1,
  email: 'anhpnh@fpt.edu.vn',
  fullName: 'Phạm Ngọc Hoàng Anh',
  roles: ['STUDENT'],
}

const mockProfile: UserAccountDto = {
  id: 1,
  departmentId: 1,
  majorId: 101, // SE
  email: 'anhpnh@fpt.edu.vn',
  fullName: 'Phạm Ngọc Hoàng Anh',
  phone: '0912345678',
  studentCode: 'SE160004',
  roles: ['STUDENT'],
  status: 'ACTIVE',
}

export async function login(payload: LoginRequest): Promise<LoginResponseDto> {
  if (env.isMockMode) {
    localStorage.setItem('token', 'mock_student_token')
    return {
      accessToken: 'mock_student_token',
      tokenType: 'Bearer',
      expiresAtUtc: new Date(Date.now() + 3600000).toISOString(),
      refreshToken: 'mock_refresh_token',
      refreshTokenExpiresAtUtc: new Date(Date.now() + 86400000).toISOString(),
      user: mockAuthUser,
    }
  }
  const result = await httpPost<LoginResponseDto, LoginRequest>('/auth/login', payload)
  if (result?.accessToken && typeof window !== 'undefined') {
    localStorage.setItem('token', result.accessToken)
  }
  return result
}

export async function logout(): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token')
  }
}

export async function getMe(): Promise<AuthUserDto> {
  if (env.isMockMode) {
    return mockAuthUser
  }
  return await httpGet<AuthUserDto>('/auth/me')
}

export async function getMyProfile(): Promise<UserAccountDto> {
  if (env.isMockMode) {
    return mockProfile
  }
  return await httpGet<UserAccountDto>('/users/me/profile')
}


