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

Coverage: single-major and two-major projects; actual multipart files; revision/resubmit; all scoped verifications/decisions before PASS; next gate; old-version byte/hash readback; active assignment download before/after revoke; unauthenticated denial. Revoke is tested on an active next-gate assignment because BE rejects revoking a DECIDED assignment. Individual scope, concurrent stress, production auth/CORS and shared/staging readiness require separate acceptance.
