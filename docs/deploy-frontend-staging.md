# Frontend staging build

The browser bundle needs the API origin at build time. `VITE_API_PROXY_TARGET`
only configures Vite's local development proxy; it does not affect a static
production build. A relative `VITE_API_BASE_URL=/api/v1` therefore makes a
deployed browser call `https://aipims.khaidz.com/api/v1/...`, which is served by
the frontend tunnel instead of the API tunnel.

Build the public staging bundle with:

```powershell
npm ci
npm run build:staging
```

This command embeds:

```text
https://api-staging.khaidz.com/api/v1
```

To target another API origin, set `VITE_API_BASE_URL` or
`VITE_STAGING_API_BASE_URL` to an absolute URL ending in `/api/v1` before
running the command. The build stops with an error when a relative path is
provided, so a deployment cannot silently fall back to the frontend origin.

The command writes `dist/deployment.json`; check its `apiBaseUrl` before
building the frontend image. Local development and contract tests can continue
using the relative `/api/v1` value through Vite's proxy.

Build and restart the WSL frontend container with a unique release tag:

```powershell
$tag = "develop-$(git rev-parse --short HEAD)"
wsl -d Ubuntu-24.04 -- docker build --pull=false -f deploy/staging/Dockerfile -t "aipms-frontend:$tag" .
wsl -d Ubuntu-24.04 -- env "AIPMS_FE_IMAGE_TAG=$tag" docker-compose -f deploy/staging/compose.yaml up -d --no-build
```

The frontend tunnel should route `aipims.khaidz.com` to
`http://aipms-frontend:8080`; the API tunnel remains
`api-staging.khaidz.com`. Verify `https://aipims.khaidz.com/deployment.json`
after restart. Its `apiBaseUrl` must be the absolute API URL above.
