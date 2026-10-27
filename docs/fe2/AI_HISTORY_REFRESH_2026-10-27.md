# Refresh visible AI history after successful writes

Live Student UI saved project50004 progress analysis successfully (run10002), but the neighboring history list stayed on its old24October rows until the browser reloaded. The analysis panel owned its write state while the history panel only loaded on mount, pagination or failed-read retry.

Notify the parent after a successful save and remount its read-only history panel at page1. A completed project-assistant question also refreshes history. Failed writes do not refresh or replay; an error notice uses role=alert while successful saves use role=status. Compact analysis consumers can omit the callback.

Validation:16focused advisory/history tests, including one actual parent/child interaction that sees the newly saved list row without page reload, and a denied save with no callback/replay. Typecheck/lint/build pass with existing warnings. Live retest and current source heads are recorded in the local G10 report. No new dependencies or BE changes.
