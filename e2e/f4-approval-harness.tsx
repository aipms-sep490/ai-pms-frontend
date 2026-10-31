import { createRoot } from 'react-dom/client'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import '../src/index.css'
import { EvaluatorAssignmentRoute } from '../src/features/evaluations/components/EvaluatorAssignmentRoute'
import { EvaluatorAssignmentDetailPage } from '../src/features/evaluations/pages/EvaluatorAssignmentDetailPage'

createRoot(document.getElementById('root')!).render(<RouterProvider router={createMemoryRouter([
  { element: <EvaluatorAssignmentRoute />, children: [{ path: '/evaluator/assignments/:assignmentId', element: <EvaluatorAssignmentDetailPage /> }] },
], { initialEntries: ['/evaluator/assignments/41'] })} />)
