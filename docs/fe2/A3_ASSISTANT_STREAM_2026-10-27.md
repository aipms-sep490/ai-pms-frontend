# A3 — bound NDJSON events independently of transport chunks

Branch `fix/fe-assistant-stream-frames`, fresh develop baseline `4d2b90cdcafbf12995a3497bb9f37b53a9e0b253`. The only product change is the shared stream reader; no BE, FE1 form, conversation DTO or export implementation changes.

`http-client.ts:127` checked the accumulated read before splitting newlines. A transport read containing many valid short events therefore failed as an oversized frame. The reader now validates each complete line and the remaining incomplete event separately. A final event without a newline is retained. UTF-8 decoding, single refresh before streaming, no mutation replay after starting, reader cancellation and lock release remain unchanged.

The defensive client limit is1,048,576 decoded UTF-16 code units per line (not bytes). This is provisional, not an agreed BE maximum. BE needs to document the complete serialized event envelope including JSON escaping and all response fields. Its inspected OpenAI provider has a12,000-character output guard, which does not establish a response-wire limit for all providers or fallback paths. Changing completed to omit its repeated answer is a separate contract decision and was not implemented.

Validation: before product changes, the large grouped read and long escaped final-document regressions failed; four other cases passed. Afterward all six stream tests pass. They cover split UTF-8/auth refresh, malformed output/no replay, a single read>1Mi characters containing1,800 small events, a synthetic escaped Vietnamese completed document>256,000 characters without final newline, and oversized complete/incomplete events with cancellation/release. The large document is synthetic stress data, not a measured staging report. Full suite267files/1,483tests, typecheck, lint, build and diff check pass with `VITE_API_BASE_URL=/api/v1`, `--maxWorkers=4`.

## Real staging limits — keep the PR Draft

- Student in project50004, normal UI weekly-report mode after project context settled: POST `/academic/assistant/stream` returns500 with ProblemDetails, no completed response. Trace `0HNPJD7LU9LSB:00000002` is recorded in the developer evidence, not rendered to users.
- Admin without project scope, same weekly-report mode: HTTP200, completed run120018, `generationStatus=FALLBACK`, answer67characters. The UI honestly says the model is unavailable. This does not prove generation of a long report.
- Word/PDF download controls are exercised against the actual returned run. Their results are in the external bundle `a3-stream/downloads.json`; those files contain the fallback response, not a generated long report.

Live generation of a long document and an agreed BE frame limit remain open. The parser correction is reviewable and controlled tests pass; end-to-end long-document acceptance is not marked PASS. Evidence: external bundle `output/fe2-feedback-2026-10-26/a3-stream/`; BE follow-up `BE_KNOWLEDGE_STREAM_CONTRACT_FOLLOWUP_2026-10-27.md` in the same report bundle.
