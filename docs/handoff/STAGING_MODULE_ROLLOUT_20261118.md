# Staging module rollout — 18/11/2026

User authorized enabling the remaining modules when their deployed dependencies are ready. The staging build previously inherited conservative defaults from `.env.example`, hiding peer evaluation and result appeals even though their backend switches were enabled.

`scripts/build-staging.mjs` now explicitly enables:

- `VITE_ENABLE_ROOM_PLANNER`: room catalog, period calendar and Gate 3/4 scheduling.
- `VITE_ENABLE_PEER_EVAL`: contribution evidence and supervisor-managed rounds. Ratings do not become official scores.
- `VITE_ENABLE_RESULT_CORRECTION`: versioned appeal/correction workflow, including student requests, independent review and lead decisions.

Backend `develop` at `54fdec3ab89fdcf72d1037b31feaecd19a7c6ff1` exposes the corresponding APIs. A read-only check of the deployed database found all 35 selected capability checks across 21 tables ready, with no untrusted/disabled check constraints or foreign keys. `PeerEvaluation:Enabled` and `Appeals:Enabled` are already true. No schema change or backend configuration change is required for this rollout.

Enabling the interface does not record an approved academic decision, create appeal policy/windows, open peer rounds, publish a schedule, or grant any permission. Authorized operators must supply real policy references and valid academic data. Server-side role/scope, state and concurrency checks remain authoritative.

Two switches stay off:

- `VITE_ENABLE_INDUSTRY`: invitation URL is absent and notification email processing is disabled on this environment. An invitation cannot complete its required delivery/enrollment flow. Google login being configured alone does not satisfy this dependency. Do not expose invitations as ready or start sending old queued email as part of this frontend rollout.
- `VITE_ENABLE_WORKFLOW_PREVIEW`: fixture-only preview, explicitly restricted to mock mode. The deployed site stays in real API mode.

Validation evidence and final deployment metadata are saved outside the repository under `outputs/enable-modules-20261118`. Existing route/component tests cover flag boundaries, role restrictions, stale conflicts and readback. Relevant SQL integration tests run against an owned isolated database; live readiness inspection reads metadata only. These tests do not claim browser UAT with production accounts.

The 500 MiB project-file rollout, Google Drive provider, all other feature flags and API URL must remain unchanged. Rollback restores the previous frontend image; backend and stored data are not modified.
