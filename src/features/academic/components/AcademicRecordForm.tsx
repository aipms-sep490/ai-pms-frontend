import { useEffect, useId, useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { HttpError } from '../../../services/http/http-client'
import { academicError } from '../academic-error'
import type {
  AcademicEntityKind,
  AcademicHierarchyOrganization,
  AcademicRecordDraft,
  Department,
  Major,
  Organization,
} from '../types/academic.types'

type AcademicRecord = Organization | Department | Major

interface AcademicRecordFormProps {
  kind: AcademicEntityKind
  record?: AcademicRecord
  hierarchy: AcademicHierarchyOrganization[]
  isSubmitting: boolean
  onCancel: () => void
  onSubmit: (draft: AcademicRecordDraft) => Promise<void>
}

const entityLabels = {
  organization: 'Tổ chức',
  department: 'Bộ môn',
  major: 'Chuyên ngành',
} as const

function getSafeFormError(error: unknown): string {
  if (error instanceof HttpError) {
    if (error.status === 400 || error.status === 422) return 'Thông tin chưa hợp lệ. Kiểm tra các ô được đánh dấu rồi lưu lại.'
    if (error.status === 403) return 'Bạn không có quyền thay đổi bản ghi này.'
    if (error.status === 409) return 'Dữ liệu trùng lặp hoặc không còn hợp lệ trong cấu trúc hiện tại.'
  }
  return 'Không thể lưu thay đổi. Hãy thử lại.'
}

function getParentIds(kind: AcademicEntityKind, record?: AcademicRecord) {
  if (kind === 'department' && record && 'organizationId' in record) {
    return { organizationId: record.organizationId, departmentId: undefined }
  }
  if (kind === 'major' && record && 'departmentId' in record) {
    return { organizationId: record.organizationId, departmentId: record.departmentId }
  }
  return { organizationId: undefined, departmentId: undefined }
}

export function AcademicRecordForm({
  kind,
  record,
  hierarchy,
  isSubmitting,
  onCancel,
  onSubmit,
}: AcademicRecordFormProps) {
  const parentIds = getParentIds(kind, record)
  const [code, setCode] = useState(record?.code ?? '')
  const [name, setName] = useState(record?.name ?? '')
  const [description, setDescription] = useState(record?.description ?? '')
  const [organizationId, setOrganizationId] = useState(parentIds.organizationId?.toString() ?? '')
  const [departmentId, setDepartmentId] = useState(parentIds.departmentId?.toString() ?? '')
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const formId = useId()
  const errorId = (field: string) => `${formId}-${field}-error`
  const clearFieldError = (field: string) => {
    setFieldErrors(current => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
    setFormError(null)
  }

  useEffect(() => {
    if (kind !== 'major' || departmentId) return
    const firstDepartment = hierarchy.flatMap((item) => item.departments).find((item) => item.department.isActive)
    if (firstDepartment) setDepartmentId(String(firstDepartment.department.id))
  }, [departmentId, hierarchy, kind])

  const isEditing = Boolean(record)
  const availableOrganizations = hierarchy.filter((item) => item.organization.isActive)
  const availableDepartments = hierarchy
    .flatMap((item) => item.departments)
    .filter((item) => item.department.isActive)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    const invalid: Record<string, string> = {}
    if (!code.trim()) invalid.code = 'Nhập mã.'
    else if (code.trim().length > 50 || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(code.trim())) {
      invalid.code = 'Mã bắt đầu bằng chữ hoặc số; chỉ dùng chữ, số, _ hoặc -, tối đa 50 ký tự.'
    }
    if (!name.trim()) invalid.name = 'Nhập tên.'
    else if (name.trim().length > 255) invalid.name = 'Tên tối đa 255 ký tự.'
    if (description.trim().length > 1000) invalid.description = 'Mô tả tối đa 1000 ký tự.'
    if (kind === 'department' && !isEditing && !organizationId) invalid.organizationId = 'Chọn tổ chức sở hữu bộ môn.'
    if (kind === 'major' && !departmentId) invalid.departmentId = 'Chọn bộ môn sở hữu chuyên ngành.'
    setFieldErrors(invalid)
    if (Object.keys(invalid).length) {
      setFormError(invalid.code === 'Nhập mã.' && invalid.name === 'Nhập tên.'
        ? 'Nhập mã và tên để lưu hồ sơ.'
        : 'Kiểm tra các ô được đánh dấu trước khi lưu.')
      return
    }

    try {
      await onSubmit({
        kind,
        id: record?.id,
        code: code.trim(),
        name: name.trim(),
        description: description.trim(),
        organizationId: organizationId ? Number(organizationId) : undefined,
        departmentId: departmentId ? Number(departmentId) : undefined,
      })
    } catch (reason: unknown) {
      setFormError(getSafeFormError(reason))
      setFieldErrors(academicError(reason, 'governance').fields ?? {})
    }
  }

  return (
    <section className="academic-form-card" aria-labelledby="academic-form-title">
      <div className="academic-form-heading">
        <div>
          <p className="eyebrow">{isEditing ? 'Cập nhật hồ sơ' : 'Tạo hồ sơ'}</p>
          <h2 id="academic-form-title">{isEditing ? 'Chỉnh sửa' : 'Thêm'} {entityLabels[kind]}</h2>
        </div>
        <Button variant="ghost" aria-label="Đóng biểu mẫu" onClick={onCancel}>Đóng</Button>
      </div>

      <form className="academic-form" onSubmit={handleSubmit} noValidate>
        {kind === 'department' && !isEditing && (
          <label>
            Tổ chức sở hữu
            <select aria-label="Tổ chức sở hữu" value={organizationId} onChange={(event) => { setOrganizationId(event.target.value); clearFieldError('organizationId') }} disabled={isSubmitting} required aria-invalid={Boolean(fieldErrors.organizationId)} aria-describedby={fieldErrors.organizationId ? errorId('organizationId') : undefined}>
              <option value="">Chọn tổ chức</option>
              {availableOrganizations.map(({ organization }) => <option key={organization.id} value={organization.id}>{organization.code} · {organization.name}</option>)}
            </select>
            {fieldErrors.organizationId && <small id={errorId('organizationId')} className="text-status-error-text">{fieldErrors.organizationId}</small>}
          </label>
        )}

        {kind === 'major' && (
          <label>
            Bộ môn sở hữu
            <select aria-label="Bộ môn sở hữu" value={departmentId} onChange={(event) => { setDepartmentId(event.target.value); clearFieldError('departmentId') }} disabled={isSubmitting} required aria-invalid={Boolean(fieldErrors.departmentId)} aria-describedby={fieldErrors.departmentId ? errorId('departmentId') : undefined}>
              <option value="">Chọn bộ môn</option>
              {availableDepartments.map(({ department }) => <option key={department.id} value={department.id}>{department.code} · {department.name}</option>)}
            </select>
            {fieldErrors.departmentId && <small id={errorId('departmentId')} className="text-status-error-text">{fieldErrors.departmentId}</small>}
          </label>
        )}

        <label>
          Mã
          <input aria-label="Mã" value={code} onChange={(event) => { setCode(event.target.value); clearFieldError('code') }} disabled={isSubmitting} autoComplete="off" required maxLength={50} aria-invalid={Boolean(fieldErrors.code)} aria-describedby={fieldErrors.code ? errorId('code') : undefined} />
          {fieldErrors.code && <small id={errorId('code')} className="text-status-error-text">{fieldErrors.code}</small>}
        </label>
        <label>
          Tên
          <input aria-label="Tên" value={name} onChange={(event) => { setName(event.target.value); clearFieldError('name') }} disabled={isSubmitting} autoComplete="off" required maxLength={255} aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? errorId('name') : undefined} />
          {fieldErrors.name && <small id={errorId('name')} className="text-status-error-text">{fieldErrors.name}</small>}
        </label>
        <label>
          Mô tả <span>(không bắt buộc)</span>
          <textarea aria-label="Mô tả" value={description} onChange={(event) => { setDescription(event.target.value); clearFieldError('description') }} disabled={isSubmitting} rows={3} maxLength={1000} aria-invalid={Boolean(fieldErrors.description)} aria-describedby={fieldErrors.description ? errorId('description') : undefined} />
          {fieldErrors.description && <small id={errorId('description')} className="text-status-error-text">{fieldErrors.description}</small>}
        </label>

        {formError && <p role="alert" className="academic-error">{formError}</p>}
        <div className="academic-form-actions">
          <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>Hủy</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Đang lưu…' : 'Lưu thay đổi'}</Button>
        </div>
      </form>
    </section>
  )
}
