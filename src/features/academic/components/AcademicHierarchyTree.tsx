import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Pagination } from '../../../components/ui/Pagination'
import { StatusBadge as UiStatusBadge } from '../../../components/ui/StatusBadge'
import { useClientPagination } from '../../../components/ui/useClientPagination'
import type {
  AcademicEntityKind,
  AcademicHierarchyDepartment,
  AcademicHierarchyOrganization,
  AcademicRecordDraft,
  Department,
  Major,
  Organization,
} from '../types/academic.types'

type AcademicRecord = Organization | Department | Major

interface AcademicHierarchyTreeProps {
  hierarchy: AcademicHierarchyOrganization[]
  canManageAcademicStructure: boolean
  canManageOrganizations: boolean
  isSubmitting: boolean
  onEdit: (kind: AcademicEntityKind, record: AcademicRecord) => void
  onStatusChange: (kind: AcademicEntityKind, id: number, isActive: boolean) => Promise<void>
  onDelete?: (kind: AcademicEntityKind, record: AcademicRecord) => Promise<void>
  onCreate: (draft: Pick<AcademicRecordDraft, 'kind'>) => void
}

function ActiveStatusBadge({ isActive }: { isActive: boolean }) {
  return <UiStatusBadge tone={isActive ? 'success' : 'warning'} label={isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'} />
}

function RecordActions({
  kind,
  record,
  visible,
  isSubmitting,
  onEdit,
  onStatusChange,
  onDelete,
}: {
  kind: AcademicEntityKind
  record: AcademicRecord
  onDelete?: (kind: AcademicEntityKind, record: AcademicRecord) => Promise<void>
  visible: boolean
  isSubmitting: boolean
  onEdit: (kind: AcademicEntityKind, record: AcademicRecord) => void
  onStatusChange: (kind: AcademicEntityKind, id: number, isActive: boolean) => Promise<void>
}) {
  if (!visible) return null
  return (
    <div className="academic-record-actions">
      <Button variant="ghost" size="sm" onClick={() => onEdit(kind, record)} disabled={isSubmitting}>Chỉnh sửa</Button>
      <Button variant={record.isActive ? 'outline' : 'secondary'} size="sm" onClick={() => void onStatusChange(kind, record.id, !record.isActive)} disabled={isSubmitting}>
        {record.isActive ? 'Ngừng hoạt động' : 'Kích hoạt'}
      </Button>
      {onDelete && <Button variant="ghost" size="sm" disabled={isSubmitting} onClick={() => void onDelete(kind, record)}>Xóa</Button>}
    </div>
  )
}

function DepartmentNode({
  department,
  majors,
  expanded,
  onToggle,
  canManageAcademicStructure,
  isSubmitting,
  onEdit,
  onStatusChange,
  onDelete,
  onCreate,
}: {
  department: Department
  majors: Major[]
  expanded: boolean
  onToggle: () => void
  canManageAcademicStructure: boolean
  isSubmitting: boolean
  onEdit: (kind: AcademicEntityKind, record: AcademicRecord) => void
  onStatusChange: (kind: AcademicEntityKind, id: number, isActive: boolean) => Promise<void>
  onDelete?: (kind: AcademicEntityKind, record: AcademicRecord) => Promise<void>
  onCreate: (draft: Pick<AcademicRecordDraft, 'kind'>) => void
}) {
  const majorPagination = useClientPagination(majors, 8)
  return (
    <article className="academic-node department">
      <header className="academic-node-header">
        <div className="min-w-0">
          <div className="academic-node-meta-row">
            <span className="academic-node-label">Bộ môn · {department.code}</span>
            <span className="academic-node-count">{majors.length} chuyên ngành</span>
          </div>
          <h4>{department.name}</h4>
          {department.description && <p>{department.description}</p>}
        </div>
        <div className="academic-node-tools">
          <button
            type="button"
            aria-expanded={expanded}
            onClick={onToggle}
            className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-hairline bg-card px-2.5 text-xs font-semibold text-ink-soft transition-colors hover:border-primary hover:bg-primary-subtle hover:text-primary"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              {expanded ? 'expand_less' : 'expand_more'}
            </span>
            <span>{expanded ? 'Thu gọn' : 'Xem ngành'}</span>
          </button>
          <ActiveStatusBadge isActive={department.isActive} />
          <RecordActions kind="department" record={department} visible={canManageAcademicStructure} isSubmitting={isSubmitting} onEdit={onEdit} onStatusChange={onStatusChange} onDelete={onDelete} />
        </div>
      </header>
      {expanded && (
        <div className="academic-children major-list" data-testid={`department-${department.id}-majors`}>
          <div className="academic-children-heading">
            <h5>Chuyên ngành ({majors.length})</h5>
            {canManageAcademicStructure && <Button size="sm" variant="secondary" onClick={() => onCreate({ kind: 'major' })}>Thêm chuyên ngành</Button>}
          </div>
          {majors.length === 0 ? <p className="academic-inline-empty">Chưa có chuyên ngành.</p> : (
            <div className="space-y-3">
              <div className="academic-major-grid">
                {majorPagination.paginatedItems.map((major) => (
                  <article className="academic-major" key={major.id}>
                    <div>
                      <span className="academic-node-label">Chuyên ngành · {major.code}</span>
                      <strong>{major.name}</strong>
                      {major.description && <p>{major.description}</p>}
                    </div>
                    <div className="academic-node-tools">
                      <ActiveStatusBadge isActive={major.isActive} />
                      <RecordActions kind="major" record={major} visible={canManageAcademicStructure} isSubmitting={isSubmitting} onEdit={onEdit} onStatusChange={onStatusChange} onDelete={onDelete} />
                    </div>
                  </article>
                ))}
              </div>
              {majorPagination.showPagination && (
                <Pagination
                  page={majorPagination.page}
                  pages={majorPagination.totalPages}
                  total={majorPagination.total}
                  pageSize={majorPagination.pageSize}
                  onPage={majorPagination.setPage}
                />
              )}
            </div>
          )}
        </div>
      )}
    </article>
  )
}

function OrganizationNode({
  organization,
  departments,
  canManageAcademicStructure,
  canManageOrganizations,
  isSubmitting,
  onEdit,
  onStatusChange,
  onDelete,
  onCreate,
}: {
  organization: Organization
  departments: AcademicHierarchyDepartment[]
  canManageAcademicStructure: boolean
  canManageOrganizations: boolean
  isSubmitting: boolean
  onEdit: (kind: AcademicEntityKind, record: AcademicRecord) => void
  onStatusChange: (kind: AcademicEntityKind, id: number, isActive: boolean) => Promise<void>
  onDelete?: (kind: AcademicEntityKind, record: AcademicRecord) => Promise<void>
  onCreate: (draft: Pick<AcademicRecordDraft, 'kind'>) => void
}) {
  const deptPagination = useClientPagination(departments, 8)
  const [defaultExpanded, setDefaultExpanded] = useState(departments.length <= 3)
  const [toggledIds, setToggledIds] = useState<Record<number, boolean>>({})

  const isDepartmentExpanded = (id: number) => toggledIds[id] ?? defaultExpanded
  const toggleDepartment = (id: number) => {
    setToggledIds(current => ({ ...current, [id]: !(current[id] ?? defaultExpanded) }))
  }
  const allVisibleExpanded = deptPagination.paginatedItems.length > 0
    && deptPagination.paginatedItems.every(item => isDepartmentExpanded(item.department.id))
  const toggleAllDepartments = () => {
    const next = !allVisibleExpanded
    setDefaultExpanded(next)
    setToggledIds({})
  }

  const majorCount = departments.reduce((sum, item) => sum + item.majors.length, 0)

  return (
    <section className="academic-node organization">
      <header className="academic-node-header">
        <div>
          <div className="academic-node-meta-row">
            <span className="academic-node-label">Tổ chức · {organization.code}</span>
            <span className="academic-node-count">{departments.length} bộ môn · {majorCount} ngành</span>
          </div>
          <h2>{organization.name}</h2>
          {organization.description && <p>{organization.description}</p>}
        </div>
        <div className="academic-node-tools">
          <ActiveStatusBadge isActive={organization.isActive} />
          <RecordActions kind="organization" record={organization} visible={canManageOrganizations} isSubmitting={isSubmitting} onEdit={onEdit} onStatusChange={onStatusChange} onDelete={onDelete} />
        </div>
      </header>

      <div className="academic-children" data-testid={`organization-${organization.id}-departments`}>
        <div className="academic-children-heading">
          <h3>Bộ môn ({departments.length})</h3>
          <div className="flex flex-wrap items-center gap-2">
            {departments.length > 1 && (
              <button
                type="button"
                onClick={toggleAllDepartments}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-hairline bg-card px-3 text-xs font-semibold text-ink-soft transition-colors hover:border-primary hover:bg-primary-subtle hover:text-primary"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  {allVisibleExpanded ? 'unfold_less' : 'unfold_more'}
                </span>
                <span>{allVisibleExpanded ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}</span>
              </button>
            )}
            {canManageOrganizations && <Button size="sm" variant="secondary" onClick={() => onCreate({ kind: 'department' })}>Thêm bộ môn</Button>}
          </div>
        </div>
        {departments.length === 0 ? (
          <p className="academic-inline-empty">Chưa có bộ môn trong tổ chức này.</p>
        ) : (
          <div className="space-y-3">
            {deptPagination.paginatedItems.map(({ department, majors }) => (
              <DepartmentNode
                key={department.id}
                department={department}
                majors={majors}
                expanded={isDepartmentExpanded(department.id)}
                onToggle={() => toggleDepartment(department.id)}
                canManageAcademicStructure={canManageAcademicStructure}
                isSubmitting={isSubmitting}
                onEdit={onEdit}
                onStatusChange={onStatusChange}
                onDelete={onDelete}
                onCreate={onCreate}
              />
            ))}
            {deptPagination.showPagination && (
              <Pagination
                page={deptPagination.page}
                pages={deptPagination.totalPages}
                total={deptPagination.total}
                pageSize={deptPagination.pageSize}
                onPage={deptPagination.setPage}
              />
            )}
          </div>
        )}
      </div>
    </section>
  )
}

export function AcademicHierarchyTree({
  hierarchy,
  canManageAcademicStructure,
  canManageOrganizations,
  isSubmitting,
  onEdit,
  onStatusChange,
  onDelete,
  onCreate,
}: AcademicHierarchyTreeProps) {
  return (
    <div className="academic-tree" aria-label="Cấu trúc học vụ">
      {hierarchy.map(({ organization, departments }) => (
        <OrganizationNode
          key={organization.id}
          organization={organization}
          departments={departments}
          canManageAcademicStructure={canManageAcademicStructure}
          canManageOrganizations={canManageOrganizations}
          isSubmitting={isSubmitting}
          onEdit={onEdit}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
          onCreate={onCreate}
        />
      ))}
    </div>
  )
}
