export const assistantOpenEvent = 'aipms:assistant-open'
export const floatingPanelEvent = 'aipms:floating-panel-open'
export const chatDockExpandedEvent = 'aipms:chat-dock-expanded'
export const chatDockStateRequestEvent = 'aipms:chat-dock-state-request'
export function openAssistant() { window.dispatchEvent(new Event(assistantOpenEvent)) }
