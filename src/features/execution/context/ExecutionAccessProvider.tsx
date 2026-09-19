import type { ReactNode } from 'react'
import { ExecutionAccessContext, type ExecutionAccess } from './ExecutionAccessContext'

export function ExecutionAccessProvider({ value, children }: { value: ExecutionAccess; children: ReactNode }) {
  return <ExecutionAccessContext.Provider value={value}>{children}</ExecutionAccessContext.Provider>
}
