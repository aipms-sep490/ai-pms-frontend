import { useEffect, useMemo, useState } from 'react'
import { BackLink } from '../../../components/ui/BackLink'
import { Button } from '../../../components/ui/Button'
import { displayLabel } from '../../../components/ui/display-label'
import { FilterToolbar, type ActiveFilterChip } from '../../../components/ui/FilterToolbar'
import { ListLoading } from '../../../components/ui/ListLoading'
import { Pagination } from '../../../components/ui/Pagination'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { useClientPagination } from '../../../components/ui/useClientPagination'
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
  // Permission matrix is strictly read-only per QD-10 (runtime auth uses 4 system roles + project assignment scope).
  const canEdit = false
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [filter, setFilter] = useState('')
  const [grantFilter, setGrantFilter] = useState<'all' | 'granted' | 'ungranted'>('all')
  const [moduleFilter, setModuleFilter] = useState('')
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [errorNotice, setErrorNotice] = useState<string | null>(null)
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()

  const roles = useMemo(() => admin.rbac.value?.roles ?? [], [admin.rbac.value?.roles])
  const allPermissions = useMemo(() => admin.rbac.value?.permissions ?? [], [admin.rbac.value?.permissions])

  useEffect(() => {
    if (selectedRoleId === null && roles.length > 0) {
      const first = roles[0]
      setSelectedRoleId(first.id)
      setSelectedPermissionIds(new Set(first.permissions.map(item => item.id)))
    }
  }, [roles, selectedRoleId])

  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? null

  const isDirty = useMemo(() => {
    if (!selectedRole) return false
    const original = new Set(selectedRole.permissions.map(p => p.id))
    if (original.size !== selectedPermissionIds.size) return true
    for (const id of selectedPermissionIds) {
      if (!original.has(id)) return true
    }
    return false
  }, [selectedPermissionIds, selectedRole])

  const moduleGroups = useMemo(() => {
    const groups = new Set<string>()
    for (const perm of allPermissions) groups.add(moduleGroupFor(perm.code))
    return [...groups].sort((a, b) => a.localeCompare(b, 'vi'))
  }, [allPermissions])

  const permissions = useMemo(() => {
    const query = filter.trim().toLowerCase()
    return allPermissions.filter((item) => {
      if (grantFilter === 'granted' && !selectedPermissionIds.has(item.id)) return false
      if (grantFilter === 'ungranted' && selectedPermissionIds.has(item.id)) return false
      if (moduleFilter && moduleGroupFor(item.code) !== moduleFilter) return false
      if (query && !`${item.code} ${item.name} ${item.description ?? ''}`.toLowerCase().includes(query)) return false
      return true
    })
  }, [allPermissions, filter, grantFilter, moduleFilter, selectedPermissionIds])

  const rolesPagination = useClientPagination(roles, 10)
  const permissionsPagination = useClientPagination(permissions, 10)

  const groupedPermissions = useMemo(() => {
    const map = new Map<string, Permission[]>()
    for (const perm of permissionsPagination.paginatedItems) {
      const group = moduleGroupFor(perm.code)
      const list = map.get(group) ?? []
      list.push(perm)
      map.set(group, list)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'vi'))
  }, [permissionsPagination.paginatedItems])

  const permissionChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = []
    if (filter.trim()) chips.push({ id: 'search', label: 'Từ khóa', value: filter.trim() })
    if (grantFilter === 'granted') chips.push({ id: 'grant', label: 'Trạng thái', value: 'Đã cấp' })
    if (grantFilter === 'ungranted') chips.push({ id: 'grant', label: 'Trạng thái', value: 'Chưa cấp' })
    if (moduleFilter) chips.push({ id: 'module', label: 'Phân hệ', value: moduleFilter })
    return chips
  }, [filter, grantFilter, moduleFilter])

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
          <div className="workspace-context">
            <BackLink className="workspace-back-inline" fallback="/admin/access">
              <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
              <span>Về tổng quan</span>
            </BackLink>
            <span className="workspace-context-sep" aria-hidden="true" />
            <p className="admin-kicker !m-0">Phân quyền nền tảng</p>
          </div>
          <h1 id="rbac-title">Vai trò và quyền truy cập</h1>
          <p>
            {canEdit ? 'Quản lý quyền truy cập của từng vai trò.' : 'Xem quyền truy cập của từng vai trò (chỉ đọc).'} Phân công trong đồ án được quản lý ở không gian học vụ.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" icon="refresh" aria-label="Tải lại" onClick={admin.refresh} />
        </div>
      </header>

      {notice ? (
        <p className="admin-notice" role="status">
          <span className="material-symbols-outlined admin-notice__icon" aria-hidden="true">check_circle</span>
          <span>{notice}</span>
        </p>
      ) : null}
      {errorNotice ? <p className="admin-error" role="alert">{errorNotice}</p> : null}
      {admin.rbac.state === 'loading' ? <ListLoading label="Đang tải danh mục phân quyền…" /> : null}
      {admin.rbac.state === 'error' ? (
        <p className="admin-error" role="alert">
          {fail ? 'Bạn không có quyền quản lý phân quyền.' : 'Chưa tải được danh mục phân quyền.'}{' '}
          <Button size="sm" variant="outline" onClick={admin.refresh}>Thử lại</Button>
        </p>
      ) : null}

      {admin.rbac.state === 'ready' ? (
        <div className="mt-5">
          <StatTileRow
            tiles={[
              { icon: 'admin_panel_settings', label: 'Tổng vai trò', value: roles.length, hero: true, caption: 'Các vai trò đang quản lý trong hệ thống.' },
              { icon: 'key', label: 'Quyền toàn hệ thống', value: allPermissions.length, tone: 'info', caption: 'Toàn bộ mã quyền theo phân hệ.' },
              { icon: 'verified_user', label: 'Quyền vai trò chọn', value: selectedRole ? `${selectedPermissionIds.size}/${allPermissions.length}` : '—', tone: 'success', caption: selectedRole ? displayLabel(selectedRole.code) : 'Chọn một vai trò để xem.' },
              { icon: 'lock', label: 'Chế độ phân quyền', value: canEdit ? 'Cho phép sửa' : 'Chỉ đọc', tone: canEdit ? 'warning' : 'neutral', caption: canEdit ? 'Mọi thay đổi yêu cầu xác nhận.' : 'Bảo vệ chống chỉnh sửa ngoài ý muốn.' },
            ]}
          />
        </div>
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
            <div className="flex flex-col justify-between gap-3">
              <ul className="admin-role-list">
                {rolesPagination.paginatedItems.map((role) => (
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
              {rolesPagination.showPagination && (
                <Pagination
                  page={rolesPagination.page}
                  pages={rolesPagination.pages}
                  total={rolesPagination.total}
                  pageSize={rolesPagination.pageSize}
                  onPage={rolesPagination.setPage}
                  onPageSizeChange={rolesPagination.setPageSize}
                />
              )}
            </div>

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
                      label={`Đã cấp ${selectedPermissionIds.size}/${allPermissions.length} quyền`}
                    />
                  </div>

                  <FilterToolbar
                    embedded
                    debounceMs={0}
                    ariaLabel="Bộ lọc quyền truy cập"
                    search={filter}
                    onSearchChange={setFilter}
                    searchLabel="Tìm quyền truy cập"
                    searchPlaceholder="Nhập mã hoặc tên quyền…"
                    activeTab={grantFilter}
                    onTabChange={(value) => setGrantFilter(value as 'all' | 'granted' | 'ungranted')}
                    tabsLabel="Lọc theo trạng thái cấp quyền"
                    tabs={[
                      { value: 'all', label: 'Tất cả', count: allPermissions.length },
                      { value: 'granted', label: 'Đã cấp', count: selectedPermissionIds.size },
                      { value: 'ungranted', label: 'Chưa cấp', count: Math.max(0, allPermissions.length - selectedPermissionIds.size) },
                    ]}
                    controls={
                      moduleGroups.length > 1 ? (
                        <label className="ft-select-wrap">
                          <span className="sr-only">Phân hệ</span>
                          <select
                            aria-label="Phân hệ"
                            value={moduleFilter}
                            onChange={(event) => setModuleFilter(event.target.value)}
                          >
                            <option value="">Tất cả phân hệ</option>
                            {moduleGroups.map((group) => (
                              <option key={group} value={group}>{group}</option>
                            ))}
                          </select>
                        </label>
                      ) : undefined
                    }
                    activeChips={permissionChips}
                    onRemoveChip={(id) => {
                      if (id === 'search') setFilter('')
                      if (id === 'grant') setGrantFilter('all')
                      if (id === 'module') setModuleFilter('')
                    }}
                    onClearAll={() => {
                      setFilter('')
                      setGrantFilter('all')
                      setModuleFilter('')
                    }}
                    hasActiveFilters={permissionChips.length > 0}
                  />

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
                  {permissionsPagination.showPagination && (
                    <Pagination
                      page={permissionsPagination.page}
                      pages={permissionsPagination.pages}
                      total={permissionsPagination.total}
                      pageSize={permissionsPagination.pageSize}
                      onPage={permissionsPagination.setPage}
                      onPageSizeChange={permissionsPagination.setPageSize}
                    />
                  )}

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
                      Ma trận quyền hiện đang ở chế độ chỉ đọc (tham khảo). Để cấp hoặc thu hồi 4 vai trò hệ thống (ADMIN, DEPARTMENT_STAFF, LECTURER, STUDENT), vui lòng thao tác tại{' '}
                      <a href="/admin/users" className="font-semibold text-primary underline">Quản lý tài khoản</a>. Quyền thực tế trong từng đồ án được kiểm tra theo phân công và trạng thái hồ sơ.
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
