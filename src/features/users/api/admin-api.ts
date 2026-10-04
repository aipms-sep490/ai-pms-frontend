import { endpoints } from '../../../services/api/endpoints'
import { httpDelete, httpGet, httpPatch, httpPost, httpPut } from '../../../services/http/http-client'
export interface Page<T>{items:T[];page:number;pageSize:number;totalCount:number}
export interface UserAccount{id:number;departmentId:number|null;majorId:number|null;email:string;fullName:string;phone:string|null;studentCode:string|null;employeeCode:string|null;title:string|null;status:'ACTIVE'|'INACTIVE'|'SUSPENDED';accessFailedCount:number;lockoutEndAt:string|null;roles:string[];concurrencyToken?:string|null}
export interface Permission{id:number;code:string;name:string;description:string|null;isSystemPermission:boolean}
export interface Role{id:number;code:string;name:string;description:string|null;isSystemRole:boolean;permissions:Permission[];isAssignableGlobalRole:boolean;assignmentKind:string}
export interface AcademicProfile { userId:number; fullName:string; email:string|null; studentCode:string|null; departmentId:number|null; departmentName:string|null; majorId:number|null; majorName:string|null; status:string; reviewedBy:number|null; reviewedAt:string|null; rejectionReason:string|null; concurrencyToken:string|null }
export interface SecurityCatalogDraft{code:string;name:string;description:string|null}
export interface PermissionMatrix{roles:Role[];permissions:Permission[]}
export interface Audit{id:number;actorUserId:number|null;action:string;entityType:string;entityId:string|null;outcome:string;occurredAt:string;detailsJson:string|null}
export interface UserDraft{departmentId:number|null;majorId:number|null;email:string;password:string;fullName:string;phone:string|null;studentCode:string|null;employeeCode:string|null;title:string|null;roleIds:number[]}
export interface AdminListQuery { search?: string; status?: string; page?: number; pageSize?: number }
export interface AuditListQuery extends AdminListQuery { actorUserId?: number; action?: string; entityType?: string; outcome?: string; fromUtc?: string; toUtc?: string }
const query=(path:string, values:Record<string,string|number|undefined>)=>{const params=new URLSearchParams();Object.entries(values).forEach(([key,value])=>{if(value!==undefined&&value!=='')params.set(key,String(value))});return params.size?`${path}?${params}`:path}
export const getUsers=(token:string, filters:AdminListQuery={})=>httpGet<Page<UserAccount>>(query(endpoints.users,{search:filters.search,status:filters.status,page:filters.page??1,pageSize:filters.pageSize??20}),{accessToken:token})
export const getUser=(id:number,token:string)=>httpGet<UserAccount>(`${endpoints.users}/${id}`,{accessToken:token})
export const updateAcademicProfile=(id:number,body:{departmentId:number|null;majorId:number|null;concurrencyToken:string},token:string)=>httpPatch<AcademicProfile>(`${endpoints.users}/${id}/academic-profile`,body,{accessToken:token})
export const getRoles=(token:string)=>httpGet<Page<Role>>(query(endpoints.securityRoles,{page:1,pageSize:100}),{accessToken:token})
export const getPermissions=(token:string)=>httpGet<Page<Permission>>(query(endpoints.securityPermissions,{page:1,pageSize:100}),{accessToken:token})
export const getPermissionMatrix=(token:string)=>httpGet<PermissionMatrix>(`${endpoints.securityPermissions}/matrix`,{accessToken:token})
export const getAudit=(token:string, filters:AuditListQuery={})=>httpGet<Page<Audit>>(query(endpoints.securityAuditLogs,{actorUserId:filters.actorUserId,action:filters.action,entityType:filters.entityType,outcome:filters.outcome,fromUtc:filters.fromUtc,toUtc:filters.toUtc,page:filters.page??1,pageSize:filters.pageSize??20}),{accessToken:token})
export const createUser=(draft:UserDraft,token:string)=>httpPost<UserAccount>(endpoints.users,draft,{accessToken:token})
export const importUsers=(accounts:UserDraft[],token:string)=>httpPost<UserAccount[]>(`${endpoints.users}/import`,{accounts},{accessToken:token})
export const setUserStatus=(id:number,status:UserAccount['status'],token:string)=>httpPatch<UserAccount>(`${endpoints.users}/${id}/status`,{status},{accessToken:token})
export const activateUser=(id:number,token:string)=>httpPost<UserAccount>(`${endpoints.users}/${id}/activate`,{}, {accessToken:token})
export const deactivateUser=(id:number,token:string)=>httpPost<UserAccount>(`${endpoints.users}/${id}/deactivate`,{}, {accessToken:token})
export const blockUser=(id:number,token:string)=>httpPost<UserAccount>(`${endpoints.users}/${id}/block`,{}, {accessToken:token})
export const unblockUser=(id:number,token:string)=>httpPost<UserAccount>(`${endpoints.users}/${id}/unblock`,{}, {accessToken:token})
export const assignRole=(userId:number,roleId:number,token:string)=>httpPut<void>(`${endpoints.users}/${userId}/roles/${roleId}`,{}, {accessToken:token})
export const removeRole=(userId:number,roleId:number,token:string)=>httpDelete<void>(`${endpoints.users}/${userId}/roles/${roleId}`,{accessToken:token})
export const replacePermissions=(roleId:number,permissionIds:number[],token:string)=>httpPut<Role>(`${endpoints.securityRoles}/${roleId}/permissions`,{permissionIds},{accessToken:token})
export const createRole=(draft:SecurityCatalogDraft,token:string)=>httpPost<Role>(endpoints.securityRoles,draft,{accessToken:token})
export const updateRole=(id:number,draft:SecurityCatalogDraft,token:string)=>httpPut<Role>(`${endpoints.securityRoles}/${id}`,draft,{accessToken:token})
export const deleteRole=(id:number,token:string)=>httpDelete<void>(`${endpoints.securityRoles}/${id}`,{accessToken:token})
export const createPermission=(draft:SecurityCatalogDraft,token:string)=>httpPost<Permission>(endpoints.securityPermissions,draft,{accessToken:token})
export const updatePermission=(id:number,draft:SecurityCatalogDraft,token:string)=>httpPut<Permission>(`${endpoints.securityPermissions}/${id}`,draft,{accessToken:token})
export const deletePermission=(id:number,token:string)=>httpDelete<void>(`${endpoints.securityPermissions}/${id}`,{accessToken:token})
