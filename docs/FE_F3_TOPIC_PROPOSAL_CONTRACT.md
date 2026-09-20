# F3 — Topic Proposal and Academic Scope Contract

## Implemented contract

F3 reads published `ProjectTopic` catalogue records through the shared HTTP client:

- `GET /v1/topics` with server-side search, `projectMode`, `compatibleOnly`, paging and the current academic period;
- `GET /v1/topics/{id}` for the detail drawer and source preview;
- `topicId` is navigation-only and never replaces the authenticated user's academic context.

`ProjectTopic` remains an academic catalogue definition. It is not a `Project` execution instance and selecting it does not create a project, a team, an assignment, or a browser-persisted choice.

F3 also establishes a typed local academic-scope model for the two backend-defined project modes:

- `SINGLE_MAJOR` requires one authoritative `PrimaryMajor` ID;
- `INTERDISCIPLINARY` requires distinct authoritative major IDs and each requirement has a valid member range and responsibility.

The validation utility is a client-side draft guard only. It does not calculate student eligibility and does not authorize scope.

## Current backend provenance contract

Backend now persists Project provenance on the canonical `ProjectDto`: `proposalSource`,
`topicId`, and `selectedTopic`. A team leader selects a published topic only through
`PUT /projects/{projectId}/topic` with `{ topicId, concurrencyToken }`; Backend validates the
editable Project state, publication/window/scope rules, and concurrency before returning the
updated Project. API mode never derives this provenance from a URL, browser storage, or catalogue
state, and a `409` reloads authoritative Project/topic data without replaying the mutation.

`STUDENT_PROPOSAL` is the Backend default Project provenance, not a separate frontend proposal
aggregate. There is still no verified clear/deselect endpoint, standalone source lock/status
resource, or client-side proposal approval lifecycle; Frontend intentionally exposes none.

## Deliberately deferred boundaries

F3 does not create a Team, compute eligibility, create a Project Draft, submit a project, trigger review, or assign a supervisor. Those workflows require their own backend contracts and stages.
