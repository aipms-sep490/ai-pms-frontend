import { RouterProvider } from 'react-router-dom'
import { AuthSessionProvider } from '../../features/auth/context/AuthSessionProvider'
import { appRouter } from '../router'

export function AppProviders() {
  return (
    <AuthSessionProvider>
      <RouterProvider router={appRouter} />
    </AuthSessionProvider>
  )
}
