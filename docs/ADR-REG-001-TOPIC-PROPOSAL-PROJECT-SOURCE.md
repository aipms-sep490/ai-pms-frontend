# ADR-REG-001: Persist the registration source from Topic or Proposal to Project

## Context

The intended academic registration flow is `Topic / Proposal -> Team -> eligibility ->
Project draft -> submit -> review -> supervisor -> ACTIVE`. `ProjectTopic` is the
governed catalogue aggregate. A project draft is the current student-authored proposal
aggregate. The system must preserve which one was selected before a team is eligible and
before its project is created.

The current backend persists `ProjectTopic`, `TeamAcademicConfiguration`, `Project`, and
`ProjectRegistrationSnapshot` independently. It has no persistent topic selection on a
team, no student-proposal source aggregate, and no `ProjectTopicId` (or source type) on a
project. `ProjectRegistrationSnapshot` captures team academic scope only when a project
is submitted; it does not establish topic/proposal provenance.

## Normative Requirement

The following requirements are normative for this decision:

- A team is formed for exactly one governed source: a published `ProjectTopic` or a
  persisted student proposal.
- Source selection is server-authoritative, scoped to the active registration period and
  organization, and is not an untrusted browser-only choice.
- Team eligibility uses the selected source's governed academic requirements. A team may
  not weaken, override, or drift from them.
- Creating a project draft requires a selected valid source and records immutable
  provenance. Submission snapshots the source and the academic evidence used for review.
- A team must still have at most one active or unfinished project. A student must be
  subject to the existing single-active-team policy and source-specific reuse rules.
- `Topic MaxTeams` must not be claimed or enforced until a backend field and policy exist.

## Current Model

`ProjectTopic` has period, lead department, status, code, structured content,
`ProjectMode`, `PrimaryMajorId`, and `TopicMajorRequirement` rows. Publication validates
topic content and registration-window/policy context.

`TeamAcademicConfiguration` is one-to-one with `Team`; it carries project mode, primary
major, lead department, and `TeamMajorRequirement` rows. It has no topic or proposal
reference.

`Project` has a `TeamId`, project content, status, majors, tags, and lifecycle history.
It has no source relation. Project-draft creation validates the registration window,
active eligible team, team-leader authority, academic eligibility, and the existing
one-unfinished-project rule. Its required-major list must equal the team academic scope.

`ProjectRegistrationSnapshot` is created on submission for hybrid academic review. It
serializes the effective team scope and roster evidence and creates participating
department decisions for interdisciplinary work. It does not contain a selected topic or
proposal source.

There is no separate persistent `StudentProposal` / `ProjectProposal` aggregate; current
student-entered project-draft content is colloquially called a proposal.

## Problem

The current model can validate a team and create a project, but cannot prove the required
chain from a published topic or persisted proposal to that team and project. Therefore it
cannot reliably prevent source changes after eligibility, create a governed provenance
record, or audit which source's constraints controlled a submission. Adding only a nullable
`SelectedProjectTopicId` to `Team` would not represent a student proposal source and would
create a second, incomplete path for a requirement that is explicitly dual-source.

## Options Considered

1. **Add `SelectedProjectTopicId` directly to `Team`.** This is small for catalogue topics,
   but fails to persist a student proposal as a first-class source and does not model source
   type, source snapshot, or source lifecycle coherently. Rejected.
2. **Introduce one persisted registration-source aggregate, selected by a team and
   referenced by the project.** The aggregate supports either a `PROJECT_TOPIC` reference
   or a typed `STUDENT_PROPOSAL` payload/snapshot, holds the governed selection-time
   snapshot, and provides a single invariant boundary. Preferred.
3. **Create a project draft before team formation.** This reverses the required flow,
   conflicts with the existing active-team and eligibility guards, and would substantially
   rewrite the registration domain. Rejected.

## Decision

Adopt option 2 as the design target: add a server-owned **Registration Source** aggregate
that is selected for one team before eligibility and is referenced by the project created
from that team.

The aggregate is conceptually named `TeamRegistrationSource` pending backend-owner naming
approval. It has one immutable selection per active team and a discriminated source type:

- `PROJECT_TOPIC`: references a published `ProjectTopic` and stores a governed,
  selection-time snapshot of its scope and content needed by registration.
- `STUDENT_PROPOSAL`: stores a validated, typed proposal payload and governed scope in the
  same aggregate; it does not pretend to be a `ProjectTopic`.

`Project` references the selected source and exposes read-only provenance. Source changes
are allowed only before a draft exists; a change invalidates/recomputes team eligibility
inside a transaction. Project-draft creation requires and locks the source, copies its
provenance reference, and rejects a missing, stale, unpublished, out-of-period, or
out-of-scope source. Submission captures the source snapshot alongside the existing
academic registration evidence.

This is a design decision proposal only. It authorizes no schema, API, frontend, or
workflow implementation until Backend and product owners accept it.

## Domain Invariants

| ID | Requirement | Status | Required behavior |
| --- | --- | --- | --- |
| A | Topic selection persists server-side | DESIGN_REQUIRED | Persist a `PROJECT_TOPIC` source row with a real topic FK and selection snapshot. |
| B | Student proposal source persists server-side | DESIGN_REQUIRED | Persist a typed `STUDENT_PROPOSAL` source row; browser state is insufficient. |
| C | Team is created from topic or proposal | PASS | The selected source belongs to the team before eligibility; creation remains team-first. |
| D | Team eligibility uses governed requirements | PASS | Existing team academic scope/guard is the enforcement direction; source must populate it transactionally. |
| E | Project created from topic records provenance | DESIGN_REQUIRED | Project must reference the immutable registration source. |
| F | Team cannot change source after eligibility or project creation without controlled recalculation | DESIGN_REQUIRED | Lock/transition source before eligibility; prohibit change after project draft. |
| G | Source requirements dominate team scope | DESIGN_REQUIRED | Derive and compare scope server-side; reject weaker or divergent client values. |
| H | Published topic required before selection | DESIGN_REQUIRED | Validate current topic status, period, organization, and department scope in the selection command. |
| I | Student proposal requires validation/approval before it may be selected | DESIGN_REQUIRED | Define proposal states and a backend approval transition; selection accepts only an approved proposal. |
| J | Topic MaxTeams is enforced | DESIGN_REQUIRED | No current `MaxTeams` field/policy exists; add it and transactional reservation semantics before claiming enforcement. |
| K | One active/draft project and one active team policy | PASS | Existing project guard/unique active-project protection remains mandatory; extend only for source reuse rules. |
| L | Authorization is backend-owned | PASS | New source commands/endpoints must use authenticated actor, organization, period, and role/scope checks. |

## Data Model Impact

Proposed backend-owned entities and constraints:

- `team_registration_sources`: `Id`, unique `TeamId` FK, `SourceType`, nullable
  `ProjectTopicId` FK, typed/validated proposal payload or an approved proposal FK,
  `SourceSnapshotJson`, selection actor/time, state, and row-version.
- `projects.RegistrationSourceId`: non-null for newly created registration projects, FK to
  the selected source. Legacy projects stay null and retain current behavior.
- Extend `project_registration_snapshots` with source provenance/snapshot, or add a
  one-to-one immutable `project_registration_source_snapshots` row written at submission.

The source snapshot must contain identifiers and normalized governed fields, not a
free-form client object. Proposal content requires a versioned, validated contract rather
than opaque browser JSON. `ProjectTopic` remains the catalogue aggregate; `Project` remains
the execution proposal/instance and must not mutate `ProjectTopic`.

`MaxTeams` is deliberately out of this schema proposal because it has no existing backend
contract. If accepted later, it needs a topic policy field plus a transaction-safe reservation
or count strategy.

## API Impact

Proposed backend API surface, subject to owner approval:

- Select/read/change a team registration source while team state permits it.
- Create, validate, and approve a student proposal source before selection.
- Return source provenance as read-only data in team, project, workflow-context, and review
  contracts where the user is authorized to see it.
- Require a valid selected source in `POST /projects` draft creation; do not accept a raw
  topic ID as an unaudited client-side substitute.

All list/detail/mutation endpoints must derive organization, registration period, department
visibility, and user authority server-side. Existing topic endpoints retain their catalogue
responsibility and are not project-mutation endpoints.

## Migration Impact

Migration must be additive and reversible in rollout order:

1. Add tables/columns, FKs, unique constraints, row versions, and indexes.
2. Leave legacy teams/projects valid with a null source relation.
3. Backfill only where reliable historical provenance exists; otherwise label it legacy,
   never fabricate a topic link.
4. Enable source-required creation only for the new registration workflow/period after
   backend and frontend deployment compatibility is verified.

## Frontend Impact

No frontend implementation is authorized by this ADR. The later feature work should keep
the existing path `Page -> hook/state -> API adapter -> shared HTTP client -> backend`.
It must select/display backend-returned source data, use backend IDs, present source and
eligibility errors faithfully, and never calculate authorization, approval, capacity, or
source validity in the browser. The current Student UI, shared router, and providers remain
unchanged for A0.

## Backward Compatibility

Existing projects and legacy teams continue through current contracts while their source is
null/legacy. New provenance fields are additive and optional in read DTOs until clients are
rolled out. New source-required draft creation is gated by the agreed registration workflow,
not retroactively imposed on old records. Existing Topic APIs remain backward compatible.

## Security

The backend authenticates every source operation and derives the actor's organization,
active period, team membership/leadership, department scope, and permitted source visibility.
It prevents cross-organization topic references, source enumeration outside scope, and
client-supplied snapshots/approval states. Audit entries record source selection, attempted
change, approval, project creation, and submission using stable IDs rather than sensitive
payloads.

## Concurrency

Source selection/change, eligibility recalculation, project-draft creation, and any future
topic-capacity reservation must execute in one serializable transaction or equivalent
locking/row-version strategy. The team and its source are locked together. A stale source,
team, or project concurrency token returns a conflict requiring refresh; it must not silently
overwrite governed scope. A future `MaxTeams` policy additionally requires a unique,
transactional reservation/count design to prevent over-allocation.

## Testing Strategy

Backend contract and integration tests must cover:

- valid published-topic selection; forbidden, stale, unpublished, cross-scope, and
  out-of-window attempts;
- validated/approved proposal selection and rejection of unapproved proposal content;
- source-to-team scope derivation and eligibility recalculation;
- source lock after eligibility/project creation;
- project draft requiring a source and preserving immutable provenance;
- submission snapshot provenance, revision/resubmission behavior, authorization, and
  concurrent selection/create attempts;
- legacy records with no source; and, when a `MaxTeams` policy exists, concurrent capacity
  reservation.

Frontend tests begin only after the contract is accepted and must use backend-returned source
data, distinguish 401/403/409/validation errors, and avoid mock-only proof of production
authorization or eligibility.

## Rollout

1. Product and Backend owners accept or amend this ADR, including the student-proposal
   approval owner and whether `MaxTeams` is a required policy.
2. Backend implements and contract-tests the source aggregate, migration, and APIs behind
   the agreed rollout scope.
3. Frontend connects the student journey only to the accepted backend contract.
4. Run backend integration tests with a healthy Docker/Testcontainers environment, then
   run full frontend and backend regression suites before enabling the workflow.

## Risks

- Treating a project draft as both proposal source and execution record blurs lifecycle and
  destroys provenance.
- A nullable topic FK alone leaves student proposals ungoverned and creates divergent paths.
- Premature `MaxTeams` UI or validation would fabricate a non-existent backend policy.
- Updating source and team scope outside one transaction could admit an ineligible team.
- Cross-team/source reuse and concurrent selection need explicit ownership and locking rules.

## Open Questions

1. Who owns approval for a student proposal and which roles can perform it?
2. Does a student proposal become a reusable catalogue `ProjectTopic` after approval, or
   remain a team-private source? The two lifecycles must not be conflated.
3. Is `MaxTeams` a product requirement now? If yes, what counts as a reservation and when
   is capacity released after withdrawal/rejection?
4. May a team replace its source before eligibility, and which recalculation/audit event is
   required?
5. What historical evidence, if any, permits a safe backfill for existing projects?
