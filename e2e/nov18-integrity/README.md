# Task/team integrity browser fixtures

These tests mount real team and task components and intercept HTTP with explicit
contract fixtures. They are browser regression tests, not an authenticated
production end-to-end run. The harness is outside the application's entry point.

Run with installed dependencies and a Playwright browser:

```powershell
npx playwright test --config playwright.nov18-integrity.config.ts
```

Optional environment settings:

- `NOV18_BROWSER_PATH`: installed Chromium-compatible executable.
- `NOV18_EVIDENCE_DIR`: output directory for JSON results and screenshots;
  defaults to ignored `test-results/nov18-integrity`.

Port 5199 must be free. The runner starts and stops its own Vite server.

At 390px and 1440px, scenarios cover:

1. Change academic scope, edit a responsibility, save using the refreshed token
   and verify readback and the success message.
2. Cancel evidence deletion, then confirm the named file and verify it disappears.
3. Verify DONE assignees remain locked and explicitly confirm an impact review
   with a reason, then verify saved review history.

The runner also rejects unexpected HTTP calls, JavaScript page errors and
horizontal overflow. API enforcement, authorization, transactions, rollback,
stale tokens and migration behavior are covered separately by backend SQL tests.
