import { useLayoutEffect, type RefObject } from 'react'

/** Keep a message popup inside the scrollable history, including near its top edge. */
export function useChatPopover(open: boolean, anchor: RefObject<HTMLElement | null>, popup: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const trigger = anchor.current, content = popup.current
    const history = trigger?.closest('.chat-history')
    if (!open || !trigger || !content || !history) return
    const position = () => {
      const bounds = history.getBoundingClientRect()
      if (!bounds.width || !bounds.height) return
      const target = trigger.getBoundingClientRect()
      content.style.setProperty('max-width', `${Math.max(0, bounds.width - 8)}px`)
      content.style.setProperty('max-height', 'none')
      const height = content.getBoundingClientRect().height
      const above = Math.max(0, target.top - bounds.top - 4)
      const below = Math.max(0, bounds.bottom - target.bottom - 4)
      const upwards = above >= height || above >= below
      content.style.setProperty('max-height', `${upwards ? above : below}px`)
      const rect = content.getBoundingClientRect()
      const parent = content.offsetParent?.getBoundingClientRect()
      if (!parent) return
      const left = Math.max(bounds.left + 4, Math.min(target.left, bounds.right - rect.width - 4))
      content.style.setProperty('left', `${left - parent.left}px`)
      content.style.setProperty('right', 'auto')
      content.style.setProperty('bottom', 'auto')
      content.style.setProperty('top', `${(upwards ? target.top - rect.height - 4 : target.bottom + 4) - parent.top}px`)
    }
    position()
    history.addEventListener('scroll', position, { passive: true })
    window.addEventListener('resize', position)
    window.visualViewport?.addEventListener('resize', position)
    return () => {
      history.removeEventListener('scroll', position)
      window.removeEventListener('resize', position)
      window.visualViewport?.removeEventListener('resize', position)
    }
  }, [open, anchor, popup])
}
