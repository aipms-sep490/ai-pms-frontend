import { studentNavigation } from '../constants/student-navigation'
import type { StudentJourneyState } from '../types/student-journey.types'

export function resolveStudentDestination(state: StudentJourneyState): string {
  const destination = studentNavigation.find((step) => step.state === state)

  if (!destination) {
    throw new Error(`No student destination is configured for ${state}.`)
  }

  return destination.route
}
