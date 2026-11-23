import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { env } from '../../../app/config/env'
import { Button } from '../../../components/ui/Button'
import { displayLabel } from '../../../components/ui/display-label'
import { ListLoading } from '../../../components/ui/ListLoading'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { HttpError } from '../../../services/http/http-client'
import { humanizeHttpError } from '../../../services/http/humanize-http-error'
import type { Permission } from '../api/admin-api'
import { useAdminWorkspace } from '../hooks/useAdminWorkspace'
import './admin-workspace.css'

const MODULE_LABELS: Record<string, string> = {
  ACCOUNT: 'Tài khoản & Hồ sơ',
  USER: 'Tài khoản & Hồ sơ',
  AUTH: 'Xác thực & Phiên',
  ROLE: 'Vai trò & Phân quyền',
  PERMISSION: 'Vai trò & Phân quyền',
  RBAC: 'Vai trò & Phân quyền',
  ACADEMIC: 'Học vụ & Tổ chức',
  SEMESTER: 'Học vụ & Tổ chức',
  PERIOD: 'Học vụ & Tổ chức',
  TOPIC: 'Đề tài & Đăng ký',
  PROJECT: 'Đồ án & Thực thi',
  TEAM: 'Nhóm & Thành viên',
  MILESTONE: 'Mốc & Tiến độ',
  TASK: 'Công việc & Báo cáo',
  REPORT: 'Công việc & Báo cáo',
  MEETING: 'Lịch họp & Biên bản',
  DELIVERABLE: 'Hạng mục bàn giao',
  EVALUATION: 'Đánh giá & Chấm điểm',
  RUBRIC: 'Đánh giá & Chấm điểm',
  REVIEW: 'Thẩm định cổng',
  DEFENSE: 'Bảo vệ & Công bố điểm',
  RESULT: 'Bảo vệ & Công bố điểm',
  APPEAL: 'Phúc khảo & Điều chỉnh',
  INDUSTRY: 'Chuyên gia doanh nghiệp',
  EXPERT: 'Chuyên gia doanh nghiệp',
  AI: 'Trợ lý AI & Kho tri thức',
  KNOWLEDGE: 'Trợ lý AI & Kho tri thức',
  CHAT: 'Trao đổi & Thông báo',
  NOTIFICATION: 'Trao đổi & Thông báo',
  AUDIT: 'Nhật ký & Hệ thống',
  SYSTEM: 'Nhật ký & Hệ thống',
  ADMIN: 'Nhật ký & Hệ thống',
}

function moduleGroupFor(code: string): string {
  const prefix = code.split(/[._:-]/)[0]?.toUpperCase() ?? ''
  return MODULE_LABELS[prefix] ?? 'Quyền khác'
}

export function AdminRbacPage() {
  const admin = useAdminWorkspace()
  // Read-only permission matrix unless explicitly enabled via env flag.
  const canEdit = env.rbacWriteEnabled
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [filter, setFilter] = useState('')
  const [grantedOnly, setGrantedOnly] = useState(false)
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [errorNotice, setErrorNotice] = useState<string | null>(null)
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()

  useEffect(() => {
    if (selectedRoleId === null && admin.rbac.value.roles.length > 0) {
      const first = admin.rbac.value.roles[0]
      setSelectedRoleId(first.id)
      setSelectedPermissionIds(new Set(first.permissions.map(item => item.id)))
    }
  }, [admin.rbac.value.roles, selectedRoleId])

  const selectedRole = admin.rbac.value.roles.find((role) => role.id === selectedRoleId) ?? null

  const isDirty = useMemo(() => {
    if (!selectedRole) return false
    const original = new Set(selectedRole.permissions.map(p => p.id))
    if (original.size !== selectedPermissionIds.size) return true
    for (const id of selectedPermissionIds) {
      if (!original.has(id)) return true
    }
    return false
  }, [selectedPermissionIds, selectedRole])

  const permissions = useMemo(() => {
    const query = filter.trim().toLowerCase()
    return admin.rbac.value.permissions.filter((item) => {
      if (grantedOnly && !selectedPermissionIds.has(item.id)) return false
      if (query && !`${item.code} ${item.name} ${item.description ?? ''}`.toLowerCase().includes(query)) return false
      return true
    })
  }, [admin.rbac.value.permissions, filter, grantedOnly, selectedPermissionIds])

  const groupedPermissions = useMemo(() => {
    const map = new Map<string, Permission[]>()
    for (const perm of permissions) {
      const group = moduleGroupFor(perm.code)
      const list = map.get(group) ?? []
      list.push(perm)
      map.set(group, list)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'vi'))
  }, [permissions])

  const fail = admin.rbac.error instanceof HttpError && admin.rbac.error.status === 403

  function toggleGroup(groupItems: Permission[]) {
    if (!canEdit || busy) return
    const allChecked = groupItems.every(item => selectedPermissionIds.has(item.id))
    setSelectedPermissionIds(current => {
      const next = new Set(current)
      for (const item of groupItems) {
        if (allChecked) next.delete(item.id)
        else next.add(item.id)
      }
      return next
    })
  }

  async function saveMapping() {
    if (!selectedRole || busy) return
    const ids = [...selectedPermissionIds]
    const confirmed = await requestConfirmation({
      title: 'Lưu quyền truy cập?',
      description: `Máy chủ sẽ thay thế phân quyền hiện tại của vai trò ${displayLabel(selectedRole.code)}. Quyền trong từng đồ án vẫn được kiểm tra theo phân công và trạng thái hồ sơ.`,
      confirmLabel: 'Lưu quyền truy cập',
      danger: true,
    })
    if (confirmed === null) return
    setBusy(true)
    setNotice(null)
    setErrorNotice(null)
    try {
      await admin.replacePermissions(selectedRole.id, ids)
      setNotice('Đã cập nhật quyền truy cập cho vai trò.')
    } catch (reason) {
      setErrorNotice(humanizeHttpError(reason, 'Chưa thể lưu phân quyền.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="workspace-page admin-workspace" aria-labelledby="rbac-title">
      <header className="admin-heading">
        <div>
          <p className="admin-kicker">Phân quyền nền tảng</p>
          <h1 id="rbac-title">Vai trò và quyền truy cập</h1>
          <p>
            {canEdit ? 'Quản lý quyền truy cập của từng vai trò.' : 'Xem quyền truy cập của từng vai trò (chỉ đọc).'} Phân công trong đồ án được quản lý ở không gian học vụ.
          </p>
        </div>
        <Link className="admin-link-button" to="/admin/access">Về tổng quan</Link>
      </header>

      {notice ? <p className="admin-notice" role="status">{notice}</p> : null}
      {errorNotice ? <p className="admin-error" role="alert">{errorNotice}</p> : null}
      {admin.rbac.state === 'loading' ? <ListLoading label="Đang tải danh mục phân quyền…" /> : null}
      {admin.rbac.state === 'error' ? (
        <p className="admin-error" role="alert">
          {fail ? 'Bạn không có quyền quản lý phân quyền.' : 'Chưa tải được danh mục phân quyền.'}{' '}
          <Button size="sm" variant="outline" onClick={admin.refresh}>Thử lại</Button>
        </p>
      ) : null}

      {admin.rbac.state !== 'error' ? (
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Danh sách vai trò</h2>
              <p>{canEdit ? 'Chọn vai trò để xem và điều chỉnh các quyền được cấp.' : 'Chọn vai trò để xem các quyền được cấp.'}</p>
            </div>
            {canEdit && isDirty && <StatusBadge tone="warning" label="Có thay đổi chưa lưu" />}
          </div>

          <div className="admin-rbac-layout workspace-master-detail">
            <ul className="admin-role-list">
              {admin.rbac.value.roles.map((role) => (
                <li key={role.id}>
                  <button
                    type="button"
                    className={role.id === selectedRoleId ? 'is-selected' : ''}
                    disabled={busy}
                    aria-pressed={role.id === selectedRoleId}
                    onClick={() => {
                      setSelectedRoleId(role.id)
                      setSelectedPermissionIds(new Set(role.permissions.map(item => item.id)))
                      setNotice(null)
                      setErrorNotice(null)
                    }}
                  >
                    <strong className="flex items-center justify-between gap-2">
                      <span>{displayLabel(role.code)}</span>
                      <span className="font-mono text-xs text-ink-muted">{role.permissions.length}</span>
                    </strong>
                    <span>{role.code}</span>
                    {role.isSystemRole ? <small>Vai trò hệ thống</small> : null}
                  </button>
                </li>
              ))}
            </ul>

            <div className="admin-rbac-detail">
              {selectedRole ? (
                <form onSubmit={(event) => { event.preventDefault(); void saveMapping() }}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3>{displayLabel(selectedRole.code)}</h3>
                      <p className="text-sm text-ink-muted">{selectedRole.description || 'Không có mô tả.'}</p>
                    </div>
                    <StatusBadge
                      tone="neutral"
                      label={`Đã cấp ${selectedPermissionIds.size}/${admin.rbac.value.permissions.length} quyền`}
                    />
                  </div>

                  <div className="flex flex-wrap items-end gap-3">
                    <label className="grid min-w-[220px] flex-1 gap-1.5 text-sm font-semibold text-ink-soft">
                      Tìm quyền truy cập
                      <input
                        value={filter}
                        onChange={(event) => setFilter(event.target.value)}
                        placeholder="Nhập mã hoặc tên quyền"
                      />
                    </label>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={grantedOnly}
                      onClick={() => setGrantedOnly(prev => !prev)}
                      className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                        grantedOnly
                          ? 'border-primary bg-primary-subtle text-primary'
                          : 'border-hairline bg-card text-ink-soft hover:bg-canvas'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                        {grantedOnly ? 'check_circle' : 'filter_list'}
                      </span>
                      Chỉ xem quyền đã cấp
                    </button>
                  </div>

                  <fieldset disabled={busy || !canEdit}>
                    <legend>Quyền truy cập ({permissions.length})</legend>
                    {groupedPermissions.length === 0 ? (
                      <p className="rounded-lg border border-hairline bg-canvas p-4 text-sm text-ink-muted">
                        Không tìm thấy quyền truy cập phù hợp với bộ lọc hiện tại.
                      </p>
                    ) : (
                      <div className="admin-permission-groups">
                        {groupedPermissions.map(([groupName, groupItems]) => {
                          const grantedCount = groupItems.filter(item => selectedPermissionIds.has(item.id)).length
                          const allChecked = groupItems.length > 0 && grantedCount === groupItems.length
                          return (
                            <details key={groupName} className="admin-permission-group" open>
                              <summary>
                                <span className="flex items-center gap-2">
                                  <span>{groupName}</span>
                                  <span className="rounded-full bg-card px-2 py-0.5 font-mono text-xs text-ink-muted border border-hairline">
                                    {grantedCount}/{groupItems.length}
                                  </span>
                                </span>
                                {canEdit && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    disabled={busy}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      toggleGroup(groupItems)
                                    }}
                                  >
                                    {allChecked ? 'Bỏ chọn nhóm' : 'Chọn tất cả nhóm'}
                                  </Button>
                                )}
                              </summary>
                              <div className="admin-permission-group__list">
                                {groupItems.map((permission) => (
                                  <label key={permission.id} className="admin-choice">
                                    <input
                                      name="permissionIds"
                                      type="checkbox"
                                      value={permission.id}
                                      checked={selectedPermissionIds.has(permission.id)}
                                      onChange={event => setSelectedPermissionIds(current => {
                                        const next = new Set(current)
                                        if (event.target.checked) next.add(permission.id)
                                        else next.delete(permission.id)
                                        return next
                                      })}
                                    />
                                    <span>
                                      <strong>{permission.name}</strong>
                                      <small className="font-mono">{permission.code}</small>
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </details>
                          )
                        })}
                      </div>
                    )}
                  </fieldset>

                  {canEdit ? (
                    <div className="admin-actions">
                      <Button type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu phân quyền'}</Button>
                      {isDirty && (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={busy}
                          onClick={() => setSelectedPermissionIds(new Set(selectedRole.permissions.map(item => item.id)))}
                        >
                          Hoàn tác thay đổi
                        </Button>
                      )}
                    </div>
                  ) : (
                    <p className="admin-gap" role="note">
                      Ma trận quyền hiện đang ở chế độ chỉ đọc. Quyền thực tế trong từng đồ án được kiểm tra theo phân công và trạng thái hồ sơ.
                    </p>
                  )}
                </form>
              ) : (
                <div className="workspace-empty-detail">
                  <span className="material-symbols-outlined" aria-hidden="true">admin_panel_settings</span>
                  <h2>Chọn vai trò để xem ma trận quyền</h2>
                  <p>Chọn một vai trò ở danh sách bên trái để kiểm tra các quyền truy cập được cấp trên hệ thống.</p>
                </div>
              )}
            </div>
          </div>

          <p className="admin-gap">Các vai trò theo đồ án như trưởng nhóm, giảng viên hướng dẫn và người chấm được cấp qua phân công, không gán tại đây.</p>
        </section>
      ) : null}

      {confirmationDialog}
    </div>
  )
}
