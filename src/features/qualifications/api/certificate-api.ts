import { httpGet, httpGetBlob } from '../../../services/http/http-client'

export interface QualificationCertificate {
  qualificationId: number; fileId: number; fileName: string; contentType: string; sizeBytes: number; checksumSha256: string | null
}
export const getQualificationCertificate = (id: number) => httpGet<QualificationCertificate>(`/student-qualifications/${id}/certificate`)
export const downloadQualificationCertificate = (id: number) => httpGetBlob(`/student-qualifications/${id}/certificate/download`)
