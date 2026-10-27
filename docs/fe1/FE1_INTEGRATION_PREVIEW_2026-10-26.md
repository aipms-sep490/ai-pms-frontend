# FE1 integration preview — 26/10/2026

This is a local review branch combining F1–F7 from their seven published branches. It is not F8 acceptance. The task branches remain independently reviewable. FE2-owned product files are unchanged.

## Open without credentials

Run `npm run dev -- --mode fe1-preview --host 127.0.0.1 --port 5181 --strictPort` and open `http://127.0.0.1:5181/e2e/fe1-preview.html`.

The page mounts the real FE1 task board, progress report editor, invitation panel and profile page. Its API fixture is in memory and intercepts `/api/` requests, including writes. It offers leader, denied, supervisor read-only and service-error states; reloading resets the fixture. It does not prove Backend authorization, persistence or lifecycle acceptance.

To verify browser behavior, run `npx playwright test --config playwright.fe1-preview.config.ts`. The tests check the roster at 390/768/1280/1440 px, denied actions, read-only Kanban, error retry, report cycle/draft, profile roundtrip and invitation text rendering. Screenshots and JSON results go to ignored `logs/`.

## Connect to an API

`.env.fe1-preview.example` contains every VITE variable read by this checkout. The ignored `.env.fe1-preview.local` uses the staging API target. Start Vite with `--mode fe1-preview`; the ordinary `npm run test` keeps its existing test profile. `.env.fe1-local.example` is the same public configuration targeting a local API at `http://localhost:5080`. Do not put passwords, JWTs or private API keys in any VITE variable: Vite exposes them to the browser. Deployment must set its own validated public values and rebuild.

The production app is at `/login` on the same server and proxies `/api` and `/hubs` to the selected target. The staging `/api/v1/system` returned `ok` on 26/10 but no commit SHA, so its exact code revision is unknown. The local preview origin was rejected for Google Login. The fixture requires no login and does not bypass the production auth guard.

## Current gates

- Combined FE typecheck, lint, 268-file/1,533-test suite and preview-mode build passed on the final `4d2b90c` baseline. Lint has 210 warnings. The previous `14d9981` baseline had 209; an AI component merged into `develop` added one. FE1 preview files added none.
- The API-mode test run with Review Gates mock disabled had 262/267 files pass and 38 failures in Review Gates fixtures. The ordinary full test profile passed. This is separate FE2 acceptance work, not proof that the API-mode suite is green.
- Backend PR #133 is still open. Its new DTO fields and member report capability are not in Backend `develop`. Its CI is red on an integration test; do not claim live FE1 acceptance until the Backend revision is fixed, deployed and identified.
- F8 still needs authenticated leader/member/supervisor and forbidden-user lifecycle checks against a known Backend revision and isolated test data, with browser/API/DB readback where applicable.

## FE1 branch inputs

F1 `08e8b53`, F2 `e2301dc`, F3 `fc3b718`, F4 `fa97f13`, F5 `eafc045`, F6 `26f4651`, F7 `d2ebab3`. The shared supervisor route and report files were reconciled in this branch to preserve both roster and read-only behavior; a combined regression test covers a failed roster load followed by retry on a final project.
