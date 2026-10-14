# AI-PMS FE/BE state and data contract — audit-first reference

**Source alignment:** AI-PMS v5.0 Business & Academic Evaluation BE/FE specification (09/10/2026), Report 3 SRS, Report 4 SDD. The API paths below are examples taken from v5 *suggested responsibilities*; they MUST NOT be treated as verified, implemented endpoints. Inspect current code and OpenAPI, then create a field-by-field compatibility map before coding.

## Source priority and uncertainty labels

A0 legitimate university policy > A1 approved effective period policy and rubric > A2 team-selected implementation design v5 > A3 SRS/SDD > A4 historical governance/workflow > A5 visual mockups or model proposal.

`VERIFIED-CODE`: exact file/commit checked in current repo. `SOURCE-BASELINE`: described in specification. `TEAM-SELECTED`: project team's reference model only. `OPEN`: academic approval required. `PROPOSED`: design suggestion.

## Suggested endpoint responsibilities (not actual route claims)

| Illustration from v5 | Frontend needs | Validation requirements |
|---|---|---|
| `GET /api/projects/{id}/my-capabilities` | allowed action + blocked reasons | compare with actual existing `api/v1` routes |
| `GET /api/projects/{id}/workspace` | permission-scoped workspace and disciplines | active project, membership/assignment |
| `GET /api/teams/{id}/eligibility` | PASS/FAIL reasons, version, verified major quota | no client trust for verified major |
| `POST /api/projects/{id}/registration/submit` | draft -> submitted only on success | policy window, freshness, snapshot |
| `GET /api/evaluations/my-assignments` | assigned evaluation list | project/major/student/criterion scope |
| `PUT /api/evaluations/{id}/scores` | save drafts with concurrency token | range, rubric version, stage/scope |
| `POST /api/evaluations/{id}/finalize` | finalize after completeness | no unsubmitted PENDING score |
| `GET /api/projects/{id}/result-preview` | readiness, preview and blockers | do not present as published official grade |
| `POST /api/projects/{id}/results/publish` | authorized publication | human authority and deterministic grades |

## Capability model proposal (example conceptual TS types — DO NOT assume backend shape)

```ts
type Capability = {
  action: string;                 // canonical action name, mapped from API
  allowed: boolean;
  reasonCodes?: string[];        // stable server reason codes
  prerequisites?: string[];      // safe-to-disclose UX messages
};

type ResourceUxContext = {
  projectMode: 'SINGLE_MAJOR' | 'INTERDISCIPLINARY';
  projectState: string;
  policyVersion: string;
  permissions: Capability[];
  version?: string;               // optimistic concurrency where API supports it
};
```

This is a design pattern, not a request to change backend contract. If backend currently uses a different DTO, provide adapters and keep type generation aligned with OpenAPI.

## Result and evaluation integrity

- **Team-selected internal reference:** StudentResult = 50% COMMON + 30% OWN_MAJOR + 20% INDIVIDUAL; ProjectResult reference = 50% COMMON + 50% MajorAggregate. These are NOT official FPT score policies until authorized approval. Read configured/frozen scheme and version from backend, never hardcode 50/30/20 in UI calculations.
- **ScopeType:** COMMON, MAJOR_SPECIFIC, INDIVIDUAL. **Stage:** ON_GOING/COLD/DEFENSE or configured stage. Render separately.
- **Authority:** evaluations only from assigned scorers; Industry expert advisory unless approved scheme authorizes weighting. AI cannot write scores or publish results.
- **Empty grade:** `PENDING`/not yet assessed is separate from numeric `0`; old rubric versions remain traceable; individual scores appear only in appropriate authorization scope.
- **Readiness:** do not equate team ELIGIBLE with project APPROVED; do not equate scheduled meeting with formal Review Gate; do not auto-fail a project for missed checkpoint.

## FE delivery pipeline

`Authenticated Route -> Effective Project Context -> Capability & State Fetch -> Screen View Model -> Consistent UI States -> Explicit User Action -> API Domain Validation -> Confirmed Response -> Cache Invalidation -> Audit/History Surface`.

Backend ASP.NET Core / database-first SQL Server governs domain decisions; frontend React is a presentation and workflow companion. No UI refactor should write migrations, mutate shared database, change policy formulas, or infer missing SQL tables.

## Change request for missing API

When requested UI depends on absent/contradictory API data: show a verified gap with relevant file:line and source requirement; propose DTO shape and compatibility tests; implement a feature-flagged UI or truthful disabled/fallback state only if appropriate; seek approval before backend contract changes.
