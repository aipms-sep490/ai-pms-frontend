# Make project-assistant fallback explicit

The real project50005 assistant returned200 with generationStatus=FALLBACK after provider timeout/error. It contained valid evidence from report40003, so insufficientEvidence=false was correct. The page showed only English provider-unavailable prose and the history row exposed raw FALLBACK, making the fallback state hard to understand for the Vietnamese UI.

Add an explicit Vietnamese fallback notice above the preserved response/evidence and localize the history status. Do not infer missing evidence, change the response or alter any project state. A regression verifies the warning and source evidence while keeping insufficientEvidence=false intact. Standalone advisory/history tests, typecheck/lint/build and live before/after evidence are recorded in the G10 bundle.
