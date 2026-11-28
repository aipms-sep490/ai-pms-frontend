import { httpGet, httpPost } from '../../../services/http/http-client'
import type { PagedResult } from '../../../types/backend'
export const academicProfileStatus = (status: string) => ({ PENDING: 'Chờ xác minh', VERIFIED: 'Đã xác minh', REJECTED: 'Cần bổ sung' } as Record<string, string>)[status] ?? status
export interface AcademicProfile { userId: number; fullName: string; email: string; studentCode: string | null; departmentId: number | null; departmentName: string | null; majorId: number | null; majorName: string | null; status: string; reviewedBy: number | null; reviewedAt: string | null; rejectionReason: string | null; concurrencyToken: string | null; classCode?: string | null; specializationId?: number | null; specializationCode?: string | null; specializationName?: string | null; curriculumCode?: string | null }
export interface BulkVerifyAcademicProfilesPayload { userIds?: number[]; classCode?: string; majorId?: number }
export interface BulkVerifyAcademicProfilesResult { verifiedCount: number; skippedCount: number; verifiedUserIds: number[]; skippedUserIds: number[] }
export const getMyAcademicProfile = () => httpGet<AcademicProfile>('/users/me/academic-profile')
export const getAcademicProfiles = (status: string, page: number, pageSize = 10) => httpGet<PagedResult<AcademicProfile>>(`/academic/profile-verifications?page=${page}&pageSize=${pageSize}${status ? `&status=${status}` : ''}`)
export const verifyAcademicProfile = (userId: number) => httpPost<AcademicProfile>(`/users/${userId}/academic-profile/verify`)
export const bulkVerifyAcademicProfiles = (payload: BulkVerifyAcademicProfilesPayload) => httpPost<BulkVerifyAcademicProfilesResult>('/academic/profile-verifications/bulk-verify', payload)
export const rejectAcademicProfile = (userId: number, reason: string) => httpPost<AcademicProfile>(`/users/${userId}/academic-profile/reject`, { reason })
