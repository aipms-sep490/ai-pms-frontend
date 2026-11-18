# Project file uploads up to 500 MiB

## Scope and backend contract

The project file policy owns the maximum size. This change consumes its optional
`chunkSizeBytes` and `singleRequestMaxBytes` fields. Files over the single-request
limit require the resumable session API; a client connected to an older backend
does not send a large multipart request. Deliverable versions, chatbot attachments,
avatars and other policies keep their own limits.

Session routes are `/api/v1/files/upload-sessions`: create with parent, file name,
content type and byte size; read status; append raw bytes at an explicit offset;
request completion; cancel. The frontend follows the server's chunk size and
acknowledged offset. Sending all bytes is not success: success requires a
`COMPLETED` response with the matching file metadata.

## User flow

1. In Kho tep do an, choose the task, report or meeting and a supported file.
2. Upload progress counts bytes confirmed by the server. Pause stops the browser
   request without deleting the saved chunks.
3. Continue uses the existing session and reads its current offset. After a page
   reload, select the saved upload and reselect the original local file.
4. While processing, the server checks and stores the file. Pausing monitoring
   does not cancel that background operation.
5. A failed background save can be retried by explicitly continuing the saved
   session. This does not upload its bytes again. Invalid content may require
   cancellation and selecting a corrected file.
6. The completed file list is fetched again. A session can be explicitly canceled
   when the server permits it; its browser marker is removed only after confirmation.

Task evidence uploads also use this transport above the published single-request
limit and expose progress and pause controls.

## Recovery and account boundaries

- Browser metadata is scoped by API origin, user, parent, filename, size and last
  modification time. No file content or authentication token is added to it.
- When Web Crypto is available, a SHA-256 sample of the first and last 64 KiB also
  detects accidental selection of a different file. This is a bounded identity
  check, not a full-file checksum; the backend owns full-file integrity validation.
- Session ownership and current permissions remain backend enforced. Account
  changes stop the active client operation; saved sessions from another account
  are not shown in the UI.
- A lost chunk acknowledgement is reconciled with a GET before sending more data.
  A lost completion acknowledgement is also read back, without creating another
  session. Session creation itself is never automatically retried.
- If the creation response is lost, the browser has no session ID to recover;
  the reserved server session expires according to the server policy. Browser
  storage being disabled or cleared also prevents recovery after reload.
- Server status is polled with a bounded backoff. Network errors preserve the
  upload information and require an explicit user retry rather than an endless loop.

## Downloads and previews

For project and task files over 20 MiB, browsers supporting `showSaveFilePicker`
(typically desktop Chrome and Edge in a secure context) stream the authenticated
response into the selected destination. Other browsers retain the existing Blob
download fallback, which can use substantial memory for large files.

Preview does not automatically download ZIP archives, Office files over 5 MiB,
or other files over 20 MiB. The original remains available through an explicit
download action. Preview limits are separate from the storage/upload limit.

## Validation status

Implemented on `feat/project-files-500mib`. Automated fixture tests cover chunk
offsets, interrupted requests and resumes, failed-save retry, account separation,
sample mismatch, cancellation, published limits, streaming downloads, upload UI
draft preservation, and bounded preview fetching. These tests are not proof of
a production 500 MiB transfer or Google Drive availability. Runtime verification
requires the corresponding backend deployment and an authenticated real upload.
