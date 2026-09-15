import type { StudentJourneyState } from '../types/student-journey.types'
import { resolveStudentNextAction } from './resolve-student-next-action'

export function resolveStudentDestination(state: StudentJourneyState, projectStatus?: string | null): string {
  return resolveStudentNextAction({ journeyState: state, projectStatus }).route
}
