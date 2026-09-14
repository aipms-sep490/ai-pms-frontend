import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { HttpError } from '../../../services/http/http-client'
import { AcademicHierarchyTree } from '../components/AcademicHierarchyTree'
import { AcademicRecordForm } from '../components/AcademicRecordForm'
import { useAcademicStructure } from '../hooks/useAcademicStructure'
import type {
  AcademicEntityKind,
  AcademicFilters,
  AcademicRecordDraft,
  Department,
  Major,
  Organization,
} from '../types/academic.types'
import './academic-structure.css'

type AcademicRecord = Organization | Department | Major

interface EditorState {
  kind: AcademicEntityKind
  record?: AcademicRecord
}

const initialFilters: AcademicFilters = { search: '', includeInactive: false }

function getErrorMessage(error: Error): string {
  if (error instanceof HttpError && error.status === 401) return 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để tiếp tục.'
  if (error instanceof HttpError && error.status === 403) return 'Tài khoản không có quyền xem cấu trúc học vụ hiện tại.'
  return 'Không thể tải cấu trúc học vụ. Kiểm tra kết nối rồi thử lại.'
}

export function AcademicStructurePage() {
  const [draftFilters, setDraftFilters] = useState(initialFilters)
  const [filters, setFilters] = useState(initialFilters)
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [operationError, setOperationError] = useState<string | null>(null)
  const [operationSuccess, setOperationSuccess] = useState<string | null>(null)
  const academic = useAcademicStructure(filters)

  const organizations = useMemo(
    () => academic.hierarchy?.map(({ organization }) => organization) ?? [],
    [academic.hierarchy],
  )

  const openEditor = (kind: AcademicEntityKind, record?: AcademicRecord) => {
    setOperationError(null)
    setOperationSuccess(null)
    setEditor({ kind, record })
  }

  const saveRecord = async (draft: AcademicRecordDraft) => {
    setOperationError(null)
    setOperationSuccess(null)
    try {
      await academic.submitRecord(draft)
      setEditor(null)
      setOperationSuccess('Đã lưu thay đổi. Danh sách đang được đồng bộ lại từ backend.')
    } catch (reason: unknown) {
      const error = reason instanceof Error ? reason : new Error('Save failed')
      setOperationError(getErrorMessage(error))
      throw error
    }
  }

  const changeStatus = async (kind: AcademicEntityKind, id: number, isActive: boolean) => {
    setOperationError(null)
    setOperationSuccess(null)
    try {
      await academic.changeStatus(kind, id, isActive)
      setOperationSuccess(isActive ? 'Đã kích hoạt bản ghi.' : 'Đã ngừng hoạt động bản ghi.')
    } catch (reason: unknown) {
      setOperationError(getErrorMessage(reason instanceof Error ? reason : new Error('Update failed')))
    }
  }

  if (academic.isUnauthenticated) {
    return <section className="academic-state-panel academic-error-panel" role="alert"><div><strong>Cần đăng nhập để xem cấu trúc học vụ</strong><p>Hãy xác thực trước khi backend trả dữ liệu theo scope học vụ của bạn.</p></div><Link to="/login" className="academic-link-button">Đăng nhập</Link></section>
  }

  if (academic.isLoading) {
    return <section className="academic-state-panel" role="status">Đang tải cấu trúc học vụ…</section>
  }

  if (academic.isUnauthorized) {
    return <section className="academic-state-panel academic-error-panel" role="alert"><div><strong>Phiên đăng nhập đã hết hạn</strong><p>Đăng nhập lại để đọc dữ liệu học vụ từ backend.</p></div><Link to="/login" className="academic-link-button">Đăng nhập</Link></section>
  }

  if (academic.isForbidden) {
    return <section className="academic-state-panel academic-error-panel" role="alert"><div><strong>Không có quyền truy cập</strong><p>Backend từ chối dữ liệu ngoài scope học vụ được cấp.</p></div></section>
  }

  if (academic.error) {
    return <section className="academic-state-panel academic-error-panel" role="alert"><div><strong>Lỗi tải dữ liệu</strong><p>{getErrorMessage(academic.error)}</p></div><Button onClick={academic.retry}>Thử lại</Button></section>
  }

  return (
    <div className="academic-page">
      <header className="academic-page-heading">
        <div>
          <p className="eyebrow">UC-018 · UC-023</p>
          <h1>Cấu trúc học vụ</h1>
          <p>Quản lý quan hệ Tổ chức → Bộ môn → Chuyên ngành từ nguồn dữ liệu backend. Scope và quyền cuối cùng luôn do backend xác nhận.</p>
        </div>
        {academic.canManageOrganizations && <Button onClick={() => openEditor('organization')}>Thêm tổ chức</Button>}
      </header>

      <form className="academic-filter-bar" onSubmit={(event) => { event.preventDefault(); setFilters(draftFilters) }}>
        <label>
          Tìm theo mã hoặc tên
          <input value={draftFilters.search} onChange={(event) => setDraftFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Ví dụ: SE, CNTT" />
        </label>
        <label>
          Phạm vi tổ chức
          <select value={draftFilters.organizationId ?? ''} onChange={(event) => setDraftFilters((current) => ({ ...current, organizationId: event.target.value ? Number(event.target.value) : undefined }))}>
            <option value="">Tất cả tổ chức được backend trả về</option>
            {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.code} · {organization.name}</option>)}
          </select>
        </label>
        <label className="academic-checkbox"><input type="checkbox" checked={draftFilters.includeInactive} onChange={(event) => setDraftFilters((current) => ({ ...current, includeInactive: event.target.checked }))} /> Bao gồm bản ghi ngừng hoạt động</label>
        <Button type="submit" variant="secondary">Áp dụng bộ lọc</Button>
      </form>

      {!academic.canManageAcademicStructure && academic.context && (
        <p className="academic-permission-note" role="status">Bạn đang ở chế độ xem. Các thao tác thay đổi chỉ hiển thị khi backend trả action <code>manage_academic_structure</code> là khả dụng.</p>
      )}
      {operationError && <p className="academic-operation-error" role="alert">{operationError}</p>}
      {operationSuccess && <p className="academic-operation-success" role="status">{operationSuccess}</p>}

      {academic.isEmpty ? (
        <section className="academic-state-panel" role="status">Không có tổ chức, bộ môn hoặc chuyên ngành nào khớp bộ lọc hiện tại.</section>
      ) : academic.hierarchy ? (
        <AcademicHierarchyTree
          hierarchy={academic.hierarchy}
          canManageAcademicStructure={academic.canManageAcademicStructure}
          canManageOrganizations={academic.canManageOrganizations}
          isSubmitting={academic.isSubmitting}
          onEdit={openEditor}
          onCreate={({ kind }) => openEditor(kind)}
          onStatusChange={changeStatus}
        />
      ) : null}

      {editor && academic.hierarchy && (
        <div className="academic-modal-backdrop" role="presentation">
          <AcademicRecordForm
            kind={editor.kind}
            record={editor.record}
            hierarchy={academic.hierarchy}
            isSubmitting={academic.isSubmitting}
            onCancel={() => setEditor(null)}
            onSubmit={saveRecord}
          />
        </div>
      )}
    </div>
  )
}
