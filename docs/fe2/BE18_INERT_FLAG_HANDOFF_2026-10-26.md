# BE-18 — two FE rollout flags without runtime consumers

26/10/2026, Asia/Saigon. Follow-up from G9 / PR #102 review. Checked again against FE `origin/develop` 14d9981 (PR #103 included).

| FE flag | Source evidence | What acceptance can conclude |
|---|---|---|
| `VITE_ENABLE_UNIFIED_CAPABILITIES` | `src/app/config/env.ts` declares/exports `unifiedCapabilitiesEnabled`; no production consumer | GET `/projects/50004/my-capabilities` returned200 in G9, but toggling this variable does not prove a UI switch or the capability migration is complete |
| `VITE_ENABLE_LEAD_PUBLISH` | `env.ts` declares/exports `leadDepartmentPublishEnabled`; only another test stub references it | GET `/projects/50003/result-policy` returned204; publishing still depends on actual server capabilities. The flag is not evidence of lead-department publication acceptance |

For the BE-18 fourteen-module inventory, record these as **FE flag inert**, separately from BE module enablement and endpoint deployment. Keep observed HTTP results and add the missing module UC/authority tests. Decide explicitly whether the FE rollout flags should be removed or wired into a designed rollout; this handoff does not change product behavior, grant permissions or publish any result.

The BE-18 checklist in the shared `plandev2/todo.md` has the same observation. No direct message to another developer was sent from this chat; this tracked handoff and the PR description make the coordination reviewable.
