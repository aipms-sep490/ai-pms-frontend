# Admin team roster Excel export

## Create student accounts from Excel

Primary action on `/admin/access`: **Nhap sinh vien tu Excel**. Select a department
and active major for the entire batch, upload CSV/XLSX, preview all row errors,
then explicitly confirm creating accounts. Required headers: `MSSV,Ho ten,Email`;
optional: `SDT,Khung`. A blank CSV template is provided. Maximum 500 rows / 5 MiB.

Uses `POST /users/student-import/preview` (multipart `file,majorId`) and
`POST /users/student-import/commit` (JSON `majorId,rows`). The backend fixes the
role to STUDENT. No password or role fields are sent. Gmail or school Workspace
emails sign in with Google on first use, subject to backend identity verification.
Academic profiles remain PENDING, and no team membership is created.

Changing the file or scope discards preview/confirmation. Any error blocks the
whole batch. Existing identities are never overwritten. After any failed commit,
preview again to reconcile possibly completed writes. No automatic retry of a batch.
Requires the new backend endpoint and google_enrollment_pending migration.

The earlier curriculum-only action is now in a separate disclosure for existing
accounts to avoid confusing it with account creation.

## Curriculum CSV/XLSX import

On `/admin/access`, select **Nhap Khung tu file**. Upload a UTF-8 CSV or single-sheet
XLSX with headers `MSSV,Khung` (aliases `studentCode,curriculumCode` also supported
by the server). Download the header-only CSV template and add actual student data.
Maximum 500 data rows / 5 MiB; empty files, other extensions, formulas, macros and
external workbook links are rejected by the client or server.

The authenticated multipart preview uses `/users/curriculum-import/preview` with
field `file`. The drawer shows original/new values, row errors, status counts,
25-row pagination and an errors-only filter. All rows are still validated and
included in the batch independently of the current preview page/filter.

Only after explicit confirmation and `canCommit=true`, the client sends all
UPDATE/UNCHANGED rows with their original concurrency tokens to
`/users/curriculum-import/commit`. SKIPPED rows are omitted; any ERROR/unknown or
incomplete row blocks the entire commit. Empty Khung never erases an existing value.
Changing files clears preview/confirmation. Success refreshes account/audit data.
After 409 or an uncertain save response, a new preview and confirmation are required;
the client never automatically replays a failed batch. Duplicate clicks are locked.

This updates curriculum on existing students only. Account creation and team
membership import are separate features. No real student data is committed by UI
tests. The header-only template is `/templates/student-curriculum-import.csv`.

## Roster export

Route: `/admin/access`, under **Tai khoan nguoi dung**. Select **Xuat Excel danh sach nhom**.

- Choose a semester (required), optionally a department and major. Department options
  belong to the semester's organization; changing a parent clears dependent filters.
- The modal lists all semester pages, including closed semesters, and preserves
  inactive academic records as export filters.
- Downloads `GET /api/v1/teams/export?semesterId=...&format=xlsx` using the shared
  authenticated HTTP client, with optional `departmentId` and `majorId`.
- The server produces the entire workbook. No account-page aggregation or profile
  requests are used. Account search/status filters do not apply to this export.
- Columns: STT, Ma nhom, MSSV, Ho va ten, Truong nhom/Thanh vien, SDT, Email, Khung.
- Only current team members are included. Students without a team and non-student
  accounts are not exported. Member department/major filters can produce partial
  interdisciplinary teams. Missing curriculum/phone values remain blank.
- Maximum 10,000 rows; HTTP 422 prompts narrower filters. A header-only workbook
  is valid when no members match. The UI cannot infer a row count from the file.
- Rejects unexpected content types and empty responses before starting a download.
  Uses the documented filename `team-roster-{semesterId}.xlsx`, cleans up blob URLs,
  prevents duplicate clicks, and displays specific 400/401/403/404/422 errors.
- Admin route and modal restrict access; the backend rechecks the persisted ACTIVE
  ADMIN account. Frontend role checks do not replace server authorization.

Requires the backend roster export endpoint and existing curriculum migration.
No backend, database, environment, or deployment changes in this FE branch.

Validation: `pnpm test src/features/users src/services/http/http-client.test.ts`,
`pnpm build`. Tests cover the API contract, MIME rejection, option pagination,
dependent filters, role denial, duplicate requests, download cleanup, errors and
unmount cancellation. Actual server data requires an Admin session in the local UI.
