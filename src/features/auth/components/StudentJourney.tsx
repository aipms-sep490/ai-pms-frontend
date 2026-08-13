import { studentNavigation } from '../constants/student-navigation'

export function StudentJourney() {
  return (
    <div className="journey-list">
      {studentNavigation.map((step, index) => (
        <article className="journey-step" key={step.state}>
          <span className="journey-index">{String(index + 1).padStart(2, '0')}</span>
          <div>
            <strong>{step.label}</strong>
            <p>{step.action}</p>
          </div>
          <code>{step.route}</code>
        </article>
      ))}
    </div>
  )
}
