import { RouterProvider } from 'react-router-dom'
import { AuthSessionProvider } from '../../features/auth/context/AuthSessionProvider'
import { AcademicWorkflowProvider } from '../context/AcademicWorkflowProvider'
import { appRouter } from '../router'
import { ChatProvider } from '../../features/chat/ChatProvider'

export function AppProviders() {
  return (
    <AuthSessionProvider>
      <ChatProvider>
        <AcademicWorkflowProvider>
          <RouterProvider router={appRouter} />
        </AcademicWorkflowProvider>
      </ChatProvider>
    </AuthSessionProvider>
  )
}
