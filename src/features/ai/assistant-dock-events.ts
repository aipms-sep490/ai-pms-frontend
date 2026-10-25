export const assistantOpenEvent = 'aipms:assistant-open'
export const floatingPanelEvent = 'aipms:floating-panel-open'
export function openAssistant() { window.dispatchEvent(new Event(assistantOpenEvent)) }
