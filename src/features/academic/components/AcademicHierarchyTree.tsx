import { Button } from '../../../components/ui/Button'
import type {
  AcademicEntityKind,
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
  onCreate: (draft: Pick<AcademicRecordDraft, 'kind'>) => void
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return <span className={isActive ? 'academic-status active' : 'academic-status inactive'}>{isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}</span>
}

function RecordActions({
  kind,
  record,
  visible,
  isSubmitting,
  onEdit,
  onStatusChange,
}: {
  kind: AcademicEntityKind
  record: AcademicRecord
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
    </div>
  )
}

export function AcademicHierarchyTree({
  hierarchy,
  canManageAcademicStructure,
  canManageOrganizations,
  isSubmitting,
  onEdit,
  onStatusChange,
  onCreate,
}: AcademicHierarchyTreeProps) {
  return (
    <div className="academic-tree" aria-label="Cấu trúc học vụ">
      {hierarchy.map(({ organization, departments }) => (
        <section className="academic-node organization" key={organization.id}>
          <header className="academic-node-header">
            <div>
              <span className="academic-node-label">Tổ chức · {organization.code}</span>
              <h2>{organization.name}</h2>
              {organization.description && <p>{organization.description}</p>}
            </div>
            <div className="academic-node-tools"><StatusBadge isActive={organization.isActive} /><RecordActions kind="organization" record={organization} visible={canManageOrganizations} isSubmitting={isSubmitting} onEdit={onEdit} onStatusChange={onStatusChange} /></div>
          </header>

          <div className="academic-children" data-testid={`organization-${organization.id}-departments`}>
            <div className="academic-children-heading"><h3>Bộ môn</h3>{canManageOrganizations && <Button size="sm" variant="secondary" onClick={() => onCreate({ kind: 'department' })}>Thêm bộ môn</Button>}</div>
            {departments.length === 0 ? <p className="academic-inline-empty">Chưa có bộ môn trong tổ chức này.</p> : departments.map(({ department, majors }) => (
              <article className="academic-node department" key={department.id}>
                <header className="academic-node-header">
                  <div><span className="academic-node-label">Bộ môn · {department.code}</span><h4>{department.name}</h4>{department.description && <p>{department.description}</p>}</div>
                  <div className="academic-node-tools"><StatusBadge isActive={department.isActive} /><RecordActions kind="department" record={department} visible={canManageAcademicStructure} isSubmitting={isSubmitting} onEdit={onEdit} onStatusChange={onStatusChange} /></div>
                </header>
                <div className="academic-children major-list" data-testid={`department-${department.id}-majors`}>
                  <div className="academic-children-heading"><h5>Chuyên ngành</h5>{canManageAcademicStructure && <Button size="sm" variant="secondary" onClick={() => onCreate({ kind: 'major' })}>Thêm chuyên ngành</Button>}</div>
                  {majors.length === 0 ? <p className="academic-inline-empty">Chưa có chuyên ngành.</p> : majors.map((major) => (
                    <article className="academic-major" key={major.id}>
                      <div><span className="academic-node-label">Chuyên ngành · {major.code}</span><strong>{major.name}</strong>{major.description && <p>{major.description}</p>}</div>
                      <div className="academic-node-tools"><StatusBadge isActive={major.isActive} /><RecordActions kind="major" record={major} visible={canManageAcademicStructure} isSubmitting={isSubmitting} onEdit={onEdit} onStatusChange={onStatusChange} /></div>
                    </article>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
