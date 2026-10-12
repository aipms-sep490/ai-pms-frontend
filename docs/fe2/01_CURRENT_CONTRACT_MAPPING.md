# FE2-01 — Current contract/route mapping

Source review on 2026-10-09. FE baseline: develop `3426d70` (includes FE1 PR #52), before navigation fix `d0d50fb`. BE source baseline previously inspected: `3742760582a23e72c878fb61f1dadf225dfbca01`. This document records current source contracts; it does not freeze an approved API release or academic policy.

| Area | Existing contract (under /api/v1) | Existing FE entry / remaining work |
| --- | --- | --- |
| Scheme list/draft | GET /evaluation-schemes?projectId; POST /evaluation-schemes; PUT /evaluation-schemes/{id}; DELETE with query concurrencyToken | EvaluationSchemeManagementPage under department-only router. Reuse page; Admin entry and contextual links missing. |
| Scheme publish/version | POST /evaluation-schemes/{id}/publish and /versions with body concurrencyToken | Reuse immutable published/version flow; reconcile selected state after 409 before another decision. |
| Evaluator targets | GET /projects/{id}/eligible-evaluators with periodId/componentId/scope/majorId/studentId and paging; assignment create/revoke | Reuse frozen target fields and server candidate eligibility; expose complete paging/search when needed. |
| Assignment detail/evidence | GET /evaluation-assignments/{id} and /evidence | canScore/legacyReadOnly/denialReason authoritative. Evidence is package metadata, not an assignment-scoped file projection. |
| Evaluation draft/finalize | POST /evaluation-assignments/{id}/evaluation; PUT /evaluations/{id}/draft; POST /evaluations/{id}/finalize | Reuse guarded assignment workspace and concurrencyToken. Finalized inputs stay read-only. |
| Project result | Existing project-results.api client; preview + confirmationToken + publication/readback | ResultPublicationPage is department-only; source BE requires Admin for cross-department publication. Do not gate publication on outcome PASS locally. |
| Student result | GET /projects/{projectId}/students/{studentId}/result/preview; POST/GET /projects/{projectId}/students/{studentId}/result | Reuse StudentResultPublicationPanel. StudentProjectResultPage remains FE1-owned; do not parse privileged snapshot for own-result breakdown. |
| Period policy | GET policy-versions/effective-policy; PUT /project-periods/{id}/policy | Reuse typed period-policy API. Period CRUD current AdminOnly and policy authority are separate questions. |

## Current authority and routing delta

- BE EvaluationSchemeService.Manage permits Admin or scoped Department Staff. ComponentAuthority requires rubric within frozen project academic scope/semester and permits cross-department component changes only to Admin.
- EvaluationSchemeService.Results.Check permits own-department student publication to staff, requires Admin for cross-department project publication, and returns readiness/blockers with a confirmation token. Publication verifies the token server-side.
- FE scheme/result/assignment pages currently sit below department RoleRoute + DepartmentAcademicScopeRoute/DepartmentProjectLayout. Merely adding Admin to the entire department guard is not an acceptable fix.
- The Admin integration delta needs narrowly scoped entries, contextual links, a project-context loader suitable for Admin, and tests proving Admin does not gain academic-review screens through this change. Reuse existing pages and HTTP/auth infrastructure.
- CIB v4 describes different academic governance authority; changing BE permission policy remains a separate approved Decision/Change Request. Current source access does not prove academic sign-off.

## Ownership / next implementation boundary

FE2 owns router/sidebar/shared BackLink and evaluation/scheme/result APIs/types. FE1 owns student/qualification/team/execution pages and consumes agreed result DTOs. The two requested report UI fixes touch FE1-owned report files only under explicit user instruction; the dedicated navigation commit keeps that delta reviewable.

BE-01 handoff still needed for versioned OpenAPI/examples and effective scope/action/error matrix; BE-02 is needed for isolated real-API acceptance. Existing source/mock tests do not replace those. No new endpoint, global role, HTTP client, scoring engine or dependency is introduced by this mapping.
