# Academic Governance contract gap

## SRS_EXPECTED_SEPARATE_WINDOWS

The target SRS distinguishes `PROJECT_PERIOD` from one or more
`PROJECT_PERIOD_WINDOW` records.

## CURRENT_BE_PERIOD_AS_WINDOW

The current backend exposes only `ProjectPeriod` endpoints.  Its DTO owns the
time range (`startAt`, `endAt`) and policy fields, and there is no
`ProjectPeriodWindow` DTO, controller, or endpoint to integrate.

## Frontend decision

The frontend presents a Project Period as the current backend's window
representation.  This is intentionally not a claim that the full SRS window
model exists.  `governance.types.ts` and `governance-api.ts` isolate the
Project Period boundary, so a future `ProjectPeriod -> ProjectPeriodWindow[]`
contract can be introduced without coupling it to page state or shared HTTP
services.

No client-side window endpoint, policy model, or eligibility rule is invented.
