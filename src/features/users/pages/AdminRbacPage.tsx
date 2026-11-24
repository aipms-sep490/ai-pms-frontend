import { displayLabel } from '../../../components/ui/display-label'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { Pagination } from '../../../components/ui/Pagination'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { useClientPagination } from '../../../components/ui/useClientPagination'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { HttpError } from '../../../services/http/http-client'
import { useAdminWorkspace } from '../hooks/useAdminWorkspace'
import { env } from '../../../app/config/env'
import './admin-workspace.css'

export function AdminRbacPage() {
  const admin = useAdminWorkspace()
  // BE-11 MVP: the permission matrix is read-only for Admin — role permissions
  // depend on per-project scope/assignment, so editing the system matrix is
  // gated behind a flag until that is designed.
  const canEdit = env.rbacWriteEnabled
  const [selection, setSelection] = useState<{ roleId: number; permissionIds: Set<number> } | null>(null)
  const [filter, setFilter] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()

  const roles = admin.rbac.value.roles
  const allPermissions = admin.rbac.value.permissions
  const globalRoleCount = useMemo(
    () => roles.filter((role) => role.isAssignableGlobalRole && role.assignmentKind === 'GLOBAL').length,
    [roles],
  )
  const permissionGroupCount = useMemo(
    () => new Set(allPermissions.map((item) => item.code.split('_')[0] || item.code)).size,
    [allPermissions],
  )
  const selectedRole = (selection ? roles.find((role) => role.id === selection.roleId) : null) ?? roles[0] ?? null
  const selectedRoleId = selectedRole?.id ?? null
  const selectedPermissionIds = useMemo(
    () => (selection && selectedRole && selection.roleId === selectedRole.id
      ? selection.permissionIds
      : new Set((selectedRole?.permissions ?? []).map((item) => item.id))),
    [selection, selectedRole],
  )
  const permissions = useMemo(
    () => allPermissions.filter((item) => `${item.code} ${item.name}`.toLowerCase().includes(filter.toLowerCase())),
    [allPermissions, filter],
  )
  const permissionPagination = useClientPagination(permissions, 10)
  const fail = admin.rbac.error instanceof HttpError && admin.rbac.error.status === 403

  async function saveMapping() {
    if (!selectedRole || busy) return
    const ids = [...selectedPermissionIds]
    const confirmed = await requestConfirmation({
      title: 'Lưu quyền truy cập?',
      description: `Máy chủ sẽ thay thế phân quyền hiện tại của vai trò ${selectedRole.code}. Quyền trong từng đồ án vẫn được kiểm tra theo phân công và trạng thái hồ sơ.`,
      confirmLabel: 'Lưu quyền truy cập',
      danger: true,
    })
    if (confirmed === null) return
    setBusy(true)
    try {
      await admin.replacePermissions(selectedRole.id, ids)
      setNotice('Đã cập nhật quyền truy cập cho vai trò.')
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Chưa thể lưu phân quyền.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="workspace-page admin-workspace space-y-5" aria-labelledby="rbac-title">
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

      <StatTileRow tiles={[
        {
          icon: 'admin_panel_settings',
          label: 'Tổng vai trò',
          value: admin.rbac.state === 'ready' ? roles.length : null,
          hero: true,
          caption: 'Bao gồm vai trò hệ thống và vai trò theo ngữ cảnh.',
        },
        {
          icon: 'public',
          label: 'Vai trò toàn cục',
          value: admin.rbac.state === 'ready' ? globalRoleCount : null,
          tone: 'info',
          caption: 'Có thể gán trực tiếp ở hồ sơ tài khoản.',
        },
        {
          icon: 'category',
          label: 'Nhóm quyền',
          value: admin.rbac.state === 'ready' ? permissionGroupCount : null,
          tone: 'neutral',
          caption: `${allPermissions.length} quyền chi tiết trong danh mục.`,
        },
        {
          icon: 'verified_user',
          label: 'Quyền đã cấp',
          value: selectedRole ? selectedPermissionIds.size : null,
          tone: 'success',
          caption: selectedRole ? `Trên vai trò ${displayLabel(selectedRole.code)}.` : 'Chọn một vai trò để kiểm tra.',
        },
      ]} />

      {notice ? <p className="admin-notice" role="status">{notice}</p> : null}
      {admin.rbac.state === 'loading' ? <p role="status" className="text-sm text-ink-muted">Đang tải danh mục phân quyền…</p> : null}
      {admin.rbac.state === 'error' ? (
        <p className="admin-error" role="alert">
          {fail ? 'Bạn không có quyền quản lý phân quyền.' : 'Chưa tải được danh mục phân quyền.'}{' '}
          <Button size="sm" variant="outline" onClick={admin.refresh}>Thử lại</Button>
        </p>
      ) : null}

      {admin.rbac.state !== 'error' ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 items-start">
          {/* Left Master Column: Role List */}
          <section className="admin-bento-card xl:col-span-4" aria-labelledby="rbac-roles-heading">
            <div className="flex items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
              <div>
                <h2 id="rbac-roles-heading" className="font-heading text-sm font-bold text-ink">Danh sách vai trò</h2>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {canEdit ? 'Chọn vai trò để xem và điều chỉnh các quyền được cấp.' : 'Chọn vai trò để xem các quyền được cấp.'}
                </p>
              </div>
              <span className="inline-flex items-center rounded-full border border-hairline bg-card px-2.5 py-0.5 text-xs font-bold tabular-nums text-ink-soft">
                {roles.length}
              </span>
            </div>
            <div className="p-3">
              <ul className="admin-role-list space-y-1.5">
                {roles.map((role) => (
                  <li key={role.id}>
                    <button
                      type="button"
                      className={`w-full ${role.id === selectedRoleId ? 'is-selected' : ''}`}
                      disabled={busy}
                      aria-pressed={role.id === selectedRoleId}
                      onClick={() => {
                        setSelection({ roleId: role.id, permissionIds: new Set(role.permissions.map(item => item.id)) })
                        setNotice(null)
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-sm font-bold text-ink">{displayLabel(role.code)}</strong>
                        <span className="rounded-full bg-canvas px-2 py-0.5 font-mono text-xs font-semibold tabular-nums text-ink-soft">
                          {role.permissions.length} quyền
                        </span>
                      </div>
                      <span className="font-mono text-xs">{role.code}</span>
                      {role.isSystemRole ? <small className="text-xs">Vai trò hệ thống</small> : null}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Right Detail Column: Permission Matrix */}
          <section className="admin-bento-card xl:col-span-8" aria-labelledby="rbac-matrix-heading">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-canvas/70 px-5 py-3.5">
              <div>
                <h2 id="rbac-matrix-heading" className="font-heading text-sm font-bold text-ink">
                  {selectedRole ? `Ma trận quyền · ${displayLabel(selectedRole.code)}` : 'Ma trận quyền truy cập'}
                </h2>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {selectedRole ? (selectedRole.description || 'Không có mô tả.') : 'Chọn vai trò ở cột bên trái để đối chiếu danh mục quyền.'}
                </p>
              </div>
              <StatusBadge
                tone={canEdit ? 'info' : 'neutral'}
                label={canEdit ? 'Có thể chỉnh sửa' : 'Chỉ đọc (MVP)'}
              />
            </div>

            <div className="admin-rbac-detail p-5">
              {selectedRole ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    void saveMapping()
                  }}
                >
                  <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-hairline bg-canvas/50 p-3.5">
                    <label className="min-w-0 flex-1 grid gap-1.5 text-xs font-semibold text-ink-soft">
                      Tìm quyền truy cập
                      <input
                        value={filter}
                        onChange={(event) => {
                          setFilter(event.target.value)
                          permissionPagination.setPage(1)
                        }}
                        placeholder="Nhập mã hoặc tên quyền"
                      />
                    </label>
                    <div className="flex items-center gap-2 text-xs text-ink-muted tabular-nums">
                      <span>Khớp bộ lọc: <strong className="text-ink">{permissions.length}</strong></span>
                      <span>·</span>
                      <span>Đã chọn: <strong className="text-primary">{selectedPermissionIds.size}</strong></span>
                    </div>
                  </div>

                  <fieldset disabled={busy || !canEdit}>
                    <legend className="text-sm font-bold text-ink">Quyền truy cập ({permissions.length})</legend>
                    <div className="admin-permission-list divide-y divide-hairline">
                      {permissionPagination.paginatedItems.map((permission) => (
                        <label key={permission.id} className="admin-choice hover:bg-canvas/50 px-2 rounded-lg transition-colors">
                          <input
                            name="permissionIds"
                            type="checkbox"
                            value={permission.id}
                            checked={selectedPermissionIds.has(permission.id)}
                            onChange={(event) => {
                              if (!selectedRole) return
                              const next = new Set(selectedPermissionIds)
                              if (event.target.checked) next.add(permission.id)
                              else next.delete(permission.id)
                              setSelection({ roleId: selectedRole.id, permissionIds: next })
                            }}
                          />
                          <span>
                            <strong className="font-mono text-xs font-bold text-ink">{permission.code}</strong>
                            <small className="text-xs text-ink-muted">{permission.name}</small>
                          </span>
                        </label>
                      ))}
                      {permissions.length === 0 && (
                        <p className="py-6 text-center text-sm text-ink-muted">Không có quyền nào khớp với từ khóa tìm kiếm.</p>
                      )}
                    </div>
                  </fieldset>

                  {permissionPagination.showPagination && (
                    <Pagination
                      page={permissionPagination.page}
                      pages={permissionPagination.totalPages}
                      total={permissionPagination.total}
                      pageSize={permissionPagination.pageSize}
                      pageSizeOptions={[10, 20, 40]}
                      onPage={permissionPagination.setPage}
                      onPageSizeChange={permissionPagination.setPageSize}
                    />
                  )}

                  {canEdit ? (
                    <div className="flex items-center gap-3 pt-2 border-t border-hairline">
                      <Button type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu phân quyền'}</Button>
                    </div>
                  ) : (
                    <p className="admin-gap rounded-lg border border-hairline bg-canvas p-3 text-xs" role="note">
                      Ma trận quyền đang ở chế độ chỉ đọc trong MVP. Quyền thực tế trong từng đồ án được kiểm tra theo phân công và trạng thái hồ sơ.
                    </p>
                  )}
                </form>
              ) : (
                <div className="workspace-empty-detail py-10 text-center">
                  <span className="material-symbols-outlined text-4xl text-primary" aria-hidden="true">admin_panel_settings</span>
                  <h3 className="mt-2 font-heading text-base font-bold text-ink">Chọn vai trò để xem ma trận quyền</h3>
                  <p className="mt-1 text-sm text-ink-muted">Chọn một vai trò ở danh sách bên trái để kiểm tra các quyền truy cập được cấp trên hệ thống.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}

      <p className="admin-gap text-xs">Các vai trò theo đồ án như trưởng nhóm, giảng viên hướng dẫn và người chấm được cấp qua phân công, không gán tại đây.</p>
      {confirmationDialog}
    </div>
  )
}
