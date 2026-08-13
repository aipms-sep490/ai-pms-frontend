import { Link } from 'react-router-dom'
import { StudentJourney } from '../../features/auth/components/StudentJourney'
import './overview-page.css'

const moduleGroups = [
  {
    title: 'Foundation',
    description: 'Identity and academic context required by every later workflow.',
    modules: ['auth', 'users', 'academic', 'teams'],
  },
  {
    title: 'Execution',
    description: 'The operational data that makes project progress measurable.',
    modules: ['projects', 'supervisors', 'milestones', 'tasks', 'progress', 'deliverables'],
  },
  {
    title: 'Decision support',
    description: 'Evidence-based evaluation and AI insights built after execution data exists.',
    modules: ['evaluations', 'ai'],
  },
]

export function OverviewPage() {
  return (
    <>
      <section className="overview-hero">
        <p className="eyebrow">Technical foundation</p>
        <h1>Clean boundaries.<br />Feature ownership.</h1>
        <p className="hero-copy">
          The initial AI-PMS structure keeps business rules in the backend and organizes product work by feature so five members can work in parallel.
        </p>
        <div className="hero-actions">
          <Link className="primary-link" to="/projects/lifecycle">Inspect project state machine</Link>
          <span>REST + OpenAPI · SQL Server · React + TypeScript</span>
        </div>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Dependency direction</p>
            <h2>Backend boundaries</h2>
          </div>
          <p>Domain remains independent; infrastructure and AI plug in at the composition root.</p>
        </div>

        <div className="architecture-flow" aria-label="Backend dependency direction">
          <article><span>01</span><strong>API</strong><small>HTTP and authorization</small></article>
          <span className="flow-arrow" aria-hidden="true">→</span>
          <article><span>02</span><strong>Application</strong><small>Feature use cases</small></article>
          <span className="flow-arrow" aria-hidden="true">→</span>
          <article><span>03</span><strong>Domain</strong><small>Rules and state</small></article>
        </div>

        <div className="adapter-row">
          <span>Infrastructure → Application / Domain</span>
          <span>AI → Application</span>
        </div>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Team ownership</p>
            <h2>Feature map</h2>
          </div>
          <p>API, components, hooks, pages, schemas and types stay close to the feature that owns them.</p>
        </div>

        <div className="module-grid">
          {moduleGroups.map((group) => (
            <article className="module-group" key={group.title}>
              <span className="module-kicker">{group.title}</span>
              <p>{group.description}</p>
              <div className="module-tags">
                {group.modules.map((module) => <span key={module}>{module}</span>)}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Role + State + Permission</p>
            <h2>Student journey routing</h2>
          </div>
          <p>The route is selected from business state; backend policy remains the final authorization gate.</p>
        </div>
        <StudentJourney />
      </section>
    </>
  )
}
