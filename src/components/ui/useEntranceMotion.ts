import { useEffect } from 'react'
import { useAnimate } from 'motion/react-mini'

/** One short entrance; content stays visible if animation support is unavailable. */
export function useEntranceMotion<T extends HTMLElement>(trigger: string | boolean, kind: 'page' | 'dialog' | 'drawer' = 'page') {
  const [scope, animate] = useAnimate<T>()
  useEffect(() => {
    const element = scope.current
    if (!trigger || !element || typeof element.animate !== 'function' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const from = kind === 'drawer' ? 'translateX(28px)' : kind === 'dialog' ? 'translateY(12px) scale(.97)' : 'translateY(10px)'
    const playback = animate(element, { opacity: [.7, 1], transform: [from, 'none'] }, { duration: .28, ease: [.22, 1, .36, 1] })
    return () => playback.stop()
  }, [trigger, kind, scope, animate])
  return scope
}
