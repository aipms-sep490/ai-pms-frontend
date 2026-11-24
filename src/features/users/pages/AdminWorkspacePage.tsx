import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { displayLabel } from '../../../components/ui/display-label'
import { FilterToolbar, type ActiveFilterChip } from '../../../components/ui/FilterToolbar'
import { ListLoading } from '../../../components/ui/ListLoading'
import { Modal } from '../../../components/ui/Modal'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import '../../../components/ui/workspace-tabs.css'
import type { BadgeTone } from '../../../components/ui/status-badge-tone'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../../../components/ui/Table'
import { WorkspaceEmptyState } from '../../../components/ui/WorkspaceState'
import { humanizeHttpError } from '../../../services/http/humanize-http-error'
import { getAcademicHierarchy } from '../../academic/api/academic-api'
import { AcademicScopeFields } from '../../academic/components/AcademicScopeFields'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { utcTimestamp } from '../../projects/utils/collaboration-workspace'
import { exportAdminUserAccounts, type Audit, type UserAccount, type UserDraft } from '../api/admin-api'
import { AccessEventsPanel } from '../components/AccessEventsPanel'
import { StudentImportDialog } from '../components/StudentImportDialog'
import { SystemStatusPanel } from '../components/SystemStatusPanel'
import { useAdminWorkspace } from '../hooks/useAdminWorkspace'
import './admin-workspace.css'

const blankAccount: UserDraft = {
  departmentId: null,
  majorId: null,
  email: '',
  password: '',
  fullName: '',
  phone: null,
  studentCode: null,
  employeeCode: null,
  title: null,
  roleIds: [],
}

const messageFor = (reason: unknown) => humanizeHttpError(reason, 'Chưa thể hoàn tất thao tác. Hãy thử lại.')
const integer = (value: FormDataEntryValue | null) => {
  const result = Number(value)
  return Number.isInteger(result) && result > 0 ? result : null
}

function auditDateBoundary(day: string, end = false): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return undefined
  const date = new Date(`${day}T${end ? '23:59:59.999' : '00:00:00.000'}+07:00`)
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined
}

function formatSafeTimestamp(value: string | null | undefined, options: Intl.DateTimeFormatOptions): string {
  if (!value) return 'Chưa ghi nhận'
  const ts = utcTimestamp(value)
  if (!Number.isFinite(ts)) return 'Chưa ghi nhận'
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', ...options }).format(ts)
}

const AUDIT_ENTITY_LABELS: Record<string, string> = {
  USER: 'Người dùng',
  ROLE: 'Vai trò',
  PERMISSION: 'Quyền truy cập',
  PROJECT: 'Đồ án',
  ACADEMIC_PROFILE: 'Hồ sơ học vụ',
  EXPERT_INVITATION: 'Lời mời chuyên gia',
  CHAT: 'Trò chuyện',
  ASSISTANT: 'Trợ lý AI',
}

type AccountSort = 'default' | 'name' | 'lastLogin'

export function AdminWorkspacePage() {
  const { session } = useAuthSession()
  const [academicNames, setAcademicNames] = useState<{
    departments: Record<number, string>
    majors: Record<number, string>
    majorsByDepartment: Record<number, Array<{ id: number; name: string }>>
  }>({ departments: {}, majors: {}, majorsByDepartment: {} })

  useEffect(() => {
    const abort = new AbortController()
    setAcademicNames({ departments: {}, majors: {}, majorsByDepartment: {} })
    if (session?.accessToken) {
      void getAcademicHierarchy(session.accessToken, { search: '', includeInactive: true }, abort.signal)
        .then(rows => {
          if (abort.signal.aborted) return
          const departments: Record<number, string> = {}
          const majors: Record<number, string> = {}
          const majorsByDepartment: Record<number, Array<{ id: number; name: string }>> = {}
          for (const organization of rows) {
            for (const entry of organization.departments) {
              departments[entry.department.id] = entry.department.name
              majorsByDepartment[entry.department.id] = entry.majors.map(m => ({ id: m.id, name: m.name }))
              for (const major of entry.majors) majors[major.id] = major.name
            }
          }
          setAcademicNames({ departments, majors, majorsByDepartment })
        })
        .catch(() => undefined)
    }
    return () => abort.abort()
  }, [session?.accessToken])

  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1)
  const pageSize = Math.max(1, Number(params.get('pageSize') ?? '10') || 10)
  const search = params.get('search') ?? ''
  const status = params.get('status') ?? ''
  const roleFilter = params.get('role') ?? ''
  const departmentFilter = params.get('departmentId') ?? ''
  const majorFilter = params.get('majorId') ?? ''
  const departmentIdNum = Number(departmentFilter) > 0 ? Number(departmentFilter) : undefined
  const majorIdNum = Number(majorFilter) > 0 ? Number(majorFilter) : undefined
  const auditPage = Math.max(1, Number(params.get('auditPage') ?? '1') || 1)
  const auditPageSize = Math.max(1, Number(params.get('auditPageSize') ?? '10') || 10)
  const auditAction = params.get('auditAction') ?? ''
  const auditEntityType = params.get('auditEntityType') ?? ''
  const auditOutcome = params.get('auditOutcome') ?? ''
  const auditFrom = params.get('auditFrom') ?? ''
  const auditTo = params.get('auditTo') ?? ''
  const admin = useAdminWorkspace(
    {
      search,
      status: status || undefined,
      role: roleFilter || undefined,
      departmentId: departmentIdNum,
      majorId: majorIdNum,
      page,
      pageSize,
    },
    {
      action: auditAction || undefined,
      entityType: auditEntityType || undefined,
      outcome: auditOutcome || undefined,
      fromUtc: auditDateBoundary(auditFrom),
      toUtc: auditDateBoundary(auditTo, true),
      page: auditPage,
      pageSize: auditPageSize,
    },
  )

  const [sortBy, setSortBy] = useState<AccountSort>('default')
  const [notice, setNotice] = useState<string | null>(null)
  const [errorNotice, setErrorNotice] = useState<string | null>(null)
  const [importText, setImportText] = useState('')
  const [accountScope, setAccountScope] = useState({ departmentId: '', majorId: '' })
  const [busy, setBusy] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [jsonImportOpen, setJsonImportOpen] = useState(false)
  const [studentImportOpen, setStudentImportOpen] = useState(false)
  const [exportingAccounts, setExportingAccounts] = useState(false)
  const busyRef = useRef(false)
  const exportAbortRef = useRef<AbortController | null>(null)
  useEffect(() => () => { exportAbortRef.current?.abort(); exportAbortRef.current = null }, [])

  const globalRoles = useMemo(
    () => (admin.rbac.value?.roles ?? []).filter((role) => role.isAssignableGlobalRole && role.assignmentKind === 'GLOBAL'),
    [admin.rbac.value?.roles],
  )

  const userNameMap = useMemo(() => {
    const map: Record<number, { fullName: string; email?: string | null }> = {}
    if (admin.users.state === 'ready') {
      for (const user of admin.users.value.items) {
        map[user.id] = { fullName: user.fullName, email: user.email }
      }
    }
    return map
  }, [admin.users])

  const availableMajors = useMemo(() => {
    if (departmentFilter) {
      return academicNames.majorsByDepartment[Number(departmentFilter)] ?? []
    }
    return Object.entries(academicNames.majors).map(([id, name]) => ({ id: Number(id), name }))
  }, [academicNames.majors, academicNames.majorsByDepartment, departmentFilter])

  const filteredUsers = useMemo(() => {
    if (admin.users.state !== 'ready') return []
    const base = admin.users.value.items.filter((user) => {
      if (roleFilter && !user.roles.includes(roleFilter)) return false
      if (departmentFilter && String(user.departmentId ?? '') !== departmentFilter) return false
      if (majorFilter && String(user.majorId ?? '') !== majorFilter) return false
      return true
    })
    if (sortBy === 'name') {
      return [...base].sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'))
    }
    if (sortBy === 'lastLogin') {
      return [...base].sort((a, b) => {
        const ta = a.lastLoginAt ? utcTimestamp(a.lastLoginAt) : 0
        const tb = b.lastLoginAt ? utcTimestamp(b.lastLoginAt) : 0
        return tb - ta
      })
    }
    return base
  }, [admin.users, departmentFilter, majorFilter, roleFilter, sortBy])

  const setFilter = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)))
    const isAuditPatch = Object.keys(patch).every((key) => key.startsWith('audit'))
    if (isAuditPatch) {
      if (!('auditPage' in patch)) next.set('auditPage', '1')
    } else if (!('page' in patch)) {
      next.set('page', '1')
    }
    setParams(next)
  }

  const run = async (action: () => Promise<unknown>, success: string) => {
    if (busyRef.current) return false
    busyRef.current = true
    setBusy(true)
    setNotice(null)
    setErrorNotice(null)
    try {
      await action()
      setNotice(success)
      return true
    } catch (reason) {
      setErrorNotice(messageFor(reason))
      return false
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  async function handleExportAccounts() {
    if (!session?.accessToken || exportingAccounts || exportAbortRef.current) return
    const controller = new AbortController()
    exportAbortRef.current = controller
    setExportingAccounts(true)
    setNotice(null)
    try {
      const blob = await exportAdminUserAccounts({
        search: search || undefined,
        status: status || undefined,
        role: roleFilter || undefined,
        departmentId: departmentIdNum,
        majorId: majorIdNum,
      }, session.accessToken, controller.signal)
      if (controller.signal.aborted) return
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      try {
        anchor.href = url
        anchor.download = 'system-accounts.xlsx'
        document.body.appendChild(anchor)
        anchor.click()
      } finally {
        anchor.remove()
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      }
      setNotice('Đã xuất tệp Excel danh sách tài khoản hệ thống theo bộ lọc hiện tại.')
    } catch (reason) {
      if (!controller.signal.aborted) setNotice(messageFor(reason))
    } finally {
      if (exportAbortRef.current === controller) { exportAbortRef.current = null; setExportingAccounts(false) }
    }
  }

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const element = event.currentTarget
    const form = new FormData(element)
    const roleIds = Array.from(form.getAll('roleIds')).map(Number).filter(Boolean)
    void run(
      () => admin.createUser({
        ...blankAccount,
        fullName: String(form.get('fullName') ?? '').trim(),
        email: String(form.get('email') ?? '').trim(),
        password: String(form.get('password') ?? ''),
        studentCode: String(form.get('studentCode') ?? '').trim() || null,
        employeeCode: String(form.get('employeeCode') ?? '').trim() || null,
        departmentId: integer(form.get('departmentId')),
        majorId: integer(form.get('majorId')),
        roleIds,
      }),
      'Máy chủ đã tạo tài khoản.',
    ).then(ok => {
      if (ok) {
        element.reset()
        setAccountScope({ departmentId: '', majorId: '' })
        setCreateOpen(false)
      }
    })
  }

  function submitImport() {
    try {
      const accounts = JSON.parse(importText) as UserDraft[]
      if (!Array.isArray(accounts) || !accounts.length) throw new Error('invalid')
      void run(() => admin.importUsers(accounts), 'Máy chủ đã nhập toàn bộ lô tài khoản.').then(ok => {
        if (ok) {
          setImportText('')
          setJsonImportOpen(false)
        }
      })
    } catch {
      setNotice(null)
      setErrorNotice('Tệp JSON phải là mảng tài khoản theo cấu trúc yêu cầu. Lô không được gửi khi dữ liệu chưa hợp lệ.')
    }
  }

  const accountChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = []
    if (search) chips.push({ id: 'search', label: 'Từ khóa', value: search })
    if (status) {
      const label = status === 'ACTIVE' ? 'Đang hoạt động' : status === 'INACTIVE' ? 'Ngừng hoạt động' : 'Đang khóa'
      chips.push({ id: 'status', label: 'Trạng thái', value: label })
    }
    if (roleFilter) {
      chips.push({ id: 'role', label: 'Vai trò', value: roleFilter === 'LECTURER' ? 'Giảng viên' : displayLabel(roleFilter) })
    }
    if (departmentFilter) {
      chips.push({ id: 'department', label: 'Bộ môn', value: academicNames.departments[Number(departmentFilter)] ?? departmentFilter })
    }
    if (majorFilter) {
      chips.push({ id: 'major', label: 'Ngành', value: academicNames.majors[Number(majorFilter)] ?? majorFilter })
    }
    return chips
  }, [academicNames.departments, academicNames.majors, departmentFilter, majorFilter, roleFilter, search, status])

  const auditChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = []
    if (auditAction) chips.push({ id: 'auditAction', label: 'Hành động', value: auditActionLabel(auditAction) })
    if (auditEntityType) chips.push({ id: 'auditEntityType', label: 'Đối tượng', value: AUDIT_ENTITY_LABELS[auditEntityType] ?? displayLabel(auditEntityType) })
    if (auditOutcome) chips.push({ id: 'auditOutcome', label: 'Kết quả', value: auditOutcome === 'SUCCESS' ? 'Thành công' : 'Thất bại' })
    if (auditFrom) chips.push({ id: 'auditFrom', label: 'Từ ngày', value: auditFrom })
    if (auditTo) chips.push({ id: 'auditTo', label: 'Đến ngày', value: auditTo })
    return chips
  }, [auditAction, auditEntityType, auditFrom, auditOutcome, auditTo])

  const activeTab = params.get('tab') === 'audit' ? 'audit' : params.get('tab') === 'access' ? 'access' : 'accounts'
  const departmentEntries = Object.entries(academicNames.departments)
  const hasCustomAuditAction = Boolean(auditAction && !(auditAction in AUDIT_ACTION_LABELS))
  const hasCustomAuditEntity = Boolean(auditEntityType && !(auditEntityType in AUDIT_ENTITY_LABELS))

  return (
    <div className="workspace-page admin-workspace" aria-labelledby="admin-title">
      <header className="admin-heading">
        <div>
          <p className="admin-kicker">Quản trị nền tảng</p>
          <h1 id="admin-title">Hệ thống và quyền truy cập</h1>
          <p>Quản lý tài khoản, phân quyền và theo dõi hoạt động trên hệ thống.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" icon="refresh" aria-label="Tải lại" onClick={admin.refresh} />
          <Link className="admin-link-button" to="/academic/governance">Quản lý học vụ</Link>
          <Link className="admin-link-button" to="/academic">Cấu trúc tổ chức</Link>
        </div>
      </header>

      {notice ? (
        <p className="admin-notice" role="status">
          <span className="material-symbols-outlined admin-notice__icon" aria-hidden="true">check_circle</span>
          <span>{notice}</span>
        </p>
      ) : null}
      {errorNotice ? <p className="admin-error" role="alert">{errorNotice}</p> : null}

      <div className="mt-5">
        <StatTileRow
          tiles={[
            {
              icon: 'group',
              label: 'Tài khoản theo bộ lọc',
              value: admin.users.state === 'ready' ? admin.users.value.totalCount : admin.users.state === 'error' ? 'Lỗi' : null,
              hero: true,
              caption: admin.users.state === 'error' ? 'Chưa tải được danh sách tài khoản.' : 'Tài khoản trong phạm vi bộ lọc hiện tại.',
            },
            {
              icon: 'admin_panel_settings',
              label: 'Vai trò hệ thống',
              value: admin.rbac.state === 'ready' ? globalRoles.length : admin.rbac.state === 'error' ? 'Lỗi' : null,
              tone: 'info',
              caption: admin.rbac.state === 'error' ? 'Chưa tải được danh mục vai trò.' : 'Vai trò toàn cục được phép gán.',
            },
            {
              icon: 'verified_user',
              label: 'Hoạt động đã ghi nhận',
              value: admin.audit.state === 'ready' ? admin.audit.value.totalCount : admin.audit.state === 'error' ? 'Lỗi' : null,
              tone: 'neutral',
              caption: admin.audit.state === 'error' ? 'Chưa tải được nhật ký bảo mật.' : 'Sự kiện quản trị và bảo mật hệ thống.',
            },
            {
              icon: 'key',
              label: 'Danh mục quyền',
              value: admin.rbac.state === 'ready' ? (admin.rbac.value?.permissions.length ?? 0) : admin.rbac.state === 'error' ? 'Lỗi' : null,
              tone: 'success',
              caption: 'Tổng quyền phân hệ đang được áp dụng.',
            },
          ]}
        />
      </div>

      <SystemStatusPanel />

      <nav className="mt-4 flex flex-wrap items-center justify-between gap-3" aria-label="Khu vực quản trị">
        <div className="ui-workspace-tabs">
          <button type="button" className={`ui-workspace-tab ${activeTab === 'accounts' ? 'is-active' : ''}`} aria-controls="accounts" aria-pressed={activeTab === 'accounts'} onClick={() => setFilter({ tab: 'accounts' })}>
            <span className="material-symbols-outlined ui-workspace-tab-icon" aria-hidden="true">group</span>
            <span>Tài khoản người dùng</span>
          </button>
          <button type="button" className={`ui-workspace-tab ${activeTab === 'access' ? 'is-active' : ''}`} aria-controls="access-events" aria-pressed={activeTab === 'access'} onClick={() => setFilter({ tab: 'access' })}>
            <span className="material-symbols-outlined ui-workspace-tab-icon" aria-hidden="true">login</span>
            <span>Nhật ký truy cập</span>
          </button>
          <button type="button" className={`ui-workspace-tab ${activeTab === 'audit' ? 'is-active' : ''}`} aria-controls="audit" aria-pressed={activeTab === 'audit'} onClick={() => setFilter({ tab: 'audit' })}>
            <span className="material-symbols-outlined ui-workspace-tab-icon" aria-hidden="true">security</span>
            <span>Nhật ký bảo mật</span>
          </button>
        </div>
        <div className="admin-nav-links" aria-label="Trang quản trị liên quan">
          <Link to="/admin/access/rbac">Phân quyền</Link>
          <Link to="/academic/governance">Học kỳ & Kỳ đồ án</Link>
        </div>
      </nav>

      <section id="accounts" className="admin-panel" aria-labelledby="accounts-title" hidden={activeTab !== 'accounts'}>
        <div className="admin-panel-heading admin-roster-heading">
          <div>
            <h2 id="accounts-title">Tài khoản người dùng</h2>
            <p>Tìm kiếm, lọc theo vai trò, khoa/ngành, trạng thái và quản lý vòng đời tài khoản. Vai trò hệ thống được quản lý riêng với phân công trong đồ án.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button icon="person_add" onClick={() => { setErrorNotice(null); setCreateOpen(true) }}>Tạo tài khoản</Button>
            <Button variant="secondary" icon="upload" onClick={() => setStudentImportOpen(true)}>Nhập sinh viên từ Excel</Button>
            <Button variant="outline" icon="data_object" onClick={() => { setErrorNotice(null); setJsonImportOpen(true) }}>Nhập JSON</Button>
            <Button variant="outline" icon="download" disabled={exportingAccounts} onClick={() => void handleExportAccounts()}>{exportingAccounts ? 'Đang xuất…' : 'Xuất Excel Tài khoản'}</Button>
          </div>
        </div>

        {studentImportOpen && <StudentImportDialog onClose={() => setStudentImportOpen(false)} onImported={admin.refresh} />}

        <div className="mt-4">
          <FilterToolbar
            embedded
            className="ft-bar--compact"
            ariaLabel="Bộ lọc tài khoản người dùng"
            search={search}
            onSearchChange={(value) => setFilter({ search: value, page: '1' })}
            searchPlaceholder="Tìm tên, email…"
            searchLabel="Tìm kiếm tài khoản"
            activeTab={status}
            onTabChange={(value) => setFilter({ status: value, page: '1' })}
            tabsLabel="Lọc theo trạng thái tài khoản"
            tabs={[
              { value: '', label: 'Tất cả' },
              { value: 'ACTIVE', label: 'Đang hoạt động' },
              { value: 'INACTIVE', label: 'Ngừng hoạt động' },
              { value: 'SUSPENDED', label: 'Đang khóa' },
            ]}
            controls={
              <>
                {globalRoles.length > 0 && (
                  <label className="ft-select-wrap">
                    <span className="sr-only">Lọc theo vai trò hệ thống</span>
                    <select aria-label="Vai trò hệ thống" value={roleFilter} onChange={(e) => setFilter({ role: e.target.value, page: '1' })}>
                      <option value="">Mọi vai trò</option>
                      {globalRoles.map(role => (
                        <option key={role.id} value={role.code}>
                          {role.code === 'LECTURER' ? 'Giảng viên' : displayLabel(role.code)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {departmentEntries.length > 0 && (
                  <label className="ft-select-wrap">
                    <span className="sr-only">Lọc theo bộ môn</span>
                    <select
                      aria-label="Bộ môn"
                      value={departmentFilter}
                      onChange={(e) => setFilter({ departmentId: e.target.value, majorId: '', page: '1' })}
                    >
                      <option value="">Mọi bộ môn</option>
                      {departmentEntries.map(([id, name]) => (
                        <option key={id} value={id}>{name}</option>
                      ))}
                    </select>
                  </label>
                )}
                {availableMajors.length > 0 && (
                  <label className="ft-select-wrap">
                    <span className="sr-only">Lọc theo chuyên ngành</span>
                    <select aria-label="Chuyên ngành" value={majorFilter} onChange={(e) => setFilter({ majorId: e.target.value, page: '1' })}>
                      <option value="">Mọi chuyên ngành</option>
                      {availableMajors.map((major) => (
                        <option key={major.id} value={String(major.id)}>{major.name}</option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            }
            sort={{
              value: sortBy,
              onChange: (value) => setSortBy(value as AccountSort),
              options: [
                { value: 'default', label: 'Mặc định' },
                { value: 'name', label: 'Tên A–Z' },
                { value: 'lastLogin', label: 'Mới đăng nhập' },
              ],
            }}
            activeChips={accountChips}
            onRemoveChip={(id) => {
              if (id === 'search') setFilter({ search: '', page: '1' })
              if (id === 'status') setFilter({ status: '', page: '1' })
              if (id === 'role') setFilter({ role: '', page: '1' })
              if (id === 'department') setFilter({ departmentId: '', majorId: '', page: '1' })
              if (id === 'major') setFilter({ majorId: '', page: '1' })
            }}
            onClearAll={() => {
              setFilter({ search: '', status: '', role: '', departmentId: '', majorId: '', page: '1' })
              setSortBy('default')
            }}
            hasActiveFilters={accountChips.length > 0}
            resultSummary={
              admin.users.state === 'ready' && (roleFilter || departmentFilter || majorFilter)
                ? `Hiển thị ${filteredUsers.length} / ${admin.users.value.totalCount} tài khoản`
                : undefined
            }
          />
        </div>

        {admin.users.state === 'loading' ? <ListLoading label="Đang tải danh sách tài khoản…" /> : null}
        {admin.users.state === 'error' ? (
          <Failure
            message={admin.isForbidden(admin.users) ? 'Bạn không có quyền quản trị tài khoản.' : 'Chưa tải được danh sách tài khoản.'}
            retry={admin.refresh}
          />
        ) : null}

        {admin.users.state === 'ready' && filteredUsers.length > 0 ? (
          <div className="mt-4 -mx-4 sm:-mx-5">
            <Table stack className="text-[13px]">
              <TableHead>
                <TableRow head>
                  <TableHeaderCell className="px-2 first:pl-3">Người dùng</TableHeaderCell>
                  <TableHeaderCell className="px-2">Vai trò hệ thống</TableHeaderCell>
                  <TableHeaderCell className="px-2">Trạng thái</TableHeaderCell>
                  <TableHeaderCell className="px-2">Đăng nhập gần nhất</TableHeaderCell>
                  <TableHeaderCell className="px-2">Phạm vi học thuật</TableHeaderCell>
                  <TableHeaderCell className="px-2 text-right last:pr-3">Thao tác</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell label="Người dùng" className="px-2 first:pl-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={user.fullName} size="sm" />
                        <div className="flex min-w-0 flex-col">
                          <strong className="truncate max-w-[148px] text-ink" title={user.fullName}>{user.fullName}</strong>
                          <span className="truncate max-w-[148px] text-xs text-ink-muted" title={user.email}>{user.email}</span>
                          <span className="font-mono text-xs text-ink-muted">{user.studentCode ?? user.employeeCode ?? 'Không có mã'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell label="Vai trò hệ thống" className="px-2">
                      {user.roles
                        .filter((role) => globalRoles.some((globalRole) => globalRole.code === role))
                        .map(role => (role === 'LECTURER' ? 'Giảng viên' : role === 'EVALUATOR' ? 'Người chấm' : displayLabel(role)))
                        .join(', ') || 'Chưa gán'}
                    </TableCell>
                    <TableCell label="Trạng thái" className="whitespace-nowrap px-2"><Status status={user.status} /></TableCell>
                    <TableCell label="Đăng nhập gần nhất" className="whitespace-nowrap px-2 text-xs tabular-nums">
                      {user.lastLoginAt ? (
                        <time dateTime={user.lastLoginAt}>
                          {formatSafeTimestamp(user.lastLoginAt, {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </time>
                      ) : 'Chưa ghi nhận'}
                    </TableCell>
                    <TableCell label="Phạm vi học thuật" className="px-2">
                      <div className="flex flex-col">
                        <span>
                          {user.departmentId ? academicNames.departments[user.departmentId] ?? 'Chưa tải được tên bộ môn' : 'Chưa liên kết bộ môn'}
                          {user.majorId ? ` · ${academicNames.majors[user.majorId] ?? 'Chưa tải được tên ngành'}` : ''}
                        </span>
                        {(user.classCode || user.specializationName) && (
                          <span className="text-xs text-ink-muted">
                            {[user.classCode ? `Lớp ${user.classCode}` : null, user.specializationName].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell label="Thao tác" className="whitespace-nowrap px-2 text-right last:pr-3">
                      <Link className="whitespace-nowrap font-semibold text-primary hover:underline" to={`/admin/access/users/${user.id}`} state={{ returnTo: `/admin/access?${params.toString()}` }}>
                        Xem chi tiết
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}

        {admin.users.state === 'ready' && filteredUsers.length === 0 ? (
          <div className="mt-4">
            <WorkspaceEmptyState
              title="Không có tài khoản phù hợp với bộ lọc hiện tại."
              message="Thử xóa bộ lọc đang áp dụng hoặc tạo tài khoản mới."
              action={
                accountChips.length > 0 ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFilter({ search: '', status: '', role: '', departmentId: '', majorId: '', page: '1' })
                      setSortBy('default')
                    }}
                  >
                    Đặt lại bộ lọc
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : null}

        {admin.users.state === 'ready' && (
          <Pagination
            page={admin.users.value.page}
            pageSize={admin.users.value.pageSize}
            total={admin.users.value.totalCount}
            onPage={(next) => setFilter({ page: String(next) })}
            onPageSizeChange={(size) => setFilter({ pageSize: String(size), page: '1' })}
          />
        )}

        <p className="admin-gap">Mở hồ sơ từng tài khoản để cập nhật bộ môn và ngành. Cập nhật khung CTĐT, xác minh hồ sơ sinh viên và xuất danh sách nhóm thuộc thẩm quyền Giáo vụ Khoa.</p>
      </section>

      {activeTab === 'accounts' && admin.audit.state === 'ready' && admin.audit.value.items.length > 0 ? (
        <section className="admin-panel admin-activity-preview" aria-labelledby="admin-activity-title">
          <div className="admin-panel-heading">
            <div>
              <h2 id="admin-activity-title">Hoạt động bảo mật được ghi nhận</h2>
              <p>Các bản ghi trong trang nhật ký hiện tại. Mở nhật ký để lọc và xem thêm.</p>
            </div>
            <Button type="button" variant="secondary" onClick={() => setFilter({ tab: 'audit' })}>Xem nhật ký</Button>
          </div>
          <ul className="admin-activity-list">
            {admin.audit.value.items.slice(0, 4).map(record => (
              <li key={record.id}>
                <span className={`admin-activity-indicator ${record.outcome === 'SUCCESS' ? 'is-success' : 'is-failure'}`} aria-hidden="true" />
                <span>
                  <strong>{auditActionLabel(record.action)}</strong>
                  <small>
                    {formatAuditEntity(record)}
                    {record.actorName ? ` · bởi ${record.actorName}` : ''} · {record.outcome === 'SUCCESS' ? 'Thành công' : record.outcome === 'FAILURE' ? 'Thất bại' : displayLabel(record.outcome)}
                  </small>
                </span>
                <time dateTime={record.occurredAt}>
                  {formatSafeTimestamp(record.occurredAt, { dateStyle: 'short', timeStyle: 'short' })}
                </time>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {activeTab === 'access' && <AccessEventsPanel userNameMap={userNameMap} />}

      <section id="audit" className="admin-panel" aria-labelledby="audit-title" hidden={activeTab !== 'audit'}>
        <div className="admin-panel-heading">
          <div>
            <h2 id="audit-title">Nhật ký bảo mật</h2>
            <p>Theo dõi thời gian, người thực hiện và nội dung hoạt động quản trị.</p>
          </div>
          <Button variant="secondary" size="sm" icon="refresh" aria-label="Tải lại nhật ký bảo mật" onClick={admin.refresh} />
        </div>
        <div className="mt-4">
          <FilterToolbar
            embedded
            ariaLabel="Bộ lọc nhật ký bảo mật"
            controls={
              <>
                <label className="ft-select-wrap">
                  <span className="sr-only">Hành động</span>
                  <select
                    aria-label="Hành động"
                    value={auditAction}
                    onChange={(event) => setFilter({ auditAction: event.target.value })}
                  >
                    <option value="">Tất cả hành động</option>
                    {hasCustomAuditAction && <option value={auditAction}>{auditAction}</option>}
                    {Object.entries(AUDIT_ACTION_LABELS).map(([code, label]) => (
                      <option key={code} value={code}>{label}</option>
                    ))}
                  </select>
                </label>
                <label className="ft-select-wrap">
                  <span className="sr-only">Đối tượng</span>
                  <select
                    aria-label="Đối tượng"
                    value={auditEntityType}
                    onChange={(event) => setFilter({ auditEntityType: event.target.value })}
                  >
                    <option value="">Tất cả đối tượng</option>
                    {hasCustomAuditEntity && <option value={auditEntityType}>{displayLabel(auditEntityType)}</option>}
                    {Object.entries(AUDIT_ENTITY_LABELS).map(([code, label]) => (
                      <option key={code} value={code}>{label}</option>
                    ))}
                  </select>
                </label>
                <label className="ft-select-wrap">
                  <span className="sr-only">Kết quả</span>
                  <select
                    aria-label="Kết quả"
                    value={auditOutcome}
                    onChange={(event) => setFilter({ auditOutcome: event.target.value })}
                  >
                    <option value="">Mọi kết quả</option>
                    <option value="SUCCESS">Thành công</option>
                    <option value="FAILURE">Thất bại</option>
                  </select>
                </label>
                <label className="ft-select-wrap">
                  <span className="text-xs font-semibold text-ink-soft whitespace-nowrap">Từ ngày (giờ Việt Nam)</span>
                  <input
                    type="date"
                    value={auditFrom}
                    onChange={(event) => setFilter({ auditFrom: event.target.value })}
                  />
                </label>
                <label className="ft-select-wrap">
                  <span className="text-xs font-semibold text-ink-soft whitespace-nowrap">Đến ngày (giờ Việt Nam)</span>
                  <input
                    type="date"
                    value={auditTo}
                    onChange={(event) => setFilter({ auditTo: event.target.value })}
                  />
                </label>
              </>
            }
            activeChips={auditChips}
            onRemoveChip={(id) => setFilter({ [id]: '' })}
            onClearAll={() => setFilter({ auditAction: '', auditEntityType: '', auditOutcome: '', auditFrom: '', auditTo: '', auditPage: '1' })}
            hasActiveFilters={auditChips.length > 0}
            clearAllLabel="Đặt lại"
          />
        </div>
        {admin.audit.state === 'loading' ? <ListLoading label="Đang tải nhật ký…" /> : null}
        {admin.audit.state === 'error' ? (
          <Failure
            message={admin.isForbidden(admin.audit) ? 'Bạn không có quyền xem nhật ký bảo mật.' : 'Chưa tải được nhật ký bảo mật.'}
            retry={admin.refresh}
          />
        ) : null}
        {admin.audit.state === 'ready' && admin.audit.value.items.length > 0 ? (
          <Table stack className="mt-4">
            <TableHead>
              <TableRow head>
                <TableHeaderCell>Hành động</TableHeaderCell>
                <TableHeaderCell>Người thực hiện</TableHeaderCell>
                <TableHeaderCell>Đối tượng</TableHeaderCell>
                <TableHeaderCell>Kết quả</TableHeaderCell>
                <TableHeaderCell>Thời gian</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {admin.audit.value.items.map((record) => (
                <TableRow key={record.id}>
                  <TableCell label="Hành động"><strong title={record.action}>{auditActionLabel(record.action)}</strong></TableCell>
                  <TableCell label="Người thực hiện">{record.actorName?.trim() || 'Hệ thống'}</TableCell>
                  <TableCell label="Đối tượng">{formatAuditEntity(record)}</TableCell>
                  <TableCell label="Kết quả" className="whitespace-nowrap">
                    <StatusBadge
                      tone={record.outcome === 'SUCCESS' ? 'success' : 'danger'}
                      label={record.outcome === 'SUCCESS' ? 'Thành công' : record.outcome === 'FAILURE' ? 'Thất bại' : displayLabel(record.outcome)}
                    />
                  </TableCell>
                  <TableCell label="Thời gian" className="whitespace-nowrap">
                    <time dateTime={record.occurredAt}>
                      {formatSafeTimestamp(record.occurredAt, { dateStyle: 'short', timeStyle: 'short' })}
                    </time>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
        {admin.audit.state === 'ready' && admin.audit.value.totalCount === 0 ? (
          <p role="status" className="mt-4 text-sm text-ink-muted">Không có hoạt động phù hợp với bộ lọc hiện tại.</p>
        ) : null}
        {admin.audit.state === 'ready' && admin.audit.value.totalCount > 0 && (
          <Pagination
            page={admin.audit.value.page}
            pageSize={admin.audit.value.pageSize}
            total={admin.audit.value.totalCount}
            onPage={(next) => setFilter({ auditPage: String(next) })}
            onPageSizeChange={(size) => setFilter({ auditPageSize: String(size), auditPage: '1' })}
          />
        )}
      </section>

      {createOpen && (
        <Modal
          open
          onClose={() => { if (!busy) setCreateOpen(false) }}
          title="Tạo tài khoản đơn lẻ"
          description="Cấp tài khoản mới và gán vai trò toàn hệ thống. Vai trò theo đồ án được quản lý riêng."
          className="max-w-2xl"
        >
          {errorNotice ? <p className="admin-error mb-3" role="alert">{errorNotice}</p> : null}
          <form className="admin-form" onSubmit={submitCreate}>
            <fieldset className="admin-create-fields" disabled={busy}>
              <label>Họ tên<input name="fullName" required /></label>
              <label>Email<input name="email" type="email" required /></label>
              <label>Mật khẩu ban đầu<input name="password" type="password" minLength={10} placeholder="Ít nhất 10 ký tự" required autoComplete="new-password" /></label>
              <label>Mã sinh viên<input name="studentCode" /></label>
              <label>Mã nhân sự<input name="employeeCode" /></label>
              <AcademicScopeFields {...accountScope} onChange={setAccountScope} />
              <fieldset>
                <legend>Vai trò hệ thống</legend>
                {globalRoles.map((role) => (
                  <label key={role.id} className="admin-choice">
                    <input name="roleIds" type="checkbox" value={role.id} />
                    {role.code === 'LECTURER' ? 'Giảng viên' : displayLabel(role.code)}
                  </label>
                ))}
              </fieldset>
              <p className="admin-boundary">Vai trò trưởng nhóm, giảng viên hướng dẫn và người chấm được quản lý theo từng đồ án.</p>
              <div className="app-modal__actions col-span-full">
                <Button type="button" variant="outline" disabled={busy} onClick={() => setCreateOpen(false)}>Đóng</Button>
                <Button type="submit" disabled={busy}>{busy ? 'Đang tạo…' : 'Tạo tài khoản'}</Button>
              </div>
            </fieldset>
          </form>
        </Modal>
      )}

      {jsonImportOpen && (
        <Modal
          open
          onClose={() => { if (!busy) setJsonImportOpen(false) }}
          title="Nhập nhiều tài khoản (JSON Batch)"
          description="Nhập từ 1 đến 500 tài khoản bằng tệp JSON. Cả lô chỉ được lưu khi tất cả tài khoản hợp lệ."
          className="max-w-2xl"
        >
          {errorNotice ? <p className="admin-error mb-3" role="alert">{errorNotice}</p> : null}
          <div className="mt-2 flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={() => setImportText(JSON.stringify([{
                fullName: 'Nguyễn Văn Mẫu',
                email: 'mau@example.edu.vn',
                password: 'Password123!',
                roleIds: [1],
                departmentId: null,
                majorId: null,
              }], null, 2))}
            >
              Điền dữ liệu mẫu
            </Button>
            {importText.trim() ? (
              <Button size="sm" variant="ghost" type="button" onClick={() => setImportText('')}>Xóa nội dung</Button>
            ) : null}
          </div>
          <label className="admin-import-label mt-3">
            <span className="text-xs font-semibold text-ink-soft">Nội dung JSON</span>
            <textarea
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder={'[{"fullName":"…","email":"…","password":"…","roleIds":[1],"departmentId":null,"majorId":null}]'}
              className="font-mono text-xs"
            />
          </label>
          <div className="app-modal__actions">
            <Button type="button" variant="outline" disabled={busy} onClick={() => setJsonImportOpen(false)}>Đóng</Button>
            <Button type="button" disabled={busy || !importText.trim()} onClick={submitImport}>
              {busy ? 'Đang gửi…' : 'Gửi lô tới máy chủ'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function formatAuditEntity(record: Audit): string {
  const typeLabel = AUDIT_ENTITY_LABELS[record.entityType] ?? displayLabel(record.entityType)
  if (record.entityDisplayName?.trim()) return `${typeLabel}: ${record.entityDisplayName.trim()}`
  return typeLabel
}

const statusTone: Record<UserAccount['status'], BadgeTone> = { ACTIVE: 'success', INACTIVE: 'neutral', SUSPENDED: 'danger' }
function Status({ status }: { status: UserAccount['status'] }) {
  const label = { ACTIVE: 'Đang hoạt động', INACTIVE: 'Ngừng hoạt động', SUSPENDED: 'Đang khóa' }[status]
  return <StatusBadge tone={statusTone[status]} label={label} />
}

function Failure({ message, retry }: { message: string; retry: () => void }) {
  return <p className="admin-error" role="alert">{message} <Button size="sm" variant="outline" onClick={retry}>Thử lại</Button></p>
}

function Pagination({
  page,
  pageSize,
  total,
  onPage,
  onPageSizeChange,
}: {
  page: number
  pageSize: number
  total: number
  onPage: (page: number) => void
  onPageSizeChange?: (size: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  return (
    <div className="admin-pagination">
      <span>Trang {page}/{pages} · {total} kết quả</span>
      {onPageSizeChange && (
        <label className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
          <span className="whitespace-nowrap">Số dòng:</span>
          <select
            aria-label="Số bản ghi trên mỗi trang"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-8 min-h-8 w-auto rounded-lg border border-hairline bg-card pl-2.5 pr-8 text-xs text-ink"
          >
            {[10, 12, 20, 50].map((size) => (
              <option key={size} value={size}>{size} / trang</option>
            ))}
          </select>
        </label>
      )}
      <div className="flex items-center gap-1">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(1)}>Đầu</Button>
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>Trang trước</Button>
        <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => onPage(page + 1)}>Trang sau</Button>
        <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => onPage(pages)}>Cuối</Button>
      </div>
    </div>
  )
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  AUTH_LOGIN: 'Đăng nhập',
  AUTH_LOGIN_SUCCESS: 'Đăng nhập thành công',
  AUTH_LOGIN_FAILED: 'Đăng nhập thất bại',
  AUTH_LOGOUT: 'Đăng xuất',
  AUTH_PASSWORD_CHANGED: 'Đổi mật khẩu',
  AUTH_PASSWORD_RESET: 'Đặt lại mật khẩu',
  AUTH_REFRESH_TOKEN_ROTATED: 'Gia hạn phiên đăng nhập',
  ACCOUNT_CREATED: 'Tạo tài khoản',
  ACCOUNT_UPDATED: 'Cập nhật tài khoản',
  ACCOUNT_ACTIVATED: 'Kích hoạt tài khoản',
  ACCOUNT_DEACTIVATED: 'Vô hiệu hóa tài khoản',
  ACCOUNT_BLOCKED: 'Khóa tài khoản',
  ACCOUNT_UNBLOCKED: 'Mở khóa tài khoản',
  ACCOUNT_IMPORTED: 'Nhập lô tài khoản',
  ACCOUNT_ROLE_ASSIGNED: 'Gán vai trò cho tài khoản',
  ACCOUNT_ROLE_REMOVED: 'Gỡ vai trò khỏi tài khoản',
  ACADEMIC_PROFILE_UPDATED: 'Cập nhật hồ sơ học vụ',
  ACADEMIC_PROFILE_VERIFIED: 'Xác minh hồ sơ học vụ',
  ACADEMIC_PROFILE_REJECTED: 'Yêu cầu bổ sung hồ sơ học vụ',
  ROLE_PERMISSIONS_UPDATED: 'Cập nhật quyền của vai trò',
  ROLE_CREATED: 'Tạo vai trò',
  ROLE_UPDATED: 'Cập nhật vai trò',
  ROLE_DELETED: 'Xóa vai trò',
  PERMISSION_CREATED: 'Tạo quyền truy cập',
  PERMISSION_UPDATED: 'Cập nhật quyền truy cập',
  PERMISSION_DELETED: 'Xóa quyền truy cập',
  USER_CREATED: 'Tạo người dùng',
  USER_UPDATED: 'Cập nhật người dùng',
  USER_STATUS_CHANGED: 'Đổi trạng thái người dùng',
  PROJECT_CREATED: 'Tạo đồ án',
  PROJECT_UPDATED: 'Cập nhật đồ án',
  PROJECT_APPROVED: 'Phê duyệt đồ án',
  PROJECT_REJECTED: 'Từ chối đồ án',
  EXPERT_INVITED: 'Mời chuyên gia doanh nghiệp',
  EXPERT_INVITATION_REVOKED: 'Thu hồi lời mời chuyên gia',
  CHAT_CREATED: 'Tạo cuộc trò chuyện',
  CHAT_MESSAGE_SENT: 'Gửi tin nhắn',
  CHAT_MESSAGE_DELETED: 'Xóa tin nhắn',
  ACADEMIC_ASSISTANT_ASKED: 'Hỏi đáp Trợ lý AI',
  ASSISTANT_CONVERSATION_CREATED: 'Tạo hội thoại Trợ lý AI',
  ASSISTANT_CONVERSATION_DELETED: 'Xóa hội thoại Trợ lý AI',
}

function auditActionLabel(code: string) {
  return AUDIT_ACTION_LABELS[code] ?? displayLabel(code)
}
