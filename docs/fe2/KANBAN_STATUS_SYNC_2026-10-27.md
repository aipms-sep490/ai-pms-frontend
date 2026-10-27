# Kanban: synchronize after each persisted status change

Live local integration test created labeled task20018 in existing DST project50004. A successful TODO→IN_PROGRESS drag returned a new concurrency token, but the board retained the old DTO. The next IN_PROGRESS→IN_REVIEW request returned409 STALE_CONCURRENCY_TOKEN until a manual refresh. The UI also announced success before the first request had completed.

The board now waits for a successful status write, reloads the authoritative page (tokens, filters and totals), and then reports success. A pending guard prevents overlapping drops and temporarily disables card dragging. Failed writes leave saved cards in their existing columns; no optimistic success or whole-page snapshot rollback can overwrite another operation.

Validation: two regressions cover pending/no duplicate drop, successive token use after reload, and failure without a false success. Task suite7files/41tests; typecheck, lint and build pass. No BE changes or new dependencies. Live evidence/retest is in the local G10 report.
