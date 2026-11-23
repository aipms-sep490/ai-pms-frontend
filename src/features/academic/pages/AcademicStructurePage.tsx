import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { ListLoading } from '../../../components/ui/ListLoading'
import { Modal } from '../../../components/ui/Modal'
import { FilterToolbar, type ActiveFilterChip } from '../../../components/ui/FilterToolbar'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { useEffect, useMemo, useState } from 'react'
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

const entityTitleLabels: Record<AcademicEntityKind, string> = {
  organization: 'tổ chức',
  department: 'bộ môn',
  major: 'chuyên ngành',
}

function getErrorMessage(error: Error): string {
  if (error instanceof HttpError && error.status === 401) return 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để tiếp tục.'
  if (error instanceof HttpError && error.status === 403) return 'Tài khoản không có quyền xem cấu trúc học vụ hiện tại.'
  return 'Không thể tải cấu trúc học vụ. Kiểm tra kết nối rồi thử lại.'
}

export function AcademicStructurePage() {
  const [filters, setFilters] = useState(initialFilters)
  const [cachedOrganizations, setCachedOrganizations] = useState<Organization[]>([])
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [operationError, setOperationError] = useState<string | null>(null)
  const [operationSuccess, setOperationSuccess] = useState<string | null>(null)
  const academic = useAcademicStructure(filters)
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()

  // Preserve previously seen organizations so selecting one organization in the scope filter
  // never causes the other organizations to vanish from the dropdown.
  useEffect(() => {
    const incoming = academic.hierarchy?.map(({ organization }) => organization) ?? []
    if (!incoming.length) return
    setCachedOrganizations(prev => {
      const byId = new Map(prev.map(org => [org.id, org]))
      let changed = false
      for (const org of incoming) {
        const existing = byId.get(org.id)
        if (!existing || existing.code !== org.code || existing.name !== org.name) {
          byId.set(org.id, org)
          changed = true
        }
      }
      if (!changed) return prev
      return [...byId.values()].sort((a, b) => a.code.localeCompare(b.code, 'vi'))
    })
  }, [academic.hierarchy])

  const organizations = useMemo(() => {
    const byId = new Map(cachedOrganizations.map(org => [org.id, org]))
    for (const item of academic.hierarchy ?? []) {
      byId.set(item.organization.id, item.organization)
    }
    return [...byId.values()].sort((a, b) => a.code.localeCompare(b.code, 'vi'))
  }, [cachedOrganizations, academic.hierarchy])

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
      setOperationSuccess('Đã lưu thay đổi. Danh sách đang được đồng bộ lại từ hệ thống.')
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

  const hasStateBlock = academic.isUnauthenticated || academic.isUnauthorized || academic.isForbidden || Boolean(academic.error)
  const hasFilters = Boolean(filters.search.trim() || filters.organizationId || filters.includeInactive)

  const activeChips: ActiveFilterChip[] = []
  if (filters.organizationId) {
    const org = organizations.find(o => o.id === filters.organizationId)
    activeChips.push({
      id: 'organizationId',
      label: 'Tổ chức',
      value: org ? `${org.code} · ${org.name}` : 'Đang lọc',
    })
  }
  if (filters.includeInactive) {
    activeChips.push({
      id: 'includeInactive',
      label: 'Hiển thị',
      value: 'Bao gồm ngừng hoạt động',
    })
  }

  const totalDepartments = (academic.hierarchy ?? []).reduce((sum, item) => sum + item.departments.length, 0)
  const totalMajors = (academic.hierarchy ?? []).reduce(
    (sum, item) => sum + item.departments.reduce((dSum, dep) => dSum + dep.majors.length, 0),
    0,
  )

  return (
    <WorkspacePage
      size="wide"
      className="academic-page"
      title="Cấu trúc đào tạo"
      eyebrow="Quản lý học vụ"
      description="Sắp xếp tổ chức, bộ môn và chuyên ngành; quản lý thông tin và trạng thái hoạt động."
      action={!hasStateBlock && !academic.isLoading && academic.canManageOrganizations ? <Button icon="add" onClick={() => openEditor('organization')}>Thêm tổ chức</Button> : null}
    >
      {confirmationDialog}

      {academic.isUnauthenticated ? (
        <section className="academic-state-panel academic-error-panel" role="alert"><div><strong>Cần đăng nhập để xem cấu trúc học vụ</strong><p>Đăng nhập để xem thông tin đào tạo của bạn.</p></div><Link to="/login" className="academic-link-button text-white">Đăng nhập</Link></section>
      ) : academic.isUnauthorized ? (
        <section className="academic-state-panel academic-error-panel" role="alert"><div><strong>Phiên đăng nhập đã hết hạn</strong><p>Đăng nhập lại để tiếp tục xem thông tin đào tạo.</p></div><Link to="/login" className="academic-link-button text-white">Đăng nhập</Link></section>
      ) : academic.isForbidden ? (
        <section className="academic-state-panel academic-error-panel" role="alert"><div><strong>Không có quyền truy cập</strong><p>Bạn chưa được cấp quyền xem thông tin đào tạo này.</p></div></section>
      ) : academic.error ? (
        <section className="academic-state-panel academic-error-panel" role="alert"><div><strong>Lỗi tải dữ liệu</strong><p>{getErrorMessage(academic.error)}</p></div><Button onClick={academic.retry}>Thử lại</Button></section>
      ) : (
        <>
          <FilterToolbar
            search={filters.search}
            onSearchChange={value => setFilters(current => ({ ...current, search: value }))}
            searchLabel="Tìm theo mã hoặc tên"
            searchPlaceholder="Tìm tổ chức, bộ môn, chuyên ngành (VD: SE, CNTT)..."
            debounceMs={0}
            controls={
              <>
                <label className="ft-select-wrap">
                  <span className="sr-only">Phạm vi tổ chức</span>
                  <select
                    className="ft-select"
                    aria-label="Phạm vi tổ chức"
                    value={filters.organizationId ?? ''}
                    onChange={event => setFilters(current => ({ ...current, organizationId: event.target.value ? Number(event.target.value) : undefined }))}
                  >
                    <option value="">Tất cả tổ chức</option>
                    {organizations.map(organization => (
                      <option key={organization.id} value={organization.id}>
                        {organization.code} · {organization.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-hairline bg-card px-3 text-xs font-semibold text-ink-soft hover:border-primary/40">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={filters.includeInactive}
                    onChange={event => setFilters(current => ({ ...current, includeInactive: event.target.checked }))}
                  />
                  Bao gồm bản ghi ngừng hoạt động
                </label>
              </>
            }
            activeChips={activeChips}
            onRemoveChip={id => {
              if (id === 'organizationId') setFilters(current => ({ ...current, organizationId: undefined }))
              if (id === 'includeInactive') setFilters(current => ({ ...current, includeInactive: false }))
            }}
            onClearAll={() => setFilters(initialFilters)}
            hasActiveFilters={hasFilters}
            resultSummary={academic.hierarchy ? `${academic.hierarchy.length} tổ chức · ${totalDepartments} bộ môn · ${totalMajors} chuyên ngành` : undefined}
          />

          {!academic.canManageAcademicStructure && academic.context && (
            <p className="academic-permission-note" role="status">Bạn có thể xem cấu trúc đào tạo. Quyền chỉnh sửa do quản trị viên cấp.</p>
          )}
          {operationError && <p className="academic-operation-error" role="alert">{operationError}</p>}
          {operationSuccess && <p className="academic-operation-success" role="status">{operationSuccess}</p>}

          {academic.isLoading ? (
            <ListLoading label="Đang tải cấu trúc học vụ…" />
          ) : academic.isEmpty ? (
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
              onDelete={async (kind, record) => {
                if (await requestConfirmation({ title: 'Xóa ' + record.name + '?', description: 'Không thể khôi phục sau khi xóa. Nếu dữ liệu đang được sử dụng, hệ thống sẽ từ chối thao tác.', confirmLabel: 'Xóa', danger: true }) === null) return
                setOperationError(null); setOperationSuccess(null)
                try { await academic.deleteRecord(kind, record.id); setOperationSuccess('Đã xóa bản ghi.') }
                catch (reason) { setOperationError(reason instanceof HttpError && reason.status === 409 ? 'Bản ghi đang được sử dụng và chưa thể xóa.' : 'Chưa xóa được bản ghi. Hãy kiểm tra quyền truy cập và thử lại.') }
              }}
            />
          ) : null}

          {editor && academic.hierarchy && (
            <Modal
              open
              title={`${editor.record ? 'Chỉnh sửa' : 'Thêm'} ${entityTitleLabels[editor.kind]}`}
              busy={academic.isSubmitting}
              onClose={() => setEditor(null)}
            >
              <AcademicRecordForm
                embedded
                kind={editor.kind}
                record={editor.record}
                hierarchy={academic.hierarchy}
                isSubmitting={academic.isSubmitting}
                onCancel={() => setEditor(null)}
                onSubmit={saveRecord}
              />
            </Modal>
          )}
        </>
      )}
    </WorkspacePage>
  )
}
