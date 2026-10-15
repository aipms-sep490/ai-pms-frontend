# FE2 interface viewer

Open `../FE2_SELF_TEST_GUIDE_2026-10-15.html` directly in a browser. It contains the real frontend components and styles, bundled with local display data. Each sheet has only a short interaction hint and the route where that UI belongs in the app.

The fetch replacement has no network fallback, and the HTML blocks network connections. Form interactions stay in memory; switching sheets or resetting starts a new sample. This viewer demonstrates the UI, not backend authorization or acceptance. Google enrollment shows its missing-invitation state; a real invitation/provider is required in the actual app.

Regenerate and check from the frontend root:

```powershell
node docs/fe2/ui-preview/build.mjs
node docs/fe2/ui-preview/smoke.mjs
```

`icons.ttf` is a subset of the Google Material Symbols font already used by the app (arrow_back, arrow_forward, close, refresh, schema). Source: `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined&icon_names=arrow_back,arrow_forward,close,refresh,schema`. Its license is in `ICONS_LICENSE.txt` and embedded in the generated HTML.
