import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { TourPlacement, TourStep } from './tour-types'
import './onboarding.css'

interface TourOverlayProps {
  steps: readonly TourStep[]
  label: string
  /** completed = reached the end; false = skipped or dismissed. */
  onClose: (completed: boolean) => void
}

const GAP = 12
const POPOVER_WIDTH = 340
const MARGIN = 16

interface Position {
  top: number
  left: number
  placement: TourPlacement
}

function resolveTarget(step: TourStep): HTMLElement | null {
  if (!step.target) return null
  return document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
}

/** Keeps only steps the current DOM can actually show: a centred message, or a
 * step whose target is present and visible. Roles that hide a control simply
 * get a shorter, still-coherent tour. */
function visibleSteps(steps: readonly TourStep[]): TourStep[] {
  return steps.filter((step) => {
    if (!step.target) return true
    const el = resolveTarget(step)
    return Boolean(el && el.getClientRects().length > 0)
  })
}

function computePosition(rect: DOMRect | null, preferred: TourPlacement, popWidth: number, popHeight: number): Position {
  const vw = window.innerWidth
  const vh = window.innerHeight
  if (!rect || preferred === 'center') {
    return { top: Math.max(MARGIN, (vh - popHeight) / 2), left: Math.max(MARGIN, (vw - popWidth) / 2), placement: 'center' }
  }
  const order: TourPlacement[] = [preferred, 'bottom', 'top', 'right', 'left']
  const fits = (p: TourPlacement): Position | null => {
    let top = 0
    let left = 0
    if (p === 'right') { left = rect.right + GAP; top = rect.top }
    else if (p === 'left') { left = rect.left - GAP - popWidth; top = rect.top }
    else if (p === 'top') { top = rect.top - GAP - popHeight; left = rect.left }
    else if (p === 'bottom') { top = rect.bottom + GAP; left = rect.left }
    else return null
    const withinX = left >= MARGIN && left + popWidth <= vw - MARGIN
    const withinY = top >= MARGIN && top + popHeight <= vh - MARGIN
    if (withinX && withinY) return { top, left, placement: p }
    return null
  }
  for (const p of order) {
    const result = fits(p)
    if (result) return result
  }
  // Nothing fit cleanly — clamp the preferred side into the viewport.
  const clampLeft = Math.min(Math.max(MARGIN, rect.left), vw - popWidth - MARGIN)
  const clampTop = Math.min(Math.max(MARGIN, rect.bottom + GAP), vh - popHeight - MARGIN)
  return { top: Math.max(MARGIN, clampTop), left: Math.max(MARGIN, clampLeft), placement: 'bottom' }
}

export function TourOverlay({ steps, label, onClose }: TourOverlayProps) {
  const shown = useMemo(() => visibleSteps(steps), [steps])
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [position, setPosition] = useState<Position>({ top: MARGIN, left: MARGIN, placement: 'center' })
  const popoverRef = useRef<HTMLDivElement>(null)

  const step = shown[index]
  const total = shown.length
  const isLast = index === total - 1
  const popWidth = Math.min(POPOVER_WIDTH, window.innerWidth - MARGIN * 2)

  const finish = useCallback((completed: boolean) => onClose(completed), [onClose])
  const next = useCallback(() => setIndex((i) => (i < total - 1 ? i + 1 : i)), [total])
  const back = useCallback(() => setIndex((i) => (i > 0 ? i - 1 : i)), [])

  // Track the current target's rectangle and keep it fresh on scroll/resize.
  useLayoutEffect(() => {
    if (!step) return
    const measure = () => {
      const el = resolveTarget(step)
      setRect(el ? el.getBoundingClientRect() : null)
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [step])

  // Place the popover once its real height is known.
  useLayoutEffect(() => {
    const height = popoverRef.current?.offsetHeight ?? 220
    setPosition(computePosition(rect, step?.placement ?? 'center', popWidth, height))
  }, [rect, step, popWidth])

  // Move focus into the popover on each step and trap Tab inside it.
  useEffect(() => {
    popoverRef.current?.focus()
  }, [index])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); finish(false); return }
      if (event.key === 'ArrowRight') { event.preventDefault(); if (isLast) finish(true); else next(); return }
      if (event.key === 'ArrowLeft') { event.preventDefault(); back(); return }
      if (event.key === 'Tab') {
        const root = popoverRef.current
        if (!root) return
        const focusable = root.querySelectorAll<HTMLElement>('button:not([disabled])')
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isLast, next, back, finish])

  if (!step || total === 0) return null

  const spotlightStyle = rect && step.placement !== 'center'
    ? { top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }
    : null

  return (
    <div className="tour-overlay" role="presentation">
      <button type="button" className={spotlightStyle ? 'tour-backdrop' : 'tour-backdrop tour-backdrop-dim'} aria-label="Bỏ qua hướng dẫn" onClick={() => finish(false)} />
      {spotlightStyle && <div className="tour-spotlight" style={spotlightStyle} aria-hidden="true" />}
      <div
        ref={popoverRef}
        className={`tour-popover tour-placement-${position.placement}`}
        style={{ top: position.top, left: position.left, width: popWidth }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        tabIndex={-1}
      >
        <div className="tour-popover-head">
          <span className="tour-eyebrow">{label}</span>
          <span className="tour-progress" aria-label={`Bước ${index + 1} trên ${total}`}>{index + 1}/{total}</span>
        </div>
        <h2 id="tour-title" className="tour-title">{step.title}</h2>
        <p id="tour-body" className="tour-body">{step.body}</p>
        <div className="tour-dots" aria-hidden="true">
          {shown.map((dot, dotIndex) => (
            <span key={dot.id} className={dotIndex === index ? 'tour-dot tour-dot-active' : 'tour-dot'} />
          ))}
        </div>
        <div className="tour-actions">
          <button type="button" className="tour-skip" onClick={() => finish(false)}>Bỏ qua</button>
          <div className="tour-actions-main">
            {index > 0 && <button type="button" className="tour-back" onClick={back}>Quay lại</button>}
            <button type="button" className="tour-next" onClick={() => (isLast ? finish(true) : next())}>
              {isLast ? 'Xong' : 'Tiếp theo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
