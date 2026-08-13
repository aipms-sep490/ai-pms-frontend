# AI-PMS Frontend

React and TypeScript frontend for the AI-Powered Academic Project Progress Management System.

## Architecture

The application is organized by product feature. Each feature owns its API calls, components, hooks, pages, schemas, types and feature-only utilities.

```text
src/
├── app/          # router, providers, layouts and runtime config
├── features/     # business modules and feature-owned code
├── components/   # shared UI primitives only
├── services/     # shared HTTP transport and endpoint catalog
├── hooks/        # genuinely cross-feature hooks
├── types/        # shared transport types
├── utils/        # small cross-feature utilities
├── constants/    # application-wide constants
└── assets/       # static assets
```

The first connected slice is `features/projects`: it loads the Project state machine from the backend. The architecture overview also documents student routing by business state.

## Run locally

Requirements: Node.js 24 and pnpm 11.

```powershell
pnpm install
pnpm dev
```

The development server runs at `http://localhost:5173` and proxies `/api` to `http://localhost:5080`. Copy `.env.example` to `.env.local` when a different API base URL is needed.

## Quality checks

```powershell
pnpm lint
pnpm test
pnpm build
```

## Rules for feature work

1. Keep feature-only code inside the feature; do not move it to global `pages`, `components` or `services`.
2. Shared UI components cannot import from a business feature.
3. Route access is based on role, project state and permission, while backend authorization remains authoritative.
4. Add runtime schemas when a form or untrusted API payload is introduced; do not add empty abstractions in advance.
5. A feature is complete only after loading, empty, error and forbidden states are handled and tested.
