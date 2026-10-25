import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { openAssistant } from './assistant-dock-events'

export function AcademicAssistantPage() {
  const navigate = useNavigate()
  useEffect(() => { navigate('/project/overview', { replace: true, state: { openAssistant: true } }) }, [navigate])
  return <button type="button" onClick={openAssistant}>Mở trợ lý AI</button>
}
