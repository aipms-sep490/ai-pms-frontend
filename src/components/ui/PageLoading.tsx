import { BrandLogo } from './BrandLogo'
import './page-loading.css'

export interface PageLoadingProps {
  /** Renders full viewport loading experience */
  fullPage?: boolean
  /** Accessible text announcement for screen readers */
  label?: string
  /** Primary display title */
  title?: string
  /** Supporting explanatory text */
  description?: string
  /** Visual presentation mode */
  variant?: 'bootstrap' | 'route' | 'inline'
  /** Whether to render the AIPMS BrandLogo wordmark */
  showLogo?: boolean
  /** Optional custom CSS classes */
  className?: string
}

/**
 * AIPMS Energetic Mascot Loading Component (P11)
 * Combines the AIPMS Academic Fox Mascot with F-Research orbital energy rotation.
 * Fully WCAG 2.1 AA accessible with screen reader status announcements and reduced-motion support.
 */
export function PageLoading({
  fullPage = false,
  label = 'Đang tải…',
  title,
  description,
  variant,
  showLogo,
  className = '',
}: PageLoadingProps) {
  const isFull = fullPage || variant === 'bootstrap'
  const isInline = variant === 'inline'

  // Contextual default titles & descriptions matching the user's design and F-Research inspiration
  const resolvedTitle = title ?? (
    isFull
      ? (label && label !== 'Đang tải…' ? label : 'Đang khởi tạo hệ thống AIPMS')
      : (label && label !== 'Đang tải…' ? label : 'Đợi AIPMS một xíu nhé!')
  )

  const resolvedDescription = description ?? (
    isFull
      ? 'Chuẩn bị môi trường quản lý đồ án học thuật…'
      : 'Trang mới đang được chuẩn bị cho bạn…'
  )

  const shouldShowLogo = showLogo ?? (isFull && !title)

  const modifierClass = isFull
    ? 'aipms-loading-wrapper--full'
    : isInline
      ? 'aipms-loading-wrapper--inline'
      : 'aipms-loading-wrapper--route'

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={`aipms-loading-wrapper ${modifierClass} ${className}`.trim()}
    >
      {/* Energetic Orbit & Mascot Stage */}
      <div className="aipms-loading-stage" aria-hidden="true">
        {/* Soft radiant aura */}
        <div className="aipms-loading-halo" />

        {/* Outer dashed spinning ring */}
        <div className="aipms-loading-orbit-outer">
          <span className="aipms-loading-particle aipms-loading-particle--blue" />
        </div>

        {/* Inner reverse-spinning gradient ring */}
        <div className="aipms-loading-orbit-inner">
          <span className="aipms-loading-particle aipms-loading-particle--orange" />
          <span className="aipms-loading-particle aipms-loading-particle--green" />
        </div>

        {/* AIPMS Academic Fox Mascot */}
        <img
          src="/aipms-mascot.png"
          alt="AIPMS Mascot"
          className="aipms-loading-mascot"
          width={108}
          height={108}
          loading="eager"
        />
      </div>

      {/* Typography & Brand */}
      <div className="aipms-loading-content">
        {shouldShowLogo && (
          <div className="aipms-loading-brand">
            <BrandLogo />
          </div>
        )}

        <div className="aipms-loading-title">{resolvedTitle}</div>
        <p className="aipms-loading-desc">{resolvedDescription}</p>

        {/* 3 Animated Energy Dots & Progress Line */}
        <div className="aipms-loading-progress" aria-hidden="true">
          <div className="aipms-loading-progress-line" />
          <span className="aipms-loading-dot aipms-loading-dot--blue" />
          <span className="aipms-loading-dot aipms-loading-dot--orange" />
          <span className="aipms-loading-dot aipms-loading-dot--green" />
        </div>
      </div>

      <span className="sr-only">{label}</span>
    </div>
  )
}
