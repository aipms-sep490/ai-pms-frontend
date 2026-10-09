# FE1 tasks

- [x] Qualification API + upload/resubmit form: pending result, single upload, no project/second JSON submit, errors preserve input, refreshed journey. Files: student-qualifications.api/types, form/card, TeamManagementPage. Verify API and form tests.
- [x] Task creation primary/supporting disciplines in one CreateTaskCommand: only project majors, required primary for interdisciplinary scope, no second mutation. Files: tasks.api, WorkspaceTaskForm + two callers. Verify form/API tests.
- [x] Evidence workspace: reuse server major filter with project options and mentor scope; race-safe reads. Files: ProjectEvidenceLedger/test. Verify filtered request and stale response tests.
- [x] StudentResult: prevent stale results after project/student change; use own server result only and authorized major label. Files: StudentProjectResultPage/test. Verify delayed response, denied/empty/error/retry tests.
- [x] Reuse verification FE1-01/03/04/06: focused existing team/registration/mentor/execution/final tests; record source map and remaining contract/staging blockers.
- [x] Typecheck, lint, full Vitest machine-readable inventory, build, diff-check and Playwright screens/flows; completion/handoff report.

Full real API lifecycle remains pending until isolated BE runtime/accounts/fixtures and FE2 publication are available. Do not mark it complete from intercepted browser requests.
