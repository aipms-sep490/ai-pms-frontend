# Source and branch baseline

| Source | Observed baseline | Boundary |
| --- | --- | --- |
| FE | `F:/AI-PMS/ai-pms-frontend-fresearch-20261113`, `feat/fe-fresearch-reference-20261113`, HEAD `7e21521bfc8a0ae1b12abf54fe0ad029ea442bd2`, tracking same remote branch; clean before this audit | Source inspected; no production-code edit in this audit |
| BE | `F:/AI-PMS/ai-pms-backend-access-audit-20261113`, `feat/be-access-audit-20261113`, HEAD `8aec4db3112d56b06f4509e49291f4d530b5e7ef`, tracking same remote branch; clean | Source inspected; no API/DB mutation |
| Browser | Local FE Vite on `127.0.0.1:4187` for this audit, then stopped | Chromium public pages only; no authenticated FE–BE session |
| Services | SQL Server port 1433 listened locally; no observed FE/API listener on common app ports before temporary Vite | SQL listener does not prove database, API or auth readiness |
| Environment | FE `.env.local` absent. Login Google challenge through Vite proxy returned `ECONNREFUSED` without API | Google panel's retry message is environment-blocked, not a confirmed product defect |
| Graph | FE `graphify-out/GRAPH_REPORT.md` built from `5a3498d8`, older than current HEAD | Stale graph not used to establish current facts |

## Documents actually inspected at this checkpoint

- v5.0 package `README_VI.md`, main DOCX section map, workbook sheet map and decision register, D02 lifecycle and D07 Gate decision diagrams. The package is a team-selected implementation baseline, **not** proof of university approval for grade formulas.
- Report 1–4 and Report 6 DOCX section maps; detailed cross-referencing of their individual requirements remains pending. Report 5 artifact was not found by filename search and is marked unavailable, not assumed absent from every possible external store.
- FAMS screenshot catalog and presentation rules R1–R15, with direct visual inspection of `image171.webp` (timetable), `image246.webp` (permission console), and `image116.webp` (schedule request). These are reference-system evidence only.
- Fresearch public homepage currently redirects to `/login`; public text describes a unified research space. Authenticated interactions were **not** inspected. User-supplied Fresearch screenshots remain visual references, not behavior proof.

Authority: approved university policy → approved period policy → selected v5 design → SRS/SDD where aligned → historical guide → external visual reference. Backend, persisted assignments and scope govern actual rights.

## Later local runtime checkpoint (same FE/BE HEADs)

The table above is the *initial* source checkpoint. Subsequently the local BE was started on `127.0.0.1:5080` and FE on `127.0.0.1:5173`, with FE API proxy and a configured UAT SQL database. Local `AI_PMS` contained no supplied fixture users, so the supplied test accounts were verified against the configured UAT target. Password login succeeded for representative single-major, interdisciplinary, lecturer, department and admin accounts. The local non-secure Google challenge returned 403 by origin/HTTPS policy; it was not used as an auth acceptance test.

The API was run with scheduled notification, email, meeting reminder, risk, realtime, password-recovery, chat, video, industry and AI-related background paths disabled. Only read-only browser navigation and SQL metadata SELECT were performed after login. `ApplicationIntent=ReadOnly` metadata confirmed the table/column drift recorded in H-006–H-008. No academic command, migration, grading, notification send, PR or merge was run. Processes were stopped at the end of this checkpoint.
