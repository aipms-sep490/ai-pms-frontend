# FAMS reference review and AIPMS image flow

Date: 2026-11-17. Source: `F:/AI-PMS/c/docs/uiux/reference-screens/` (read-only). The folder contains 249 WebP files numbered 1–255; numbers 42, 60, 144, 153, 163 and 167 are absent. All existing images were reviewed in eleven numbered contact sheets. No FAMS asset or business flow was copied into AIPMS.

## Presentation patterns applied

| FAMS reference | Useful pattern | AIPMS placement |
| --- | --- | --- |
| `image49.webp` | Profile identity is visible before editing; avatar action is close to the identity. | Profile header: current image, selected image preview, save/cancel/remove, clear status. |
| `image150.webp` | Image thumbnail helps identify a post or attachment without opening a separate download. | Task evidence: preview before upload and preview from the stored private file. |
| `image166.webp` | Mobile attachment flow shows file type/size guidance and an obvious return path. | Task evidence picker reads the BE upload policy; modal provides its own close action. |
| `image233.webp` | Desktop upload form separates file selection, constraints and submission. | Evidence picker and avatar controls show selection, permitted formats, maximum size and upload action separately. |
| Remaining reference screens | Compact list/detail hierarchy, visible status, explicit primary action and scoped forms. | Used as layout guidance only; AIPMS terminology, authorization and academic states remain authoritative. |

## Capability audit

| AIPMS capability | Before this change | After this change |
| --- | --- | --- |
| Personal avatar | Initials only; no storage or upload API. | PNG/JPEG, 2 MiB, private authenticated readback, versioned update/remove, profile preview and sidebar image. |
| Task evidence image | `TASK` already maps to `PROJECT_FILE`, which permits PNG/JPEG, but the task screen had a generic file picker and download only. | Picker shows BE policy, validates client side, previews the local image/document and reopens the stored file with existing private preview. |
| Project/meeting/report file | Existing `PROJECT_FILE` policy permits PNG/JPEG/PDF/DOCX/ZIP; project files screen already has preview. | Reused; no new academic evidence type or scope. |
| Review Gate evidence | Existing `REVIEW_GATE_EVIDENCE` policy permits PNG/JPEG/PDF/ZIP. | Reused; review submission still follows gate ownership and state checks. |
| Qualification certificate | Existing policy permits PNG/JPEG/PDF. | Reused; department verification remains required. |
| Cold/appeal/chat attachment | Existing policy permits PNG/JPEG with feature-specific limits and permissions. | Reused; no new role or decision flow. |
| Deliverable version | Existing policy accepts document/archive formats, not loose images. | Unchanged; attach images through the allowed evidence/file context. |

## Authority and deployment

- BE remains authoritative for account status, file signature/MIME/extension, size, private storage and concurrency. Client checks only provide immediate feedback.
- Avatar endpoints operate on the signed-in account only. Admin/staff viewing another user's avatar would need a separately scoped read contract; it is not inferred from the account list.
- The new `user_avatars` SQL change is in `db/changes/20261117_user_avatars.sql`, the fresh bootstrap schema and migration manifest. Apply it through the existing Database First release process before deploying the avatar API. No shared database was changed during this source review.
- Unit/component tests and builds prove code behavior under controlled fixtures. On 2026-11-17, the new SQL migration was tested in an owned Docker SQL Server 2022 database: fresh bootstrap, two reruns, preserved row, FK rejection, EF upload/readback/remove all passed. Authenticated FE–BE runtime readback against the configured shared database remains a separate release check.
