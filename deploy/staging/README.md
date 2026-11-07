# Frontend staging on the existing Cloudflare tunnel

Target: `https://aipims.khaidz.com`.
Backend: `https://api-staging.khaidz.com/api/v1` (the current bundle calls this
origin directly, including SignalR). Nginx also proxies `/api/` through the
same HTTPS API origin so an older cached bundle still reaches the API and keeps
the Google challenge cookie on the public frontend origin.

## Build and start

From the frontend repository in PowerShell:

```powershell
pnpm install --frozen-lockfile
node scripts/build-staging.mjs
wsl -d Ubuntu-24.04 -- docker build --pull=false -f deploy/staging/Dockerfile -t aipms-frontend:RELEASE_TAG .
wsl -d Ubuntu-24.04 -- env AIPMS_FE_IMAGE_TAG=RELEASE_TAG docker-compose -f deploy/staging/compose.yaml up -d --no-build
```

Use a new release tag for every deployment and retain the previous image for
rollback. Only the frontend service is recreated. The existing SQL, API and
tunnel containers are not part of this compose project.

The build script uses public defaults from `.env.example`, then existing Vite
production/local settings, and forces real API mode, the staging API URL,
academic assistant enabled, and workflow preview disabled. Review the emitted
`dist/deployment.json` flags before release. Never put secrets in `VITE_` values.
The Docker context contains only the build output and Nginx configuration.

## Cloudflare and authentication

In the existing tunnel used by `goexe-tunnel`, add a published application route:

- Hostname: `aipims.khaidz.com`
- Service: `HTTP`, `aipms-frontend:8080`
- No path restriction. Preserve all existing routes.

The container joins the existing `go-exe_goexe-net` network. Its optional local
port is loopback-only `http://localhost:5180`. SPA deep links fall back to
`index.html`; fingerprinted assets use long caching and HTML uses no-store.

The backend private configuration must allow `https://aipims.khaidz.com`
in both `Cors:AllowedOrigins` and `GoogleAuth:AllowedOrigins`. Preserve existing
origins. Verify `ReverseProxy:KnownProxies` matches the current tunnel IP before
recreating only the API with its existing image. Back up private config first.
The Google OAuth Web client must separately allow this JavaScript origin in
Google Cloud Console; backend CORS does not configure the Google provider.

## Verification

```powershell
curl.exe --fail https://aipims.khaidz.com/healthz
curl.exe --fail https://aipims.khaidz.com/deployment.json
$env:FE_STAGING_URL='https://aipims.khaidz.com'
$env:FE_STAGING_EVIDENCE_DIR='D:/path/to/evidence'
node scripts/staging-deploy-smoke.mjs
```

For authenticated verification, supply dedicated test credentials through
`ACADEMIC_TEST_EMAIL` and `ACADEMIC_TEST_PASSWORD` in the process environment.
The smoke script verifies password login and opening the AI dock without
changing project data. It does not validate Google, video, uploads or the full
academic lifecycle. Credentials must not be committed or printed.

## Rollback and availability

Set `AIPMS_FE_IMAGE_TAG` to the previous retained tag and run the same compose
`up -d --no-build` command. Do not remove volumes or recreate SQL. Disable/remove
the new Cloudflare route if rolling back the initial public exposure.

This is hosted on the user's Windows/WSL machine. Docker restart policy does not
keep Windows awake or guarantee WSL starts after reboot. The public frontend and
backend depend on this machine, Docker, the tunnel and its internet connection.

## Initial preparation (2026-10-26)

- Application baseline: `develop` at `14d9981`.
- Image: `aipms-frontend:develop-14d9981-20261026`.
- Production build/typecheck, Nginx config validation, tunnel-network access,
  SPA deep-link response and desktop/mobile login rendering passed.
- Backend origin configured; CORS preflight returned 204 with exact allowed origin.
- Existing API image retained; trusted tunnel IP corrected to the inspected address.
- Private backend config backup: `appsettings.Staging.json.before-frontend-20261026`
  in the existing private configuration directory (not in Git).
- Public DNS/tunnel route verified. Real Edge browser password login and opening the AI dock passed on https://aipims.khaidz.com; desktop/mobile had no overflow or page errors. Deep links return 200. Backend Google challenge returns 200; Google provider sign-in remains unverified and requires the OAuth client to allow this origin.
