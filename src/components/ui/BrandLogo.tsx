import './brand-logo.css'

/** The supplied artwork is kept intact; CSS frames its central wordmark. */
export function BrandLogo({ className = '' }: { className?: string }) {
  return <span role="img" aria-label="AIPMS" className={`aipms-brand-logo ${className}`.trim()} />
}
