# Evaluations

Current evaluation routes use published schemes, component/major/student targets,
assignment-scoped scoring, finalization and server-calculated project/student results.

Department routes remain under `/department/projects/:projectId/…` with the active
department scope guard. Admin entry points for scheme, assignment, locked submission
and results are under `/admin/projects/:projectId/…`; Admin identity is not an academic
review assignment. Each backend endpoint continues to enforce resource authority.

The unused proposal foundation pages, components and capability placeholders were
removed in FE Batch 1 (2026-10-22). Current scheme/evaluator/result APIs retain
backend authority; local flags do not establish academic approval.
`EvaluatorAssignmentsPage` remains available at `/evaluator/evaluations` pending
the leader's navigation decision; this cleanup does not remove that route.

New scheme drafts require an explicit threshold and component weights. Publishing
a technical scheme version does not establish academic approval of a proposed rubric.
