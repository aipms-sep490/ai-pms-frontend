import { RouterProvider } from 'react-router-dom'
import { AuthSessionProvider } from '../../features/auth/context/AuthSessionProvider'
import { appRouter } from '../router'
import { StudentJourneyProvider } from '../context'

export function AppProviders() {
  return (
    <StudentJourneyProvider>
      <RouterProvider router={appRouter} />
    </StudentJourneyProvider>
    <AuthSessionProvider>
      <RouterProvider router={appRouter} />
    </AuthSessionProvider>
  )
}
