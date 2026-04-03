# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SugarWOD Analytics Dashboard — a full-stack web app that parses CrossFit workout exports from Gmail or uploaded `.eml`/`.csv` files and visualizes training data with charts, PR tracking, and a 3D muscle-body heatmap.

## Development Commands

### Start both servers concurrently (from repo root)
```bash
npm run dev
```

### Backend only (NestJS on port 3001)
```bash
npm run start:dev --prefix backend
```

### Frontend only (Vite/React on port 5173)
```bash
npm run dev --prefix frontend
```

### Install all dependencies
```bash
npm run install:all
```

### Backend tests
```bash
npm test --prefix backend                  # run all tests
npm run test:watch --prefix backend        # watch mode
npm run test:cov --prefix backend          # with coverage
npm run test:e2e --prefix backend          # e2e tests
```

### Backend lint/format
```bash
npm run lint --prefix backend
npm run format --prefix backend
```

### Frontend lint
```bash
npm run lint --prefix frontend
```

### Build for production
```bash
npm run build --prefix backend    # outputs to backend/dist/
npm run build --prefix frontend   # outputs to frontend/dist/
```

## Architecture

### Data Flow
1. User connects Gmail (Google OAuth2) or uploads an `.eml` file directly
2. Backend extracts the CSV attachment from the email
3. `WorkoutsService` parses CSV rows into `WorkoutDto[]` (date normalization, set detail parsing)
4. Frontend receives the array and persists it to `localStorage`
5. All analytics (strength trends, conditioning metrics, heatmaps) are computed client-side
6. `HeatmapPage` renders a GitHub-style calendar heatmap + 3D muscle body showing muscle group gaps

### Backend (`backend/src/`)
NestJS 11 modules:
- **`upload/`** — `POST /upload` accepts `.eml` or `.csv`, delegates to `WorkoutsService`
- **`auth/`** — Google OAuth2 via Passport; initiates at `GET /auth/google`, callback at `GET /auth/google/callback`
- **`gmail/`** — `GmailService` uses the stored OAuth tokens to list/fetch SugarWOD export emails; handles token refresh
- **`workouts/`** — `WorkoutsService` does all CSV parsing; `workout.dto.ts` defines the shared shape
- **`common/`** — Winston logger config, HTTP logging middleware, global exception filter

Swagger docs available at `http://localhost:3001/api` when running.

### Frontend (`frontend/src/`)
React 19 + React Router 7 + Mantine 9 UI:

| Route | Page | Purpose |
|---|---|---|
| `/` | `OverviewPage` | Summary stats |
| `/strength` | `StrengthPage` | Strength trend charts (Recharts) |
| `/prs` | `PRBoardPage` | PR records |
| `/log` | `WorkoutLogPage` | Full workout log |
| `/heatmap` | `HeatmapPage` | Calendar heatmap + 3D muscle model |
| `/upload` | `UploadPage` | File upload + Gmail OAuth connect |
| `/auth/callback` | `AuthCallbackPage` | OAuth2 redirect handler |

Key abstractions:
- **`hooks/useWorkouts.ts`** — reads/writes workout data from `localStorage`
- **`hooks/useGmailAuth.ts`** — manages OAuth token state
- **`lib/api.ts`** — thin fetch wrapper that attaches auth headers
- **`components/MuscleBody3D.tsx`** / **`MuscleBodyModel.tsx`** — Three.js 3D body with per-muscle coloring driven by training frequency data
- **`types/muscleGap.ts`** — types for the muscle visualization system

### Auth
Google OAuth2 with offline access (refresh tokens). Backend stores tokens in-memory per session (express-session). No database — all workout data lives in the browser's `localStorage`.

## Environment Setup

Copy `backend/.env.example` to `backend/.env` and fill in Google OAuth credentials:
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
FRONTEND_URL=http://localhost:5173
PORT=3001
```

The backend boots without OAuth credentials set (Gmail features will be disabled).
