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

## Explicit backend boundary

The connected backend has no persistent `TeamRegistrationSource` or `StudentProposal` aggregate. In particular, it does not currently provide a contract for:

- reading or saving `/teams/{teamId}/registration-source`;
- source lock, registration status, concurrency token, or department/period authorization;
- a persisted Student Proposal and its approval workflow;
- a relation from an execution `Project` to its chosen registration source.

Therefore API mode exposes `BE_NEW_CONTRACT_REQUIRED`; it does not call an invented endpoint and it does not silently fall back to mock data. Mock mode may show a clearly labelled preview only; it is never persisted or approved.

## Deliberately deferred boundaries

F3 does not create a Team, compute eligibility, create a Project Draft, submit a project, trigger review, or assign a supervisor. Those workflows require their own backend contracts and stages.
