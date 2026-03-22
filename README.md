# HealthPro

This repository contains the current HealthPro applications:

- Frontend (Vite + React): `frontend`
- Backend (Node + Express + MongoDB): `backend`

Legacy Create React App files were removed from the repository root to avoid accidental deployments of outdated UI.

## Local Development

From the repository root:

- Install both apps:
	- `npm run install:all`
- Start frontend:
	- `npm run frontend:dev`
- Start backend:
	- `npm run backend:dev`

Or run each app directly:

- Frontend:
	- `cd frontend`
	- `npm install`
	- `npm run dev`
- Backend:
	- `cd backend`
	- `npm install`
	- `npm run dev`

## Production Deployment

- Frontend root directory on Vercel: `frontend`
- Frontend framework: `Vite`
- Frontend output directory: `dist`
- Backend root directory on Render/Railway: `backend`

See `DEPLOY_VERCEL_RENDER.md` for full deployment steps.
