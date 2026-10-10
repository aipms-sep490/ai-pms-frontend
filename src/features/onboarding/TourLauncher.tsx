import { useTour } from './tour-context'

/** Header control that (re)opens the guided tour. Anchors the tour's own
 * "replay" step via data-tour="help". Renders nothing for roles without a script. */
export function TourLauncher() {
  const { hasTour, startTour, isActive, label } = useTour()
  if (!hasTour) return null
  return (
    <button
      type="button"
      data-tour="help"
      onClick={() => startTour('manual')}
      aria-haspopup="dialog"
      aria-expanded={isActive}
      aria-label={label ? `Mở ${label.toLowerCase()}` : 'Mở hướng dẫn sử dụng'}
      title="Hướng dẫn sử dụng"
      className="tour-launcher relative flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-primary-subtle hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span className="material-symbols-outlined text-[20px] shrink-0" aria-hidden="true">help</span>
      <span className="tour-launcher-label">Hướng dẫn</span>
    </button>
  )
}
