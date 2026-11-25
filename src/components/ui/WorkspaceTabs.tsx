import { useRef, type KeyboardEvent } from 'react'
import './workspace-tabs.css'

export interface WorkspaceTabItem<T extends string = string> {
  id: T
  label: string
  icon?: string
  count?: number | null
  badgeTone?: 'default' | 'warning' | 'danger' | 'success'
}

export function WorkspaceTabs<T extends string>({
  tabs,
  activeId,
  onChange,
  ariaLabel = 'Điều hướng nội dung trang',
  className = '',
}: {
  tabs: readonly WorkspaceTabItem<T>[]
  activeId: T
  onChange: (id: T) => void
  ariaLabel?: string
  className?: string
}) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([])

  if (tabs.length === 0) return null

  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.id === activeId))

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = tabs.length - 1
    if (nextIndex === null) return
    event.preventDefault()
    const targetTab = tabs[nextIndex]
    if (!targetTab) return
    onChange(targetTab.id)
    buttonRefs.current[nextIndex]?.focus()
  }

  return (
    <div className={`ui-workspace-tabs ${className}`.trim()} role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab, index) => {
        const active = tab.id === activeId
        const isFocusTarget = index === activeIndex
        const toneClass = tab.badgeTone && tab.badgeTone !== 'default' ? `is-${tab.badgeTone}` : ''
        return (
          <button
            key={tab.id}
            ref={(el) => { buttonRefs.current[index] = el }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={isFocusTarget ? 0 : -1}
            className={`ui-workspace-tab ${active ? 'is-active' : ''}`}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {tab.icon && (
              <span className="material-symbols-outlined ui-workspace-tab-icon" aria-hidden="true">
                {tab.icon}
              </span>
            )}
            <span>{tab.label}</span>
            {tab.count != null && (
              <span className={`ui-workspace-tab-count ${toneClass}`}>{tab.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
