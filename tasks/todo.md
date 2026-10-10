# FE1 tasks

## FE v5 (10/10/2026)

- [x] Pull baseline trong worktree sạch, tạo nhánh, đọc tài liệu và đối chiếu đủ 26 ticket.
- [x] Model fixture COLD/weekly/leader: lock/finalize immutable, reason required, missing score pending, test âm.
- [x] Sandbox bị chặn trong API mode; UI report/scoring/overview/weekly/leader có nhãn fixture; collaboration prototype.
- [x] Task board dùng status thật và phân trang thật, keyboard card link, không cấp quyền mutation mới.
- [x] Typecheck/lint/full Vitest JSON/build/diff-check và Playwright 375/768/1440.
- [x] Handoff và trạng thái nghiệm thu; không đánh dấu lifecycle thật DONE từ fixture.
- [ ] Hoàn thành acceptance còn thiếu của 26 ticket theo mục Chưa hoàn thành trong docs/V5_FE_DELIVERY_2026-10-10.md; BE contracts/live lifecycle pending.

## Lịch sử FE1

- [x] Qualification API + upload/resubmit form: pending result, single upload, no project/second JSON submit, errors preserve input, refreshed journey. Files: student-qualifications.api/types, form/card, TeamManagementPage. Verify API and form tests.
- [x] Task creation primary/supporting disciplines in one CreateTaskCommand: only project majors, required primary for interdisciplinary scope, no second mutation. Files: tasks.api, WorkspaceTaskForm + two callers. Verify form/API tests.
- [x] Evidence workspace: reuse server major filter with project options and mentor scope; race-safe reads. Files: ProjectEvidenceLedger/test. Verify filtered request and stale response tests.
- [x] StudentResult: prevent stale results after project/student change; use own server result only and authorized major label. Files: StudentProjectResultPage/test. Verify delayed response, denied/empty/error/retry tests.
- [x] Reuse verification FE1-01/03/04/06: focused existing team/registration/mentor/execution/final tests; record source map and remaining contract/staging blockers.
- [x] Typecheck, lint, full Vitest machine-readable inventory, build, diff-check and Playwright screens/flows; completion/handoff report.

Full real API lifecycle remains pending until isolated BE runtime/accounts/fixtures and FE2 publication are available. Do not mark it complete from intercepted browser requests.
