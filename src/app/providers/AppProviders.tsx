import { RouterProvider } from 'react-router-dom'
import { appRouter } from '../router'
import { StudentJourneyProvider } from '../context'

export function AppProviders() {
  return (
    <StudentJourneyProvider>
      <RouterProvider router={appRouter} />
    </StudentJourneyProvider>
  )
}
