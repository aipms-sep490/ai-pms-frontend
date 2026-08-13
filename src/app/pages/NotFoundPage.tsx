import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="empty-page">
      <p className="eyebrow">404</p>
      <h1>Page not found</h1>
      <p>The requested AI-PMS route has not been registered.</p>
      <Link to="/" className="text-link">Return to architecture overview</Link>
    </section>
  )
}
