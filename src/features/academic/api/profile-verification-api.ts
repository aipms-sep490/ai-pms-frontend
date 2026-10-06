import { httpGet, httpPost } from '../../../services/http/http-client'
import type { PagedResult } from '../../../types/backend'
export const academicProfileStatus = (status: string) => ({ PENDING: 'Chờ xác minh', VERIFIED: 'Đã xác minh', REJECTED: 'Cần bổ sung' } as Record<string, string>)[status] ?? status
export interface AcademicProfile { userId: number; fullName: string; email: string; studentCode: string | null; departmentId: number | null; departmentName: string | null; majorId: number | null; majorName: string | null; status: string; reviewedBy: number | null; reviewedAt: string | null; rejectionReason: string | null; concurrencyToken: string | null }
export const getMyAcademicProfile = () => httpGet<AcademicProfile>('/users/me/academic-profile')
export const getAcademicProfiles = (status: string, page: number) => httpGet<PagedResult<AcademicProfile>>(`/academic/profile-verifications?page=${page}&pageSize=20${status ? `&status=${status}` : ''}`)
export const verifyAcademicProfile = (userId: number) => httpPost<AcademicProfile>(`/users/${userId}/academic-profile/verify`)
export const rejectAcademicProfile = (userId: number, reason: string) => httpPost<AcademicProfile>(`/users/${userId}/academic-profile/reject`, { reason })
