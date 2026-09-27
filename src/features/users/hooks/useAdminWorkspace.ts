import { useCallback, useEffect, useState } from 'react'
import { HttpError } from '../../../services/http/http-client'
import { useAuthSession } from '../../auth/context/useAuthSession'
import {
  assignRole, createPermission, createRole, createUser, deletePermission, deleteRole, getAudit,
  getPermissionMatrix, getPermissions, getRoles, getUsers, importUsers, removeRole,
  replacePermissions, setUserStatus, updatePermission, updateRole,
  type PermissionMatrix, type SecurityCatalogDraft, type UserAccount, type UserDraft,
} from '../api/admin-api'

export function useAdminWorkspace() {
  const { session } = useAuthSession()
  const [users, setUsers] = useState<UserAccount[]>([])
  const [roles, setRoles] = useState<Awaited<ReturnType<typeof getRoles>>['items']>([])
  const [permissions, setPermissions] = useState<Awaited<ReturnType<typeof getPermissions>>['items']>([])
  const [matrix, setMatrix] = useState<PermissionMatrix | null>(null)
  const [audit, setAudit] = useState<Awaited<ReturnType<typeof getAudit>>['items']>([])
  const [loading, setLoading] = useState(Boolean(session))
  const [error, setError] = useState<Error | null>(null)
  const [version, setVersion] = useState(0)
  const refresh = useCallback(() => setVersion((value) => value + 1), [])

  useEffect(() => {
    if (!session) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    Promise.all([
      getUsers(session.accessToken), getRoles(session.accessToken), getPermissions(session.accessToken),
      getPermissionMatrix(session.accessToken), getAudit(session.accessToken),
    ])
      .then(([usersResult, rolesResult, permissionsResult, matrixResult, auditResult]) => {
        setUsers(usersResult.items)
        setRoles(rolesResult.items)
        setPermissions(permissionsResult.items)
        setMatrix(matrixResult)
        setAudit(auditResult.items)
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason : new Error('Load failed')))
      .finally(() => setLoading(false))
  }, [session, version])

  const mutate = async (action: () => Promise<unknown>) => { await action(); refresh() }
  const token = () => session?.accessToken ?? ''
  return {
    users, roles, permissions, matrix, audit, loading, error,
    isUnauthorized: !session || (error instanceof HttpError && error.status === 401),
    isForbidden: error instanceof HttpError && error.status === 403,
    refresh,
    createUser: (draft: UserDraft) => mutate(() => createUser(draft, token())),
    importUsers: (accounts: UserDraft[]) => mutate(() => importUsers(accounts, token())),
    setStatus: (id: number, status: UserAccount['status']) => mutate(() => setUserStatus(id, status, token())),
    assignRole: (id: number, role: number) => mutate(() => assignRole(id, role, token())),
    removeRole: (id: number, role: number) => mutate(() => removeRole(id, role, token())),
    replacePermissions: (id: number, permissionIds: number[]) => mutate(() => replacePermissions(id, permissionIds, token())),
    createRole: (draft: SecurityCatalogDraft) => mutate(() => createRole(draft, token())),
    updateRole: (id: number, draft: SecurityCatalogDraft) => mutate(() => updateRole(id, draft, token())),
    deleteRole: (id: number) => mutate(() => deleteRole(id, token())),
    createPermission: (draft: SecurityCatalogDraft) => mutate(() => createPermission(draft, token())),
    updatePermission: (id: number, draft: SecurityCatalogDraft) => mutate(() => updatePermission(id, draft, token())),
    deletePermission: (id: number) => mutate(() => deletePermission(id, token())),
  }
}
