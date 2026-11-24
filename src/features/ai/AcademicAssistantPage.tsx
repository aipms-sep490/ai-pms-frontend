import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { openAssistant } from './assistant-dock-events'

export function AcademicAssistantPage() {
  const navigate = useNavigate()
  useEffect(() => { navigate('/project/overview', { replace: true, state: { openAssistant: true } }) }, [navigate])
  return (
    <WorkspacePage
      eyebrow="Trợ lý AI"
      title="Trợ lý AI học vụ"
      description="Đang mở bảng trò chuyện trợ lý AI trên không gian làm việc của bạn."
    >
      <section className="workspace-surface">
        <div className="flex items-center gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
          <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">auto_awesome</span>
          <h2 className="font-heading text-sm font-bold text-ink">Mở nhanh trợ lý AI</h2>
        </div>
        <div className="p-5">
          <Button type="button" icon="auto_awesome" onClick={openAssistant}>Mở trợ lý AI</Button>
        </div>
      </section>
    </WorkspacePage>
  )
}
