import { RouterProvider } from 'react-router-dom'
import { AuthSessionProvider } from '../../features/auth/context/AuthSessionProvider'
import { AcademicWorkflowProvider } from '../context/AcademicWorkflowProvider'
import { appRouter } from '../router'

export function AppProviders() {
  return (
    <AuthSessionProvider>
      <AcademicWorkflowProvider>
        <RouterProvider router={appRouter} />
      </AcademicWorkflowProvider>
    </AuthSessionProvider>
  )
}
