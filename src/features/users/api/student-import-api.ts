import { httpPost, httpPostForm } from '../../../services/http/http-client'

export interface StudentImportRow { rowNumber: number; studentCode: string; fullName: string; email: string; phone: string | null; curriculumCode: string | null }
export interface StudentImportPreview { majorId: number; majorName: string; departmentName: string; rows: Array<{ account: StudentImportRow; errors: string[] }>; canCommit: boolean }
export const previewStudentImport = (file: File, majorId: number, accessToken: string, signal?: AbortSignal) => {
  const form = new FormData(); form.append('file', file); form.append('majorId', String(majorId))
  return httpPostForm<StudentImportPreview>('/users/student-import/preview', form, { accessToken, signal })
}
export const commitStudentImport = (majorId: number, rows: StudentImportRow[], accessToken: string, signal?: AbortSignal) =>
  httpPost<{ created: number }>('/users/student-import/commit', { majorId, rows }, { accessToken, signal })
