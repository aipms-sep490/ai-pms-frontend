# Review Gates acceptance

This entry imports the real FE pages and HTTP client. It is excluded from the production application. No `.env` files are changed.

## Controlled HTTP contract tests

```powershell
npx playwright test --config playwright.review-gates.config.ts contract.spec.ts
```

These tests disable the Review Gates mock adapter for the Vite child process, intercept HTTP responses, and verify multipart bytes, gate tokens, paginated queues/draft recovery, protected download errors, template save/publish and 320/375/768/1024/1440 layouts. They are fixture evidence, not backend lifecycle acceptance.

## Real API and isolated SQL Server

Requires PowerShell 7, SQL Server reachable by `AIPMS_TEST_SQL_CONNECTION` with permission to create owned test catalogs, the sibling BE repo at the intended commit, and its compiled Debug API. Build BE first; do not modify project/SDK configuration to work around a local workload-manifest issue.

```powershell
# Set AIPMS_TEST_SQL_CONNECTION privately in this process. Do not commit credentials.
./e2e/review-gates/run-live.ps1 -BackendPath ../ai-pms-backend
```

`run-live.ps1` uses the BE's guarded `new-e2e-database.ps1` and `prepare-v5-demo.ps1`. It creates a unique `AI_PMS_E2E_<guid>` catalog, generates a private password, starts a dedicated API with random port/signing key/storage and external delivery disabled, runs actual password/JWT + browser/API lifecycles, reads back gate/evidence/assignment data, then stops its API and drops only its owned catalog in `finally`. Process variables are restored. It never applies scripts to the catalog supplied in the connection string or to shared `AI_PMS`.

Evidence defaults to `test-results/review-gates-live`; override `-OutputDirectory` to preserve it separately. API logs and fixture identities are synthetic. Browser traces are off to avoid retaining login credentials/tokens. A missing owned fixture skips `live.spec.ts`; an actual lifecycle failure remains a failed test.

Coverage: single-major and two-major projects; actual multipart files; revision/resubmit; all scoped verifications/decisions before PASS; next gate; old-version byte/hash readback; active assignment download before/after revoke; unauthenticated denial. Revoke uses an active next-gate assignment because BE rejects revoking DECIDED assignments. Each mode also sends 24 concurrent queue reads. The interdisciplinary case covers COI, out-of-major assignment, individual targets/download permissions and a discipline mentor downloading another major's evidence. This bounded concurrency smoke does not force SQL retry exhaustion or prove production capacity. Audit rollback and shared/staging lifecycle still require separate acceptance.

The extended suite currently exposes a BE failure at `aee0dc0`: a DS mentor downloads SE evidence with 200 instead of 403. This remains a failing assertion, not a skip or accepted response. See [the current integration report](../../docs/review-gates/INTEGRATION_2026-10-21.md).

## Staging connection

Run `pnpm run dev:review-gates:staging` and open `http://localhost:5175`. It sets API/proxy/mock overrides only in the Vite process and preserves env files. Use approved demo identities and projects; never point `run-live.ps1` at staging. Authenticated staging lifecycle requires prepared project/template/assignment data. Credentials belong in the operator's private process/session, never in a committed spec or report.
