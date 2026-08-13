export interface ProjectLifecycleState {
  name: string
  allowedNextStates: string[]
}

export interface ProjectLifecycle {
  states: ProjectLifecycleState[]
}
