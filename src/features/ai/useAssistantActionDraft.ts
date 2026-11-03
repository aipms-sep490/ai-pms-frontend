import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { AssistantDraft } from './academic-ai-api'
import { readActionDraft } from './assistant-action-draft'

export function useAssistantActionDraft(projectId: number, kind: AssistantDraft['kind']) {
  const location = useLocation()
  const navigate = useNavigate()
  const [received, setReceived] = useState(() => ({ projectId, key: location.key, draft: readActionDraft(location.state?.assistantDraft, projectId, kind) }))
  useEffect(() => {
    if (!location.state?.assistantDraft) return
    const draft = readActionDraft(location.state.assistantDraft, projectId, kind)
    if (draft) setReceived({ projectId, key: location.key, draft })
    navigate(location.pathname + location.search, { replace: true, state: null })
  }, [location, navigate, projectId, kind])
  return { key: received.key, draft: received.projectId === projectId ? received.draft : undefined }
}
