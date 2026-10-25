import { useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { env } from '../../app/config/env'
import { StudentJourneyContext } from '../../app/context/StudentJourneyContext'
import { useAuthSession } from '../auth/context/useAuthSession'
import { AcademicAssistantPanel } from './components/AcademicAssistantPanel'
import { assistantOpenEvent, floatingPanelEvent } from './assistant-dock-events'
import './assistant-dock.css'

export function AssistantDock() {
  const { session } = useAuthSession()
  const journey = useContext(StudentJourneyContext)
  const { pathname, state } = useLocation()
  if (!env.academicAiAssistantEnabled || env.isMockMode || !session || !session.user.roles.some(role => ['STUDENT', 'LECTURER', 'ADMIN', 'DEPARTMENT_STAFF'].includes(role.toUpperCase()))) return null
  const routeProject = pathname.match(/^\/(?:supervisor|mentor|department)\/projects\/(\d+)(?:\/|$)/)?.[1]
  const studentProject = /^\/project(?:\/|$)/.test(pathname) && !journey?.isLoading && !journey?.error ? journey?.project?.id : undefined
  const projectId = routeProject ? Number(routeProject) : studentProject
  const scopeKey = `${session.user.id}:${journey?.semester?.id ?? 'none'}:${projectId ?? 'general'}`
  return createPortal(<SessionAssistantDock key={session.user.id} scopeKey={scopeKey} projectId={projectId} autoOpen={state?.openAssistant === true} />, document.body)
}

function SessionAssistantDock({ scopeKey, projectId, autoOpen }: { scopeKey: string; projectId?: number; autoOpen: boolean }) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [reset, setReset] = useState(0)
  const dialog = useRef<HTMLDialogElement>(null)
  const launcher = useRef<HTMLButtonElement>(null)
  const show = () => { setMounted(true); setOpen(true); window.dispatchEvent(new CustomEvent(floatingPanelEvent, { detail: 'assistant' })) }
  const hide = () => { setOpen(false); launcher.current?.focus() }
  useEffect(() => { if (autoOpen) show() }, [autoOpen])
  useEffect(() => {
    const openChat = () => show()
    const otherPanel = (event: Event) => { if ((event as CustomEvent).detail !== 'assistant') setOpen(false) }
    window.addEventListener(assistantOpenEvent, openChat)
    window.addEventListener(floatingPanelEvent, otherPanel)
    return () => { window.removeEventListener(assistantOpenEvent, openChat); window.removeEventListener(floatingPanelEvent, otherPanel) }
  }, [])
  useEffect(() => {
    const panel = dialog.current
    if (!panel) return
    const media = window.matchMedia('(max-width: 700px)')
    const previous = document.body.style.overflow
    let locked = false
    const sync = () => {
      if (panel.open) panel.close()
      if (locked) { document.body.style.overflow = previous; locked = false }
      if (open) {
        if (media.matches) { panel.showModal(); document.body.style.overflow = 'hidden'; locked = true } else panel.show()
        panel.querySelector<HTMLTextAreaElement>('textarea')?.focus()
      }
    }
    sync(); media.addEventListener('change', sync)
    return () => { media.removeEventListener('change', sync); if (panel.open) panel.close(); if (locked) document.body.style.overflow = previous }
  }, [open])
  useEffect(() => {
    const viewport = window.visualViewport
    const resize = () => {
      dialog.current?.style.setProperty('--assistant-height', `${viewport?.height ?? window.innerHeight}px`)
      dialog.current?.style.setProperty('--assistant-top', `${viewport?.offsetTop ?? 0}px`)
    }
    resize(); viewport?.addEventListener('resize', resize); viewport?.addEventListener('scroll', resize)
    return () => { viewport?.removeEventListener('resize', resize); viewport?.removeEventListener('scroll', resize) }
  }, [])
  return <div className="assistant-dock">
    <dialog ref={dialog} id="assistant-dock-dialog" aria-labelledby="assistant-dock-title" className="assistant-dock-dialog"
      onCancel={event => { event.preventDefault(); hide() }} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); hide() } }}>
      <header className="assistant-dock-header">
        <span className="assistant-avatar material-symbols-outlined" aria-hidden="true">smart_toy</span>
        <div className="assistant-dock-heading"><h2 id="assistant-dock-title">Trợ lý AI</h2><p>{projectId ? 'Đang hỗ trợ đồ án trên trang này' : 'Học vụ & hỏi đáp thường ngày'}</p></div>
        <button type="button" aria-label="Cuộc trò chuyện mới" title="Cuộc trò chuyện mới" onClick={() => setReset(value => value + 1)}><span className="material-symbols-outlined" aria-hidden="true">edit_square</span></button>
        <button type="button" aria-label="Thu nhỏ trợ lý AI" onClick={hide}><span className="material-symbols-outlined" aria-hidden="true">remove</span></button>
        <button type="button" aria-label="Đóng trợ lý AI" onClick={hide}><span className="material-symbols-outlined" aria-hidden="true">close</span></button>
      </header>
      {mounted && <AcademicAssistantPanel key={`${scopeKey}:${reset}`} projectId={projectId} dock />}
    </dialog>
    <button ref={launcher} type="button" className="assistant-launcher" aria-label={open ? 'Thu nhỏ trợ lý AI' : 'Mở trợ lý AI'} aria-expanded={open} aria-controls="assistant-dock-dialog" title="Trợ lý AI" onClick={open ? hide : show}>
      <span className="material-symbols-outlined" aria-hidden="true">{open ? 'expand_more' : 'smart_toy'}</span><span className="assistant-launcher-badge" aria-hidden="true">AI</span>
    </button>
  </div>
}
