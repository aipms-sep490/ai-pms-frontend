import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { HttpError } from '../../../services/http/http-client'
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
    if (error.status === 400) return 'Thông tin chưa hợp lệ. Kiểm tra lại các trường bắt buộc.'
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

    if (!code.trim() || !name.trim()) {
      setFormError('Mã và tên là bắt buộc.')
      return
    }
    if (kind === 'department' && !isEditing && !organizationId) {
      setFormError('Chọn tổ chức sở hữu bộ môn.')
      return
    }
    if (kind === 'major' && !departmentId) {
      setFormError('Chọn bộ môn sở hữu chuyên ngành.')
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
            <select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} disabled={isSubmitting}>
              <option value="">Chọn tổ chức</option>
              {availableOrganizations.map(({ organization }) => <option key={organization.id} value={organization.id}>{organization.code} · {organization.name}</option>)}
            </select>
          </label>
        )}

        {kind === 'major' && (
          <label>
            Bộ môn sở hữu
            <select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} disabled={isSubmitting}>
              <option value="">Chọn bộ môn</option>
              {availableDepartments.map(({ department }) => <option key={department.id} value={department.id}>{department.code} · {department.name}</option>)}
            </select>
          </label>
        )}

        <label>
          Mã
          <input value={code} onChange={(event) => setCode(event.target.value)} disabled={isSubmitting} autoComplete="off" />
        </label>
        <label>
          Tên
          <input value={name} onChange={(event) => setName(event.target.value)} disabled={isSubmitting} autoComplete="off" />
        </label>
        <label>
          Mô tả <span>(không bắt buộc)</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} disabled={isSubmitting} rows={3} />
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
