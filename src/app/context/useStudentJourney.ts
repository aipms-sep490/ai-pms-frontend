import { useContext } from 'react'
import { StudentJourneyContext, type StudentJourneyContextValue } from './StudentJourneyContext'

export function useStudentJourney(): StudentJourneyContextValue {
  const context = useContext(StudentJourneyContext)
  if (!context) {
    throw new Error('useStudentJourney must be used within a StudentJourneyProvider.')
  }
  return context
}
