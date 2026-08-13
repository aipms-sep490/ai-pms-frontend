const terminalStates = new Set(['Rejected', 'Archived'])

export function isTerminalProjectState(status: string): boolean {
  return terminalStates.has(status)
}
