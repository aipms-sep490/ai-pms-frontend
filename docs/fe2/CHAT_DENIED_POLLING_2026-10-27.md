# Chat: stop automatic polling after account denial

Local integrated self-test reproduced repeated GET `/api/v1/chat/conversations` responses with 403 `CHAT_ACCOUNT_INACTIVE` for an Admin account without a department. Chat authorization requires an active account, department and organization; the frontend must respect that response rather than retrying indefinitely from the 30-second catch-up timer.

After a 403, the provider clears the inbox, keeps unread state unknown, shows a Vietnamese permission/profile message and stops its hub and automatic catch-up for that account. The existing **Tải lại** button retries the inbox; a successful response restores normal realtime updates. No role restriction is invented in FE, and no account/profile or BE authorization is changed.

Validation: provider regression exercises denial, background visibility/reconnect events, a denied manual retry, and restoration after a successful retry. Chat suite: 8 files / 45 tests pass. Typecheck, lint and production build pass (existing lint warnings remain). Live before/after evidence belongs to the local G10 report outside the source repository.
