# A2 — Vietnam notification time

Review follow-up to PR #108, based on `feb366b2fdab9fa43e16972c1a60b8361f48d47a`. The same helper serves both the inbox and header notification popover.

`notificationTime` used the browser timezone and parsed offset-free server timestamps as local time. It now imports the existing `dateTimeLabel` helper, which normalizes server UTC and formats in Asia/Ho_Chi_Minh. The existing Vietnamese invalid-time message is preserved. No FE1 helper changes.

The regression fails on the original implementation (00:21 versus 07:21). Three new cases pass independently under UTC, Asia/Ho_Chi_Minh and Asia/Tokyo. Bare UTC, explicit Z and +07:00 all represent the same displayed moment.

Validation: full suite 268 files / 1,542 tests pass with `VITE_API_BASE_URL=/api/v1`, `--maxWorkers=4`; typecheck, lint, build and diff check pass. The initial simultaneous unbounded run encountered unrelated timing failures; bounded rerun preserved all assertions and timeouts.

Staging: all six Lecturer inbox timestamps match independent Intl formatting in Asia/Ho_Chi_Minh. Those observed DTOs currently include Z; offset-free handling is regression coverage, not an assertion that the current notification API omits Z. Screenshots at actual innerWidth 390/768/1280/1440 have no horizontal overflow. Evidence: external audit bundle `output/fe2-feedback-2026-10-26/a1-a2/a2-live.json` and screenshots.
