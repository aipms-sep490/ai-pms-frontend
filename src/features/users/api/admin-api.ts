import { endpoints } from '../../../services/api/endpoints'
import { httpDelete, httpGet, httpPatch, httpPost, httpPut } from '../../../services/http/http-client'
export interface Page<T>{items:T[];page:number;pageSize:number;totalCount:number}
export interface UserAccount{id:number;departmentId:number|null;majorId:number|null;email:string;fullName:string;phone:string|null;studentCode:string|null;employeeCode:string|null;title:string|null;status:'ACTIVE'|'INACTIVE'|'SUSPENDED';accessFailedCount:number;lockoutEndAt:string|null;roles:string[]}
export interface Permission{id:number;code:string;name:string;description:string|null;isSystemPermission:boolean}
export interface Role{id:number;code:string;name:string;description:string|null;isSystemRole:boolean;permissions:Permission[]}
export interface Audit{id:number;actorUserId:number|null;action:string;entityType:string;entityId:string|null;outcome:string;occurredAt:string;detailsJson:string|null}
export interface UserDraft{departmentId:number|null;majorId:number|null;email:string;password:string;fullName:string;phone:string|null;studentCode:string|null;employeeCode:string|null;title:string|null;roleIds:number[]}
const query=(path:string, values:Record<string,string|number|undefined>)=>{const params=new URLSearchParams();Object.entries(values).forEach(([key,value])=>{if(value!==undefined&&value!=='')params.set(key,String(value))});return params.size?`${path}?${params}`:path}
export const getUsers=(token:string,search='',status?:string)=>httpGet<Page<UserAccount>>(query(endpoints.users,{search,status,page:1,pageSize:100}),{accessToken:token})
export const getRoles=(token:string)=>httpGet<Page<Role>>(query(endpoints.securityRoles,{page:1,pageSize:100}),{accessToken:token})
export const getPermissions=(token:string)=>httpGet<Page<Permission>>(query(endpoints.securityPermissions,{page:1,pageSize:100}),{accessToken:token})
export const getAudit=(token:string,search='')=>httpGet<Page<Audit>>(query(endpoints.securityAuditLogs,{action:search,page:1,pageSize:100}),{accessToken:token})
export const createUser=(draft:UserDraft,token:string)=>httpPost<UserAccount>(endpoints.users,draft,{accessToken:token})
export const importUsers=(accounts:UserDraft[],token:string)=>httpPost<UserAccount[]>(`${endpoints.users}/import`,{accounts},{accessToken:token})
export const setUserStatus=(id:number,status:UserAccount['status'],token:string)=>httpPatch<UserAccount>(`${endpoints.users}/${id}/status`,{status},{accessToken:token})
export const assignRole=(userId:number,roleId:number,token:string)=>httpPut<void>(`${endpoints.users}/${userId}/roles/${roleId}`,{}, {accessToken:token})
export const removeRole=(userId:number,roleId:number,token:string)=>httpDelete<void>(`${endpoints.users}/${userId}/roles/${roleId}`,{accessToken:token})
export const replacePermissions=(roleId:number,permissionIds:number[],token:string)=>httpPut<Role>(`${endpoints.securityRoles}/${roleId}/permissions`,{permissionIds},{accessToken:token})
