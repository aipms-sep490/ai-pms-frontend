import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getWorkspaceNavigation } from '../../app/router/workspace-route-registry'
import type { WorkspaceAccess } from '../../app/context/workspace-access'
import { Modal } from './Modal'
import { contextualNavigation, isDeferredDepartmentPath, normalizeNavigationQuery } from './workspace-experience'
import './quick-navigation.css'

export function QuickNavigation({ access }: { access:WorkspaceAccess }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [open,setOpen] = useState(false)
  const [query,setQuery] = useState('')
  const resultsRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const enabled=access.identityRole!=='department'&&!isDeferredDepartmentPath(location.pathname)
  const baseRoutes=getWorkspaceNavigation(access).filter(item=>!isDeferredDepartmentPath(item.path))
  const routes=[...contextualNavigation(location.pathname,access.identityRole),...baseRoutes,
    ...(baseRoutes.some(item=>item.id==='account-profile')?[
      {id:'quick-notifications',path:'/notifications',title:'Thông báo',icon:'notifications'},
      {id:'quick-security',path:'/profile/security',title:'Bảo mật tài khoản',icon:'lock'},
    ]:[]),
    ...(baseRoutes.some(item=>item.id==='administration-access')?[
      {id:'quick-rbac',path:'/admin/access/rbac',title:'Phân quyền hệ thống',icon:'admin_panel_settings'},
    ]:[]),
  ]
  const normalized=normalizeNavigationQuery(query)
  const results=routes.filter(item=>normalizeNavigationQuery(item.title).includes(normalized))
  useEffect(()=>{setOpen(false);setQuery('')},[location.pathname])
  useEffect(()=>{
    if(!enabled)return
    const onKey=(event:KeyboardEvent)=>{
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'&&!event.altKey){
        if(document.querySelector('dialog[open]')&&!open)return
        event.preventDefault();setOpen(value=>!value);setQuery('')
      }
    }
    window.addEventListener('keydown',onKey)
    return()=>window.removeEventListener('keydown',onKey)
  },[enabled,open])
  if(!enabled)return null
  const choose=(path:string)=>{setOpen(false);setQuery('');navigate(path)}
  return <><button className="quick-navigation-trigger" type="button" onClick={()=>{setQuery('');setOpen(true)}} aria-label="Tìm chức năng" aria-keyshortcuts="Control+k Meta+k"><span className="material-symbols-outlined" aria-hidden="true">search</span><span className="quick-navigation-label">Tìm chức năng</span><kbd>Ctrl K</kbd></button>
    {open && <Modal open initialFocusRef={searchRef} title="Đi đến chức năng" description="Tìm nhanh trong các chức năng dành cho tài khoản của bạn." onClose={()=>setOpen(false)}>
      <label className="quick-navigation-search"><span className="material-symbols-outlined" aria-hidden="true">search</span><input ref={searchRef} aria-label="Tên chức năng" value={query} placeholder="Ví dụ: công việc, lịch họp, tài khoản…" onChange={event=>setQuery(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&results[0]){event.preventDefault();choose(results[0].path)}if(event.key==='ArrowDown'){event.preventDefault();resultsRef.current?.querySelector<HTMLButtonElement>('button')?.focus()}}} /></label>
      <div className="quick-navigation-results" ref={resultsRef} onKeyDown={event=>{if(event.key!=='ArrowDown'&&event.key!=='ArrowUp')return;const buttons=[...event.currentTarget.querySelectorAll<HTMLButtonElement>('button')];const index=buttons.indexOf(document.activeElement as HTMLButtonElement);const next=index+(event.key==='ArrowDown'?1:-1);if(buttons[next]){event.preventDefault();buttons[next].focus()}}}>{results.map(item=><button key={item.id} type="button" onClick={()=>choose(item.path)} aria-current={location.pathname===item.path?'page':undefined}><span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span><span>{item.title}</span><span className="material-symbols-outlined quick-navigation-arrow" aria-hidden="true">arrow_forward</span></button>)}</div>
      {!results.length&&<p className="quick-navigation-empty">Không tìm thấy chức năng. Thử tên ngắn hơn hoặc bỏ dấu tiếng Việt.</p>}
      <p className="quick-navigation-help">↑ ↓ để chọn · Enter để mở · Esc để đóng</p>
    </Modal>}</>
}
