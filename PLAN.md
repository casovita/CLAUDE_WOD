# SugarWOD Analytics — Web App Development Plan

## Data Source

**SugarWOD Export** — email (`.eml`) containing a `workouts.csv` attachment (base64-encoded).

### CSV Schema (11 columns)
| Column | Type | Description |
|--------|------|-------------|
| `date` | mm/dd/yyyy | Workout date |
| `title` | string | Workout name |
| `description` | string | Full workout description |
| `best_result_raw` | number | Numeric result value |
| `best_result_display` | string | Human-readable result |
| `score_type` | enum | `Load`, `Time`, `Reps`, `Rounds`, `Checkbox`, `Other` |
| `barbell_lift` | string | Lift name (if applicable) |
| `set_details` | JSON string | Per-set `{load, success}` array |
| `notes` | string | User's notes |
| `rx_or_scaled` | enum | `RX` or `SCALED` |
| `pr` | string | `PR` if personal record |

**Known data:** 81 workouts, CrossFit style, Apr 2025–present. Mix of strength lifts (Load) and conditioning WODs (Time, Checkbox).

---

## App Overview

Single-page web app that:
1. **Option A:** Accepts an `.eml` file upload (manual)
2. **Option B:** Connects to Gmail via OAuth2, auto-fetches SugarWOD export emails
3. Parses the email → extracts CSV attachment
4. Parses CSV → structured data
5. Displays interactive analytics dashboard

---

## Phase 1 — Data Ingestion

Two parallel ingestion paths feed the same normalized pipeline.

### Path A — Manual `.eml` Upload
- [ ] Drag-and-drop + file picker UI
- [ ] `POST /upload` — NestJS accepts `.eml`, parses MIME, extracts CSV
- [ ] Base64 decode attachment → raw CSV string

### Path B — Gmail Integration (OAuth2)
- [ ] Google Cloud project: enable Gmail API, configure OAuth2 consent screen
- [ ] NestJS `GET /auth/google` → redirect to Google consent (scopes: `gmail.readonly`)
- [ ] NestJS `GET /auth/google/callback` → exchange code for tokens, return to frontend
- [ ] Frontend stores access/refresh tokens in localStorage
- [ ] NestJS `GET /gmail/exports` — searches Gmail for SugarWOD export emails:
  - Query: `from:hello@sugarwod.com subject:"Your SugarWOD Export" has:attachment`
  - Returns list of matching message IDs + dates
- [ ] NestJS `GET /gmail/exports/:messageId` — fetches message, extracts CSV attachment (base64 part where `mimeType = text/csv`)
- [ ] Token refresh: NestJS auto-refreshes expired access tokens using refresh token

### Shared Pipeline (both paths)
- [ ] CSV parse → typed `Workout[]` array
- [ ] `set_details` JSON string → `SetDetail[]` normalization
- [ ] Date parsing (`mm/dd/yyyy` → ISO 8601)
- [ ] Numeric coercion, enum validation

### Output
Normalized `Workout[]` stored in localStorage, keyed by data hash to detect duplicates.

---

## Phase 2 — Core Analytics Engine

### Strength Progression Module (`score_type = "Load"`)
- Per-lift time series: track `best_result_raw` over dates
- PR history: workouts flagged `pr = "PR"`
- Set-by-set breakdown from `set_details` JSON
- Estimated 1RM calculation (from multi-rep sets using Epley/Brzycki formula)
- Volume calculation (sets × reps × load)

### Conditioning WOD Module (`score_type = "Time" | "Reps" | "Rounds"`)
- Time-based performance trends
- Rep/round score trends
- WOD frequency analysis

### General Metrics
- Workout frequency heatmap (GitHub-style calendar)
- RX vs Scaled ratio over time
- Workout type distribution (pie/donut chart)
- Active days per week/month
- Training consistency score (streak tracking)
- Score type breakdown

---

## Phase 3 — Dashboard UI

### Views / Pages
1. **Overview** — summary stats, heatmap, recent workouts
2. **Strength** — per-lift progression charts, PR timeline, volume trends
3. **Conditioning** — WOD performance trends, RX/Scaled split
4. **Workouts Log** — sortable/filterable table of all workouts
5. **PR Board** — personal records per lift, with date achieved

### Chart Types
- Line/area charts: strength progression over time
- Bar charts: volume per session, weekly frequency
- Calendar heatmap: activity over time
- Scatter plot: performance variability
- Radar chart: muscle group / lift category balance
- Timeline: PR history

---

## Phase 4 — AI-Powered Insights (optional)

> Requires Claude API integration

- Auto-generated training summary ("Your Back Squat increased 15% over 3 months")
- Weakness detection ("Snatch appears undertrained vs. Clean")
- Periodization pattern detection (3-week wave loading, deload weeks)
- Plateau identification
- Training recommendations based on trends
- Natural language Q&A about workout history

---

## Possible Conclusions / Insights the App Can Surface

### Strength
- Which lifts show the steepest improvement curve?
- How many PRs were set and in which phase?
- Load progression rate (kg/week per lift)
- Estimated 1RM trends

### Consistency
- Average workouts per week/month
- Longest streak vs. longest gap
- Time of year with most/least activity

### Performance Balance
- Ratio of strength work vs. conditioning
- RX completion rate trend (are you improving?)
- Which workouts are done scaled most often?

### Recovery / Overtraining Signals
- Back-to-back high-load days
- Volume spikes that precede gaps (injury risk pattern)

### Workout Patterns
- Favorite/most repeated workouts
- Day-of-week distribution
- EMOM vs. For Time vs. Lift distribution

---

## Confirmed Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend framework | **React** (TypeScript) |
| Backend | **NestJS** (TypeScript) |
| Component library | **Mantine** v7+ (`@mantine/core`, `@mantine/hooks`, `@mantine/notifications`, `@mantine/dropzone`, `@mantine/dates`) |
| Charts | **Recharts** |
| EML parsing | NestJS — `mailparser` npm package |
| CSV parsing | `csv-parse` (NestJS) |
| Gmail integration | **Google OAuth2** + **Gmail API v1** via `googleapis` npm |
| Data persistence | **localStorage** (client-side) |
| AI features | Not in current scope |
| Version control | **Git** |
| Deployment | **Vercel** (frontend) + Railway/Render for NestJS API |

### Architecture
```
Browser (React + TS)
  ├── [Manual path] Upload .eml → POST /upload → parsed JSON
  ├── [Gmail path]  "Connect Gmail" → GET /auth/google → OAuth consent
  │     └── Callback → tokens stored in localStorage
  │     └── GET /gmail/exports → list of SugarWOD emails
  │     └── GET /gmail/exports/:id → extract + parse CSV
  └── Normalized Workout[] → localStorage → Recharts dashboard

NestJS API
  ├── POST   /upload                    — manual .eml upload
  ├── GET    /auth/google               — initiate OAuth2 flow
  ├── GET    /auth/google/callback      — handle code exchange
  ├── GET    /gmail/exports             — list SugarWOD emails (authed)
  ├── GET    /gmail/exports/:messageId  — fetch + parse one export
  └── GET    /health
```

### Gmail API — Key Details
- **OAuth2 scope:** `https://www.googleapis.com/auth/gmail.readonly` (read-only, minimal permission)
- **Search query:** `from:hello@sugarwod.com subject:"Your SugarWOD Export" has:attachment`
- **Attachment extraction:** Find message part where `mimeType = "text/csv"`, decode `body.data` from base64url
- **NestJS packages:** `@nestjs/passport`, `passport-google-oauth20`, `googleapis`
- **Token handling:** Store `access_token` + `refresh_token` in localStorage; backend accepts token via `Authorization: Bearer` header and creates an authenticated Gmail client per request (stateless)

---

## Project Structure

```
wod-analytics/
├── apps/
│   ├── frontend/          # React + TS (Vite or CRA)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   ├── lib/       # localStorage, data transforms
│   │   │   └── types/
│   │   └── package.json
│   └── backend/           # NestJS
│       ├── src/
│       │   ├── upload/    # EML parsing module (manual upload)
│       │   ├── gmail/     # Gmail API + OAuth2 module
│       │   ├── auth/      # Passport Google strategy
│       │   ├── workouts/  # CSV → Workout[] transformation
│       │   └── main.ts
│       └── package.json
└── package.json           # monorepo root (optional)
```

## Suggested MVP Scope (Phase 1 + 2 + 3 partial)

1. NestJS endpoint: upload `.eml` → parse → return normalized JSON
2. React upload screen with drag-and-drop
3. Parse response → store in localStorage
4. Overview dashboard (key stats, workout count, PRs)
5. Strength progression charts per lift (Recharts line chart)
6. PR board
7. RX vs Scaled trend
8. Workout log table (sortable/filterable)

Estimated: ~3–5 days of focused development for MVP.

## Development Phases & Milestones

### Milestone 1 — Backend Core
- [ ] NestJS project init
- [ ] `POST /upload` endpoint accepting `.eml`
- [ ] EML MIME parsing (`mailparser`) → extract CSV attachment
- [ ] CSV parse → typed `Workout[]` array
- [ ] `set_details` JSON normalization
- [ ] Response DTO + Swagger docs

### Milestone 2 — Gmail OAuth2 Integration
- [ ] Google Cloud project: enable Gmail API, create OAuth2 credentials
- [ ] NestJS: `@nestjs/passport` + `passport-google-oauth20` setup
- [ ] `GET /auth/google` + `GET /auth/google/callback` — token exchange, return tokens to frontend
- [ ] NestJS Gmail service using `googleapis`:
  - `listExports(accessToken)` — search inbox for SugarWOD emails
  - `fetchExport(accessToken, messageId)` — download and decode CSV attachment
- [ ] Token refresh middleware (auto-renew on 401)
- [ ] Frontend: "Connect Gmail" button → OAuth flow → store tokens → fetch email list → select + import

### Milestone 3 — Frontend Shell
- [ ] React + TS project (Vite)
- [ ] Component library setup
- [ ] File upload component (drag-and-drop) — Path A
- [ ] Gmail connect + email picker UI — Path B
- [ ] API client (axios with interceptor for Bearer token + refresh)
- [ ] localStorage save/load hook (`useWorkouts`)
- [ ] Routing (Overview / Strength / Conditioning / Log / PRs)

### Milestone 4 — Dashboard
- [ ] Overview page: total workouts, PR count, RX%, active weeks
- [ ] Calendar heatmap (activity grid)
- [ ] Workout type distribution (pie chart)

### Milestone 5 — Strength Module
- [ ] Per-lift progression line chart (Recharts)
- [ ] PR timeline markers on chart
- [ ] Set details breakdown table
- [ ] Estimated 1RM trend (Epley formula)

### Milestone 6 — Conditioning + Polish
- [ ] WOD performance trend
- [ ] RX vs Scaled ratio over time
- [ ] Workout log table with filters
- [ ] Responsive layout
- [ ] Vercel deployment (frontend + NestJS)
