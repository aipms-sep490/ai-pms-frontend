import { useContext } from 'react'
import { AcademicWorkflowContext, type AcademicWorkflowContextValue } from './academic-workflow-context'

export function useAcademicWorkflow(): AcademicWorkflowContextValue {
  const context = useContext(AcademicWorkflowContext)
  if (!context) {
    throw new Error('useAcademicWorkflow must be used within an AcademicWorkflowProvider.')
  }
  return context
}
