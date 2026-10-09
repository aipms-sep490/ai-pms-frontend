# Evaluations

Current evaluation routes use published schemes, component/major/student targets,
assignment-scoped scoring, finalization and server-calculated project/student results.

Department routes remain under `/department/projects/:projectId/…` with the active
department scope guard. Admin entry points for scheme, assignment, locked submission
and results are under `/admin/projects/:projectId/…`; Admin identity is not an academic
review assignment. Each backend endpoint continues to enforce resource authority.

`LayeredEvaluationFoundation`, `EvaluatorFoundationPage` and
`useLayeredEvaluationAvailability` are legacy proposal scaffolding, not mounted in
the production router. Their pending flags do not describe availability of the
current scheme/evaluator/result APIs. Keep them disabled until a future approved
contract needs them; do not enable grading by changing a local boolean.

New scheme drafts require an explicit threshold and component weights. Publishing
a technical scheme version does not establish academic approval of a proposed rubric.
