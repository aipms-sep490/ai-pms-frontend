# Adaptation of FAMS presentation to AIPMS roles — 17/11/2026

## Sources and boundary

- Visual references: `F:/AI-PMS/c/docs/uiux/reference-screens/`, particularly FAMS account detail/edit, student and lecturer forms, and admin recent-activity screens (`image49.webp`, `image51.webp`, `image63.webp`, `image72.webp`, `image105.webp`, `image127.webp`, `image181.webp`, `image217.webp`). Read together with `F:/AI-PMS/c/FAMS_user_guide_fulltext.md`.
- FAMS contributes the view-first edit flow, concise identity header, grouped fields, visible status, recent-activity hierarchy, and compact role-specific actions. AIPMS keeps its own logo, token palette, routes, academic entities, permissions and backend contracts.
- No FAMS map, geolocation, face recognition or online-presence state is inferred from audit or login timestamps.

## Role and screen mapping

| AIPMS screen | Adapted presentation | Authority and interaction |
| --- | --- | --- |
| Personal profile | Identity, role and academic information are read first; a named edit section contains only fields the profile API accepts. Field errors appear beside the relevant input. | `getMyProfile` and `updateProfile` remain authoritative. Full name is required; limits are 255/30/100 for name/phone/title. Untouched optional fields are omitted and an explicit clearing sends `null`. |
| Admin accounts | Overview uses actual account, role and audit counts. A short recent-security-activity list links to the full filtered log. Account detail separates identity, system roles, security and academic scope. | Audit records are read from the existing endpoint, not treated as live presence. Academic scope enters an explicit edit state with cancel, conflict readback and version token. Role changes remain distinct from project assignments. |
| Department dashboard | A short jump navigation points to urgent work, progress and academic configuration. Matrix wording states the department and selected-period scope. | Existing scoped queues and portfolio endpoints supply metrics. No global or 100% claim is inferred from a partial page. |
| Supervisor workspace | One project card represents all of the lecturer's assignment scopes for that project. It can disclose the roster returned for that assigned team's project and keeps separate primary and discipline-mentor routes. | Primary actions require a current primary assignment and an `ACTIVE` project. Mentor actions require a current matching major assignment. A failed project read does not imply an ended assignment and does not open a speculative route. |
| Evaluator workspace | Returned evaluation assignments are grouped by project; each component keeps its own stage, scope, rubric, draft state and scoring link. | Only `getAllMyEvaluationAssignments` supplies the list. Evaluators can inspect and score each persisted assignment, not edit team membership or choose another target. Empty and unavailable states stay distinct. |

## Verification and remaining boundary

- Targeted component tests cover the view/edit profile behavior, admin activity readback, department scope, Supervisor roster and project grouping, and Evaluator project grouping and scoring links.
- Final FE verification: 331 test files and 2,210 tests passed with the thread worker pool; production build completed successfully. The contract check matched all 48 examples against the paired BE branch. A build chunk-size warning remains and was already present before this adaptation.
- Authenticated local FE against the configured staging API was used to inspect Admin, Department, Supervisor and Evaluator layouts at desktop and 390 px. No horizontal document overflow was observed on these sampled screens. The evaluator fixture inspected had no active evaluation assignment, so the grouped nonempty state is verified by controlled component tests, not an authenticated scoring lifecycle.
- The FE contract lock matches 48 examples from `feat/be-access-audit-20261113` at `c22b7aa`. The default contract command points to a different `origin/develop` ref and therefore does not describe this branch pair.
- Screenshots live in `F:/AI-PMS/artifacts/ui-fams-20261117/` outside the repository. Test sign-ins may create ordinary authentication audit records. No academic mutation, database migration, BE change, deployment, PR or merge is part of this adaptation.
