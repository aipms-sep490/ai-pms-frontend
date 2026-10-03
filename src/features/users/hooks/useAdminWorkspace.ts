import { useCallback, useEffect, useRef, useState } from 'react'
import { HttpError } from '../../../services/http/http-client'
import { useAuthSession } from '../../auth/context/useAuthSession'
import {
  activateUser, assignRole, blockUser, createPermission, createRole, createUser, deactivateUser,
  deletePermission, deleteRole, getAudit, getPermissionMatrix, getPermissions, getRoles, getUsers,
  importUsers, removeRole, replacePermissions, unblockUser, updatePermission, updateRole,
  type AdminListQuery, type AuditListQuery, type Page, type Permission, type PermissionMatrix,
  type Role, type SecurityCatalogDraft, type UserAccount, type UserDraft,
} from '../api/admin-api'

type LoadState = 'loading' | 'ready' | 'error'
type Resource<T> = { state: LoadState; value: T; error: Error | null }
const loading = <T,>(value: T): Resource<T> => ({ state: 'loading', value, error: null })
const failed = <T,>(value: T, reason: unknown): Resource<T> => ({ state: 'error', value, error: reason instanceof Error ? reason : new Error('Load failed') })

export function useAdminWorkspace(filters: AdminListQuery = {}, auditFilters: AuditListQuery = {}) {
  const { session } = useAuthSession()
  const [users, setUsers] = useState<Resource<Page<UserAccount>>>(() => loading({ items: [], page: 1, pageSize: 20, totalCount: 0 }))
  const [rbac, setRbac] = useState<Resource<{ roles: Role[]; permissions: Permission[]; matrix: PermissionMatrix | null }>>(() => loading({ roles: [], permissions: [], matrix: null }))
  const [audit, setAudit] = useState<Resource<Page<Awaited<ReturnType<typeof getAudit>>['items'][number]>>>(() => loading({ items: [], page: 1, pageSize: 20, totalCount: 0 }))
  const [version, setVersion] = useState(0)
  const refresh = useCallback(() => setVersion((value) => value + 1), [])
  const filterKey = JSON.stringify(filters)
  const auditFilterKey = JSON.stringify(auditFilters)
  const filtersRef = useRef(filters)
  const auditFiltersRef = useRef(auditFilters)
  filtersRef.current = filters
  auditFiltersRef.current = auditFilters

  useEffect(() => {
    if (!session) return
    setUsers((current) => loading(current.value)); setRbac((current) => loading(current.value)); setAudit((current) => loading(current.value))
    void getUsers(session.accessToken, filtersRef.current).then((value) => setUsers({ state: 'ready', value, error: null }), (reason) => setUsers((current) => failed(current.value, reason)))
    void Promise.all([getRoles(session.accessToken), getPermissions(session.accessToken), getPermissionMatrix(session.accessToken)])
      .then(([roles, permissions, matrix]) => setRbac({ state: 'ready', value: { roles: roles.items, permissions: permissions.items, matrix }, error: null }), (reason) => setRbac((current) => failed(current.value, reason)))
    void getAudit(session.accessToken, auditFiltersRef.current).then((value) => setAudit({ state: 'ready', value, error: null }), (reason) => setAudit((current) => failed(current.value, reason)))
  }, [auditFilterKey, filterKey, session, version])

  const token = () => session?.accessToken ?? ''
  const mutate = async (action: () => Promise<unknown>) => { await action(); refresh() }
  return {
    users, rbac, audit, refresh, isUnauthorized: !session,
    createUser: (draft: UserDraft) => mutate(() => createUser(draft, token())),
    importUsers: (accounts: UserDraft[]) => mutate(() => importUsers(accounts, token())),
    activate: (id: number) => mutate(() => activateUser(id, token())), deactivate: (id: number) => mutate(() => deactivateUser(id, token())),
    block: (id: number) => mutate(() => blockUser(id, token())), unblock: (id: number) => mutate(() => unblockUser(id, token())),
    assignRole: (id: number, role: number) => mutate(() => assignRole(id, role, token())), removeRole: (id: number, role: number) => mutate(() => removeRole(id, role, token())),
    replacePermissions: (id: number, permissionIds: number[]) => mutate(() => replacePermissions(id, permissionIds, token())),
    createRole: (draft: SecurityCatalogDraft) => mutate(() => createRole(draft, token())), updateRole: (id: number, draft: SecurityCatalogDraft) => mutate(() => updateRole(id, draft, token())), deleteRole: (id: number) => mutate(() => deleteRole(id, token())),
    createPermission: (draft: SecurityCatalogDraft) => mutate(() => createPermission(draft, token())), updatePermission: (id: number, draft: SecurityCatalogDraft) => mutate(() => updatePermission(id, draft, token())), deletePermission: (id: number) => mutate(() => deletePermission(id, token())),
    isForbidden: (resource: Resource<unknown>) => resource.error instanceof HttpError && resource.error.status === 403,
  }
}
